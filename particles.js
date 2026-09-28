import * as THREE from 'three';

/**
 * Aerodynamic Wind Tunnel Particle Streamlines Simulation
 * Simulates CFD-style airflow vectors wrapping around the vehicle contours.
 */
export class WindTunnelParticles {
  constructor(scene) {
    this.scene = scene;
    this.particleCount = 1800;
    this.isActive = false;
    this.speed = 1.0; // multiplier

    this.particles = [];
    this.geometry = null;
    this.points = null;
    this.material = null;

    this._initParticles();
  }

  _initParticles() {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    this.particleData = [];

    for (let i = 0; i < this.particleCount; i++) {
      // Spawn streamlines across a front emitter grid: width [-1.4, 1.4], height [0.1, 1.4]
      const startX = (Math.random() - 0.5) * 2.8;
      const startY = 0.05 + Math.random() * 1.35;
      const startZ = 4.5 + Math.random() * 2.0;

      positions[i * 3] = startX;
      positions[i * 3 + 1] = startY;
      positions[i * 3 + 2] = startZ;

      // Initial color (Cool cyan laminar flow)
      colors[i * 3] = 0.0;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 1.0;

      sizes[i] = 2.0 + Math.random() * 2.5;

      this.particleData.push({
        baseX: startX,
        baseY: startY,
        z: startZ,
        velocity: 4.5 + Math.random() * 2.5,
        streamlineType: Math.abs(startX) < 0.75 ? 'roof' : 'side',
        wakeJitter: (Math.random() - 0.5) * 0.1,
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Particle Point Material with Soft Radial Glow
    this.material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.visible = false;
    this.scene.add(this.points);
  }

  setActive(active) {
    this.isActive = active;
    this.points.visible = active;
  }

  setSpeed(speedVal) {
    this.speed = Math.max(0.2, Math.min(3.0, speedVal));
  }

  update(delta) {
    if (!this.isActive) return;

    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particleData[i];
      const i3 = i * 3;

      // Move particle along negative Z (front to rear)
      p.z -= p.velocity * this.speed * delta;

      // Loop particle when it passes rear boundary
      if (p.z < -4.8) {
        p.z = 4.5 + Math.random() * 0.8;
      }

      let currentX = p.baseX;
      let currentY = p.baseY;
      const z = p.z;

      // --- CFD Vector Contour Deflections ---
      let compressionFactor = 0; // 0 = Laminar, 1 = Max Downforce/Drag

      if (p.streamlineType === 'roof') {
        // Airflow going up and over hood, canopy, and rear spoiler
        if (z > 2.2) {
          // Approach front splitter / nose
          currentY = p.baseY;
        } else if (z > 1.2 && z <= 2.2) {
          // Climbing nose & hood scoop
          const t = (2.2 - z) / 1.0;
          currentY = p.baseY + t * 0.28;
          compressionFactor = t * 0.7;
        } else if (z > -0.6 && z <= 1.2) {
          // Passing over windshield and roof canopy
          const t = Math.sin(((z - -0.6) / 1.8) * Math.PI);
          currentY = p.baseY + 0.28 + t * 0.42;
          compressionFactor = 0.5 + t * 0.5;
        } else if (z > -1.8 && z <= -0.6) {
          // Rushing down rear glass towards active spoiler
          const t = (z - -1.8) / 1.2;
          currentY = p.baseY + 0.28 + t * 0.15;
          compressionFactor = (1 - t) * 0.9; // Downforce over wing
        } else {
          // Wake vortex turbulence behind car
          const wakeDist = -1.8 - z;
          currentY = p.baseY + Math.sin(wakeDist * 6 + i) * 0.08 * wakeDist;
          currentX = p.baseX + Math.cos(wakeDist * 5 + i) * 0.06 * wakeDist;
          compressionFactor = 0.2;
        }
      } else {
        // Airflow splitting around side fenders and into side cooling intakes
        const sideSign = Math.sign(p.baseX);
        if (z > 1.5 && z <= 2.5) {
          // Deflect around front fenders
          const t = (2.5 - z) / 1.0;
          currentX = p.baseX + sideSign * t * 0.22;
          compressionFactor = t * 0.6;
        } else if (z > -0.5 && z <= 1.5) {
          // Tucking into sculpted waistline
          currentX = p.baseX + sideSign * 0.15;
          currentY = p.baseY * 0.9;
        } else if (z > -1.7 && z <= -0.5) {
          // Expanding over rear wheel haunches
          const t = (-0.5 - z) / 1.2;
          currentX = p.baseX + sideSign * (0.15 + t * 0.25);
          compressionFactor = t * 0.8;
        } else if (z <= -1.7) {
          // Low-pressure wake swirling inward
          const wakeDist = -1.7 - z;
          currentX = p.baseX * (1 - Math.min(0.5, wakeDist * 0.2)) + Math.sin(wakeDist * 4) * 0.05;
          currentY = p.baseY + (Math.random() - 0.5) * 0.02;
          compressionFactor = 0.1;
        }
      }

      // Update positions
      positions[i3] = currentX;
      positions[i3 + 1] = Math.max(0.08, currentY);
      positions[i3 + 2] = z;

      // Color dynamics based on aerodynamic compression / velocity
      if (this.colorMode === 'cyan') {
        colors[i3] = 0.0;
        colors[i3 + 1] = 0.95;
        colors[i3 + 2] = 1.0;
      } else if (this.colorMode === 'thermal') {
        colors[i3] = 0.9 + compressionFactor * 0.1;
        colors[i3 + 1] = 0.1 + (1 - compressionFactor) * 0.2;
        colors[i3 + 2] = 0.8;
      } else {
        // Default Velocity Gradient
        if (compressionFactor > 0.6) {
          colors[i3] = 1.0;
          colors[i3 + 1] = 0.35 + (1 - compressionFactor) * 0.5;
          colors[i3 + 2] = 0.05;
        } else if (compressionFactor > 0.3) {
          colors[i3] = 0.0;
          colors[i3 + 1] = 0.95;
          colors[i3 + 2] = 0.85;
        } else {
          colors[i3] = 0.05;
          colors[i3 + 1] = 0.55;
          colors[i3 + 2] = 1.0;
        }
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}
