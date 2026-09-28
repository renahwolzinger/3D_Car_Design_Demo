import * as THREE from 'three';

/**
 * Lighting, Studio Staging & Dynamic Night Tunnel Environment Manager
 */
export class EnvironmentManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.studioLights = [];
    this.tunnelObjects = [];
    this.tunnelRings = [];
    this.roadMarkers = [];
    this.headlights = [];
    this.volumetricCones = [];

    this.currentMode = 'studio'; // 'studio' | 'aero' | 'drive'

    this._setupStudio();
    this._setupDynamicTunnel();
    this._setupStudioFloor();
    this._setupEnvironmentMap();
  }

  _setupEnvironmentMap() {
    // Generate high-dynamic-range style studio reflection map
    const width = 512;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Dark ambient studio background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    // Overhead rectangular softbox light reflection
    const softboxGrad = ctx.createLinearGradient(width * 0.3, 0, width * 0.7, 0);
    softboxGrad.addColorStop(0, '#555555');
    softboxGrad.addColorStop(0.5, '#ffffff');
    softboxGrad.addColorStop(1, '#555555');
    ctx.fillStyle = softboxGrad;
    ctx.fillRect(width * 0.25, height * 0.05, width * 0.5, height * 0.25);

    // Left cool-blue rim softbox reflection
    const leftGrad = ctx.createLinearGradient(0, height * 0.2, width * 0.2, height * 0.2);
    leftGrad.addColorStop(0, '#00d4ff');
    leftGrad.addColorStop(1, '#0a0d14');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, height * 0.15, width * 0.18, height * 0.35);

    // Right warm-amber rim softbox reflection
    const rightGrad = ctx.createLinearGradient(width * 0.8, height * 0.2, width, height * 0.2);
    rightGrad.addColorStop(0, '#0a0d14');
    rightGrad.addColorStop(1, '#ffaa44');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(width * 0.82, height * 0.15, width * 0.18, height * 0.35);

    // Subtle horizon line
    ctx.strokeStyle = '#222938';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.5);
    ctx.lineTo(width, height * 0.5);
    ctx.stroke();

    const envTex = new THREE.CanvasTexture(canvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;

    const pmremGen = new THREE.PMREMGenerator(this.renderer);
    pmremGen.compileEquirectangularShader();
    const envMap = pmremGen.fromEquirectangular(envTex).texture;
    this.scene.environment = envMap;
    pmremGen.dispose();
  }

  _setupStudio() {
    this.studioGroup = new THREE.Group();
    this.studioGroup.name = 'StudioRig';

    // Ambient baseline
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.studioGroup.add(this.ambientLight);

    // 1. Overhead Main Softbox Key Light (Large Studio Diffuser)
    const softboxLight = new THREE.DirectionalLight(0xffffff, 2.4);
    softboxLight.position.set(0, 6.5, 0.5);
    softboxLight.castShadow = true;
    softboxLight.shadow.mapSize.width = 2048;
    softboxLight.shadow.mapSize.height = 2048;
    softboxLight.shadow.camera.near = 0.5;
    softboxLight.shadow.camera.far = 12;
    softboxLight.shadow.camera.left = -3.5;
    softboxLight.shadow.camera.right = 3.5;
    softboxLight.shadow.camera.top = 3.5;
    softboxLight.shadow.camera.bottom = -3.5;
    softboxLight.shadow.bias = -0.0008;
    this.studioGroup.add(softboxLight);
    this.studioLights.push(softboxLight);

    // Visible Overhead Softbox Light Panel (Emissive Mesh)
    const softboxPanelGeo = new THREE.PlaneGeometry(3.5, 7.0);
    softboxPanelGeo.rotateX(Math.PI / 2);
    const softboxPanelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const softboxPanel = new THREE.Mesh(softboxPanelGeo, softboxPanelMat);
    softboxPanel.position.set(0, 6.45, 0.5);
    this.studioGroup.add(softboxPanel);

    // 2. High-Contrast Rim Lights (Sculpting the shoulders & aerodynamic lines)
    const leftRim = new THREE.DirectionalLight(0x70aaff, 1.8);
    leftRim.position.set(-6, 3, -2);
    this.studioGroup.add(leftRim);
    this.studioLights.push(leftRim);

    const rightRim = new THREE.DirectionalLight(0xffaa70, 1.5);
    rightRim.position.set(6, 3, 2);
    this.studioGroup.add(rightRim);
    this.studioLights.push(rightRim);

    // 3. Front Nose Accent Light
    const frontAccent = new THREE.SpotLight(0xffffff, 2.2, 15, Math.PI / 6, 0.4);
    frontAccent.position.set(0, 2.5, 6);
    frontAccent.target.position.set(0, 0.4, 1.5);
    this.studioGroup.add(frontAccent);
    this.studioGroup.add(frontAccent.target);
    this.studioLights.push(frontAccent);

    // 4. Rear Diffuser Glow Light
    const rearAccent = new THREE.SpotLight(0xff0044, 1.5, 10, Math.PI / 4, 0.5);
    rearAccent.position.set(0, 1.2, -5);
    rearAccent.target.position.set(0, 0.3, -2);
    this.studioGroup.add(rearAccent);
    this.studioGroup.add(rearAccent.target);
    this.studioLights.push(rearAccent);

    this.scene.add(this.studioGroup);
  }

  _setupStudioFloor() {
    this.floorGroup = new THREE.Group();

    // Studio Epoxy Reflective Floor
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080a0e,
      roughness: 0.12,
      metalness: 0.88,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.floorGroup.add(floor);

    // Contact Shadow Plane (Simulating high-fidelity ambient occlusion under wheels)
    const shadowGeo = new THREE.PlaneGeometry(2.8, 5.2);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(64, 128, 20, 64, 128, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.95)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.7)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.005, 0);
    this.floorGroup.add(contactShadow);

    // Circular Stage Platform Ring with Neon Edge
    const ringGeo = new THREE.RingGeometry(4.2, 4.25, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.008;
    this.floorGroup.add(ring);

    this.scene.add(this.floorGroup);
  }

  _setupDynamicTunnel() {
    this.tunnelGroup = new THREE.Group();
    this.tunnelGroup.name = 'CyberTunnel';
    this.tunnelGroup.visible = false;

    // Glowing Neon Tunnel Ribs / Arches
    const ringCount = 16;
    const ringSpacing = 7.5;

    for (let i = 0; i < ringCount; i++) {
      const archGroup = new THREE.Group();
      const zPos = (i - 8) * ringSpacing;

      // Hexagonal / Arch Tube
      const archPoints = [
        new THREE.Vector3(-6, 0, 0),
        new THREE.Vector3(-6, 4.5, 0),
        new THREE.Vector3(-3.5, 6.5, 0),
        new THREE.Vector3(3.5, 6.5, 0),
        new THREE.Vector3(6, 4.5, 0),
        new THREE.Vector3(6, 0, 0),
      ];
      const archCurve = new THREE.CatmullRomCurve3(archPoints, false);
      const tubeGeo = new THREE.TubeGeometry(archCurve, 32, 0.08, 8, false);

      // Neon color alternation (Cyan & Vivid Magenta)
      const colorHex = i % 2 === 0 ? 0x00f0ff : 0xff0055;
      const tubeMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const archMesh = new THREE.Mesh(tubeGeo, tubeMat);

      archGroup.add(archMesh);
      archGroup.position.z = zPos;

      this.tunnelGroup.add(archGroup);
      this.tunnelRings.push(archGroup);
    }

    // Moving Highway Lane Markers
    const markerCount = 24;
    const markerGeo = new THREE.BoxGeometry(0.18, 0.02, 2.8);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    for (let m = 0; m < markerCount; m++) {
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(0, 0.015, (m - 12) * 4.5);
      this.tunnelGroup.add(marker);
      this.roadMarkers.push(marker);
    }

    // Moving Speed Streaks / Cyber Grid side lines
    [-4.5, 4.5].forEach(x => {
      const sideRailGeo = new THREE.BoxGeometry(0.08, 0.08, 140);
      const sideRailMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
      const sideRail = new THREE.Mesh(sideRailGeo, sideRailMat);
      sideRail.position.set(x, 0.04, 0);
      this.tunnelGroup.add(sideRail);
    });

    // Forward Headlight Spotlights for Night Drive
    [-0.72, 0.72].forEach(x => {
      const spot = new THREE.SpotLight(0xddeeff, 5.0, 35, Math.PI / 7, 0.35);
      spot.position.set(x, 0.45, 2.2);
      spot.target.position.set(x * 0.5, 0, 18);
      this.tunnelGroup.add(spot);
      this.tunnelGroup.add(spot.target);
      this.headlights.push(spot);

      // Volumetric Light Cone cutting through the dark atmosphere
      const coneGeo = new THREE.ConeGeometry(1.6, 12, 16, 1, true);
      coneGeo.rotateX(-Math.PI / 2);
      coneGeo.translate(0, 0, 6);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0x99ddff,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const coneMesh = new THREE.Mesh(coneGeo, coneMat);
      coneMesh.position.set(x, 0.45, 2.2);
      coneMesh.lookAt(x * 0.5, 0, 18);
      this.tunnelGroup.add(coneMesh);
      this.volumetricCones.push(coneMesh);
    });

    this.scene.add(this.tunnelGroup);
  }

  setMode(mode) {
    this.currentMode = mode;

    if (mode === 'studio') {
      this.studioGroup.visible = true;
      this.floorGroup.visible = true;
      this.tunnelGroup.visible = false;
      this.scene.background = new THREE.Color(0x06070a);
      this.ambientLight.intensity = 0.45;
      this.studioLights.forEach(l => { l.intensity = l._origIntensity || l.intensity; });
    } else if (mode === 'aero') {
      this.studioGroup.visible = true;
      this.floorGroup.visible = true;
      this.tunnelGroup.visible = false;
      this.scene.background = new THREE.Color(0x020306);
      // Darken studio into a moody testing tunnel
      this.ambientLight.intensity = 0.08;
      this.studioLights.forEach(l => {
        if (!l._origIntensity) l._origIntensity = l.intensity;
        l.intensity = l._origIntensity * 0.12;
      });
    } else if (mode === 'drive') {
      this.studioGroup.visible = false;
      this.floorGroup.visible = true;
      this.tunnelGroup.visible = true;
      this.scene.background = new THREE.Color(0x010204);
    }
  }

  update(delta, driveSpeed = 0) {
    if (this.currentMode === 'drive' && driveSpeed > 0) {
      const forwardVelocity = (driveSpeed * 0.65) * delta;

      // Animate Tunnel Rings rushing towards and past camera
      this.tunnelRings.forEach(ring => {
        ring.position.z += forwardVelocity;
        if (ring.position.z > 35) {
          ring.position.z -= 16 * 7.5;
        }
      });

      // Animate Highway Dash Markers
      this.roadMarkers.forEach(marker => {
        marker.position.z += forwardVelocity;
        if (marker.position.z > 40) {
          marker.position.z -= 24 * 4.5;
        }
      });

      // Pulse volumetric headlight beams slightly with speed
      const pulse = 0.10 + Math.sin(performance.now() * 0.01) * 0.03;
      this.volumetricCones.forEach(c => {
        c.material.opacity = pulse;
      });
    }
  }
}
