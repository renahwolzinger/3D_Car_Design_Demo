import * as THREE from 'three';

/**
 * Cinematic Camera Director
 * Choreographs dramatic automotive keynote sequences and smooth viewpoint transitions.
 */
export class CameraDirector {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;

    this.isTourActive = false;
    this.tourIndex = 0;
    this.tourProgress = 0;
    this.transitionDuration = 4.5; // seconds per shot

    // Keynote Waypoints: [camX, camY, camZ, targetX, targetY, targetZ]
    this.shots = [
      {
        name: 'Hero 3/4 Front',
        from: new THREE.Vector3(3.8, 1.1, 4.2),
        target: new THREE.Vector3(0, 0.45, 0.4),
      },
      {
        name: 'Low Nose & Matrix Headlights',
        from: new THREE.Vector3(0.5, 0.35, 4.2),
        target: new THREE.Vector3(0, 0.38, 1.8),
      },
      {
        name: 'Aerodynamic Profile & Wheels',
        from: new THREE.Vector3(-4.8, 0.9, 0.2),
        target: new THREE.Vector3(0, 0.4, 0),
      },
      {
        name: 'Top Canopy & Aero Fin',
        from: new THREE.Vector3(1.2, 4.5, -0.6),
        target: new THREE.Vector3(0, 0.3, 0),
      },
      {
        name: 'Rear Cyber Blade & Diffuser',
        from: new THREE.Vector3(-2.8, 0.7, -4.2),
        target: new THREE.Vector3(0, 0.45, -1.2),
      },
    ];

    // Presets for quick camera buttons
    this.presets = {
      front: { pos: new THREE.Vector3(0, 1.2, 5.2), target: new THREE.Vector3(0, 0.4, 0) },
      side: { pos: new THREE.Vector3(5.5, 1.1, 0), target: new THREE.Vector3(0, 0.4, 0) },
      rear: { pos: new THREE.Vector3(0, 1.2, -5.2), target: new THREE.Vector3(0, 0.4, 0) },
      top: { pos: new THREE.Vector3(0, 7.5, 0.1), target: new THREE.Vector3(0, 0, 0) },
      driver: { pos: new THREE.Vector3(-0.32, 0.82, 0.05), target: new THREE.Vector3(-0.32, 0.6, 2.0) },
      cockpit: { pos: new THREE.Vector3(-0.32, 0.80, -0.05), target: new THREE.Vector3(-0.32, 0.65, 3.0) },
    };

    // Transition state
    this.isTransitioning = false;
    this.startPos = new THREE.Vector3();
    this.endPos = new THREE.Vector3();
    this.startTarget = new THREE.Vector3();
    this.endTarget = new THREE.Vector3();
    this.transProgress = 0;
    this.transDuration = 1.2;
  }

  startKeynoteTour() {
    this.isTourActive = true;
    this.tourIndex = 0;
    this.tourProgress = 0;
    this.controls.enabled = false;
  }

  stopKeynoteTour() {
    this.isTourActive = false;
    this.controls.enabled = true;
  }

  moveToPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) return;

    this.stopKeynoteTour();
    this.isTransitioning = true;
    this.transProgress = 0;

    this.startPos.copy(this.camera.position);
    this.endPos.copy(preset.pos);

    this.startTarget.copy(this.controls.target);
    this.endTarget.copy(preset.target);
  }

  _easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  update(delta) {
    // 1. Preset Smooth Glide Transition
    if (this.isTransitioning) {
      this.transProgress += delta / this.transDuration;
      if (this.transProgress >= 1.0) {
        this.transProgress = 1.0;
        this.isTransitioning = false;
      }
      const ease = this._easeInOutCubic(this.transProgress);
      this.camera.position.lerpVectors(this.startPos, this.endPos, ease);
      this.controls.target.lerpVectors(this.startTarget, this.endTarget, ease);
      this.controls.update();
      return;
    }

    // 2. Cinematic Tour Choreography
    if (!this.isTourActive) return;

    this.tourProgress += delta / this.transitionDuration;
    if (this.tourProgress >= 1.0) {
      this.tourProgress = 0;
      this.tourIndex = (this.tourIndex + 1) % this.shots.length;
    }

    const currentShot = this.shots[this.tourIndex];
    const nextShot = this.shots[(this.tourIndex + 1) % this.shots.length];

    const ease = this._easeInOutCubic(this.tourProgress);

    // Subtle continuous camera drift for that high-end car commercial feel
    const driftX = Math.sin(performance.now() * 0.0008) * 0.15;
    const driftY = Math.cos(performance.now() * 0.0006) * 0.08;

    this.camera.position.lerpVectors(currentShot.from, nextShot.from, ease);
    this.camera.position.x += driftX;
    this.camera.position.y += driftY;

    this.controls.target.lerpVectors(currentShot.target, nextShot.target, ease);
    this.camera.lookAt(this.controls.target);
  }
}
