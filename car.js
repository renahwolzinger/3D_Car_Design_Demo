import * as THREE from 'three';

/**
 * Procedural Carbon Fiber Texture Generator
 * Creates an authentic 2x2 twill weave normal & roughness map via canvas
 */
function createCarbonFiberTextures() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f0f12';
  ctx.fillRect(0, 0, size, size);

  const tileSize = 8;
  for (let y = 0; y < size; y += tileSize) {
    for (let x = 0; x < size; x += tileSize) {
      const isAlt = ((x / tileSize) + (y / tileSize)) % 2 === 0;
      ctx.fillStyle = isAlt ? '#1a1a1e' : '#0a0a0d';
      ctx.fillRect(x, y, tileSize, tileSize);

      ctx.strokeStyle = isAlt ? '#28282e' : '#030305';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (isAlt) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + tileSize, y + tileSize);
      } else {
        ctx.moveTo(x + tileSize, y);
        ctx.lineTo(x, y + tileSize);
      }
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  return texture;
}

/**
 * Creates an authentic parametric double-sided quad geometry for car glass
 * defined by 4 vertices: bottom-front, top-front, top-rear, bottom-rear.
 */
function createGlassQuadGeometry(p0, p1, p2, p3) {
  const vertices = new Float32Array([
    // Front face
    p0.x, p0.y, p0.z,
    p1.x, p1.y, p1.z,
    p2.x, p2.y, p2.z,
    p3.x, p3.y, p3.z,
    // Back face (inverted for clean dual-sided shading)
    p0.x, p0.y, p0.z,
    p3.x, p3.y, p3.z,
    p2.x, p2.y, p2.z,
    p1.x, p1.y, p1.z,
  ]);
  const indices = [
    0, 1, 2,  0, 2, 3, // front
    4, 5, 6,  4, 6, 7, // back
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Lamborghini Huracán EVO-Inspired Angular Supercar 3D Model
 * Exact parametric glass angles matching A-pillars and roofline,
 * hollow open-spoke forged alloy wheels with 100% visible 6-piston brake calipers,
 * Huracán EVO front bumper chevron Y-wings, and triangular lower rocker air scoops.
 */
export class ApexCar {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'ApexLamboHuracanEvo';

    // State
    this.doorsOpen = false;
    this.doorProgress = 0;
    this.spoilerRaised = false;
    this.spoilerProgress = 0;
    this.isXRay = false;
    this.isExploded = false;
    this.explodeProgress = 0;
    this.wheelRotation = 0;
    this.steeringAngle = 0;

    // Registry & Mesh Tracking
    this.materials = {};
    this.parts = {};
    this.wheels = [];
    this.wheelAssemblies = [];
    this.rimMeshes = [];
    this.caliperMeshes = [];
    this.xrayObjects = [];
    this.standardObjects = [];

    this._initMaterials();
    this._buildCar();
    this.scene.add(this.group);
  }

  _initMaterials() {
    const carbonTex = createCarbonFiberTextures();

    // 1. High-Gloss Pearlescent Supercar Paint (Default: Giallo Auge Supercar Yellow)
    this.materials.body = new THREE.MeshPhysicalMaterial({
      color: 0xffd200,          // Vivid Lamborghini Giallo Supercar Yellow
      metalness: 0.35,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.025,
      reflectivity: 0.98,
      ior: 1.54,
      envMapIntensity: 2.0,
    });

    // 2. Forged & Twill Matte Carbon Fiber
    this.materials.carbon = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.28,
      metalness: 0.8,
      map: carbonTex,
      envMapIntensity: 1.3,
    });

    // 3. Cockpit Canopy Glass (Authentic automotive glass tint with double-sided rendering)
    this.materials.glass = new THREE.MeshPhysicalMaterial({
      color: 0x101824,
      metalness: 0.10,
      roughness: 0.03,
      transmission: 0.88,
      opacity: 0.82,
      transparent: true,
      ior: 1.52,
      thickness: 0.25,
      side: THREE.DoubleSide,
      envMapIntensity: 2.6,
    });

    // Clear Headlight Polycarbonate Lens
    this.materials.headlightLens = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.05,
      roughness: 0.01,
      transmission: 0.94,
      transparent: true,
      opacity: 0.85,
      ior: 1.52,
      side: THREE.DoubleSide,
      envMapIntensity: 2.2,
    });

    // 4. Gloss Stealth Black Aero Trim
    this.materials.glossBlack = new THREE.MeshStandardMaterial({
      color: 0x08080a,
      roughness: 0.08,
      metalness: 0.92,
      envMapIntensity: 1.6,
    });

    // 5. Honeycomb Intake Cavity & Grilles
    this.materials.grille = new THREE.MeshStandardMaterial({
      color: 0x0c0c0e,
      roughness: 0.75,
      metalness: 0.3,
    });

    // 6. Multi-Spoke Forged Rims (Default: Gloss Stealth Black)
    this.materials.rims = new THREE.MeshStandardMaterial({
      color: 0x141518,          // Gloss Stealth Black
      metalness: 0.92,
      roughness: 0.15,
      side: THREE.DoubleSide,
      envMapIntensity: 2.2,
    });

    this.materials.rimAccent = new THREE.MeshStandardMaterial({
      color: 0xffd200,
      metalness: 0.88,
      roughness: 0.25,
      emissive: 0x332800,
      emissiveIntensity: 0.4,
    });

    // 7. Performance Low-Profile Tires
    this.materials.tires = new THREE.MeshStandardMaterial({
      color: 0x111113,
      roughness: 0.88,
      metalness: 0.05,
    });

    // 8. Cross-Drilled Carbon Ceramic Brake Rotors
    this.materials.brakeDiscs = new THREE.MeshStandardMaterial({
      color: 0x4a4a52,
      metalness: 0.94,
      roughness: 0.28,
      side: THREE.DoubleSide,
      envMapIntensity: 1.6,
    });

    // 9. Monobloc 6-Piston Caliper (Default: Matching Giallo Yellow)
    this.materials.caliper = new THREE.MeshStandardMaterial({
      color: 0xffd200,          // Vibrant lacquer finish peeking through black rims
      emissive: 0xffd200,
      emissiveIntensity: 0.40,  // Radiant powder-coated glow that stays visible in shadow
      metalness: 0.15,
      roughness: 0.18,
      side: THREE.DoubleSide,
      envMapIntensity: 2.5,
    });

    // 10. Lamborghini Signature Y-Shaped LED DRLs
    this.materials.headlights = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf4f8ff,
      emissiveIntensity: 5.5,
      roughness: 0.02,
    });

    // 11. Razor Thin Y-LED Taillights
    this.materials.taillights = new THREE.MeshStandardMaterial({
      color: 0xff0028,
      emissive: 0xff001c,
      emissiveIntensity: 5.5,
      roughness: 0.02,
    });

    // 12. Titanium Dual Hexagonal Exhaust Tips
    this.materials.exhaust = new THREE.MeshStandardMaterial({
      color: 0x5e606c,
      metalness: 0.98,
      roughness: 0.16,
      emissive: 0x0a1424,
      emissiveIntensity: 0.35,
    });

    // 13. Interior Alcantara & Accent Stitching
    this.materials.interiorAlcantara = new THREE.MeshStandardMaterial({
      color: 0x121316,
      roughness: 0.86,
      metalness: 0.08,
    });

    this.materials.interiorAccent = new THREE.MeshStandardMaterial({
      color: 0xffd200,          // Yellow contrast stitching & seat strips
      roughness: 0.32,
      metalness: 0.6,
    });

    this.materials.cockpitDisplays = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
    });

    // 14. X-Ray Powertrain Materials
    this.materials.batteryPack = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00aa88,
      emissiveIntensity: 1.3,
      roughness: 0.3,
      metalness: 0.8,
    });

    this.materials.electricMotor = new THREE.MeshStandardMaterial({
      color: 0xffd200,
      emissive: 0xaa8800,
      emissiveIntensity: 1.2,
      metalness: 0.92,
      roughness: 0.22,
    });

    this.materials.chassisTube = new THREE.MeshStandardMaterial({
      color: 0x8898a8,
      metalness: 0.94,
      roughness: 0.3,
    });

    this.materials.wireframeGhost = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
  }

  _buildCar() {
    this._buildChassis();
    this._buildAngularWedgeBody();
    this._buildHuracanEvoFrontFascia();
    this._buildCockpitCanopy();
    this._buildScissorDoors();
    this._buildRearEngineDeckAndLouvers();
    this._buildRearDiffuserAndHexExhaust();
    this._buildActiveAlaWing();
    this._buildWheels();
    this._buildPowertrainXRay();
    this._buildHotspots();

    // Enable cast/receive shadows across all sub-meshes, but keep calipers radiant
    this.group.traverse(child => {
      if (child.isMesh) {
        if (child.material === this.materials.caliper || (child.parent && child.parent.name === 'CaliperGroup')) {
          child.castShadow = false;
          child.receiveShadow = false;
        } else {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      }
    });
  }

  _buildChassis() {
    const underfloorGeo = new THREE.BoxGeometry(1.98, 0.06, 4.48);
    const underfloor = new THREE.Mesh(underfloorGeo, this.materials.carbon);
    underfloor.position.set(0, 0.12, 0);
    this.group.add(underfloor);
    this.standardObjects.push(underfloor);

    // Ground Neon Underglow Plane
    const ugCanvas = document.createElement('canvas');
    ugCanvas.width = 128;
    ugCanvas.height = 256;
    const ugCtx = ugCanvas.getContext('2d');
    const ugGrad = ugCtx.createRadialGradient(64, 128, 20, 64, 128, 64);
    ugGrad.addColorStop(0, '#ffffff');
    ugGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    ugGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ugCtx.fillStyle = ugGrad;
    ugCtx.fillRect(0, 0, 128, 256);

    const ugTex = new THREE.CanvasTexture(ugCanvas);
    this.materials.underglow = new THREE.MeshBasicMaterial({
      color: 0xffd200,
      map: ugTex,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.underglowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 5.2), this.materials.underglow);
    this.underglowMesh.rotation.x = -Math.PI / 2;
    this.underglowMesh.position.set(0, 0.012, 0);
    this.group.add(this.underglowMesh);
  }

  /**
   * Builds the angular wedge main body:
   * Low hood with sharp dual creases, flared angular front & rear wheel arches,
   * Coke-bottle waistline, and the signature triangular rocker air scoops ahead of the rear wheels.
   */
  _buildAngularWedgeBody() {
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'BodyGroup';

    // 1. Extreme Low Wedge Hood with Center Valley & Dual Sharp Creases
    // Center Hood Sunk Panel
    const hoodCenterGeo = new THREE.BoxGeometry(0.72, 0.08, 1.55);
    hoodCenterGeo.rotateX(0.19); // Slopes sharply down towards nose
    const hoodCenter = new THREE.Mesh(hoodCenterGeo, this.materials.body);
    hoodCenter.position.set(0, 0.49, 1.34);
    bodyGroup.add(hoodCenter);

    // Dual Sharp Crease Ridges running down from A-pillar to nose
    [-0.34, 0.34].forEach(x => {
      const creaseGeo = new THREE.BoxGeometry(0.045, 0.04, 1.52);
      creaseGeo.rotateX(0.19);
      creaseGeo.rotateY(x > 0 ? -0.06 : 0.06); // Taper together toward nose
      const crease = new THREE.Mesh(creaseGeo, this.materials.body);
      crease.position.set(x, 0.53, 1.34);
      bodyGroup.add(crease);

      // Subtle hood extractor vents along the creases
      const ventGeo = new THREE.BoxGeometry(0.08, 0.02, 0.22);
      ventGeo.rotateX(0.19);
      const vent = new THREE.Mesh(ventGeo, this.materials.carbon);
      vent.position.set(x * 1.15, 0.54, 1.15);
      bodyGroup.add(vent);
    });

    // Nose Badge (Lamborghini Golden Bull Shield)
    const badgeGeo = new THREE.CylinderGeometry(0.026, 0.032, 0.008, 3);
    badgeGeo.rotateX(Math.PI / 2);
    badgeGeo.rotateZ(Math.PI);
    const badge = new THREE.Mesh(badgeGeo, this.materials.rimAccent);
    badge.position.set(0, 0.38, 2.14);
    bodyGroup.add(badge);

    // 2. Razor-Sharp Angular Front Fenders (Framing the Swept Headlights)
    [-1, 1].forEach(side => {
      // Main high fender peak
      const fenderPeakGeo = new THREE.BoxGeometry(0.24, 0.22, 1.35);
      fenderPeakGeo.rotateX(0.16);
      fenderPeakGeo.rotateZ(side * 0.12);
      const fender = new THREE.Mesh(fenderPeakGeo, this.materials.body);
      fender.position.set(side * 0.78, 0.51, 1.36);
      bodyGroup.add(fender);

      // Flared outer wheel arch lip
      const archLipGeo = new THREE.BoxGeometry(0.14, 0.24, 1.15);
      archLipGeo.rotateZ(side * 0.18);
      const archLip = new THREE.Mesh(archLipGeo, this.materials.body);
      archLip.position.set(side * 0.92, 0.44, 1.35);
      bodyGroup.add(archLip);
    });

    // 3. Sculpted Coke-Bottle Waistline & Lower Rocker Sills
    [-1, 1].forEach(side => {
      // Lower side sill
      const sillGeo = new THREE.BoxGeometry(0.16, 0.26, 1.95);
      const sill = new THREE.Mesh(sillGeo, this.materials.body);
      sill.position.set(side * 0.87, 0.32, 0.05);
      bodyGroup.add(sill);

      // Ground-skimming gloss black / carbon rocker blade
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 2.3), this.materials.glossBlack);
      skirt.position.set(side * 0.96, 0.14, 0);
      bodyGroup.add(skirt);

      // --- SIGNATURE HURACÁN FEATURE: Triangular Lower Rocker Air Scoop ---
      // (Cutout right ahead of the rear wheel, exactly as seen in reference photo!)
      const scoopCavity = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.48), this.materials.glossBlack);
      scoopCavity.rotation.y = side * 0.22;
      scoopCavity.rotation.z = -side * 0.12;
      scoopCavity.position.set(side * 0.94, 0.30, -0.68);
      bodyGroup.add(scoopCavity);

      // Triangular scoop bezel frame
      const scoopBezelGeo = new THREE.BoxGeometry(0.04, 0.24, 0.42);
      scoopBezelGeo.rotateY(side * 0.22);
      const scoopBezel = new THREE.Mesh(scoopBezelGeo, this.materials.carbon);
      scoopBezel.position.set(side * 0.98, 0.30, -0.66);
      bodyGroup.add(scoopBezel);

      // Upper shoulder air intake pod (feeds mid-mounted V10/V12 radiators)
      const upperIntake = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 0.52), this.materials.glossBlack);
      upperIntake.rotation.y = -side * 0.28;
      upperIntake.position.set(side * 0.92, 0.62, -0.62);
      bodyGroup.add(upperIntake);

      const upperLip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.55), this.materials.body);
      upperLip.position.set(side * 0.96, 0.74, -0.62);
      bodyGroup.add(upperLip);
    });

    // 4. Wide Muscular Angular Rear Haunches (Countach / Huracán DNA)
    [-1, 1].forEach(side => {
      const haunchGeo = new THREE.BoxGeometry(0.38, 0.38, 1.48);
      haunchGeo.rotateZ(side * 0.16);
      haunchGeo.rotateX(-0.08);
      const haunch = new THREE.Mesh(haunchGeo, this.materials.body);
      haunch.position.set(side * 0.95, 0.50, -1.35);
      bodyGroup.add(haunch);

      // Sharp upper crease over the rear wheel
      const haunchCrease = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.35), this.materials.body);
      haunchCrease.rotation.x = -0.08;
      haunchCrease.position.set(side * 0.99, 0.68, -1.35);
      bodyGroup.add(haunchCrease);
    });

    this.parts.bodyShell = bodyGroup;
    this.group.add(bodyGroup);
    this.standardObjects.push(bodyGroup);
  }

  /**
   * Builds the authentic Huracán EVO Front Bumper:
   * 1. Low-slung pointed wedge nosecone.
   * 2. Giant deep black triangular intake tunnels on left & right.
   * 3. THE SIGNATURE EVO CUE: Body-colored diagonal chevron / Y-blade aero fangs!
   * 4. Black center trapezoidal intake.
   * 5. Forward-projecting carbon splitter with corner aero winglets.
   * 6. Swept-back angular headlights with glowing Y-LED guide tubes.
   */
  _buildHuracanEvoFrontFascia() {
    const frontGroup = new THREE.Group();
    frontGroup.name = 'FrontFascia';

    // 1. Pointed Center Nosecone Bumper
    const noseGeo = new THREE.BoxGeometry(1.48, 0.18, 0.38);
    noseGeo.rotateX(0.18);
    const nose = new THREE.Mesh(noseGeo, this.materials.body);
    nose.position.set(0, 0.34, 2.14);
    frontGroup.add(nose);

    // 2. Black Intake Cavities (Left and Right)
    [-0.56, 0.56].forEach(x => {
      const side = Math.sign(x);

      // Deep dark intake pocket
      const cavityGeo = new THREE.BoxGeometry(0.48, 0.22, 0.32);
      cavityGeo.rotateY(-side * 0.18);
      const cavity = new THREE.Mesh(cavityGeo, this.materials.grille);
      cavity.position.set(x, 0.25, 2.18);
      frontGroup.add(cavity);

      // --- THE UNMISTAKABLE HURACÁN EVO DESIGN CUE: Body-Color Chevron Y-Blade! ---
      const evoBladeGeo = new THREE.BoxGeometry(0.06, 0.05, 0.32);
      evoBladeGeo.rotateZ(side * 0.58);  // Slanted sharp diagonal wing!
      evoBladeGeo.rotateY(-side * 0.18);
      const evoBlade = new THREE.Mesh(evoBladeGeo, this.materials.body);
      evoBlade.position.set(x - side * 0.06, 0.25, 2.22);
      frontGroup.add(evoBlade);

      // Outer vertical air curtain duct
      const curtainGeo = new THREE.BoxGeometry(0.04, 0.22, 0.24);
      curtainGeo.rotateY(side * 0.25);
      const curtain = new THREE.Mesh(curtainGeo, this.materials.body);
      curtain.position.set(side * 0.84, 0.26, 2.18);
      frontGroup.add(curtain);
    });

    // 3. Central Lower Trapezoidal Intake Mouth
    const centerIntake = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.24), this.materials.glossBlack);
    centerIntake.position.set(0, 0.20, 2.22);
    frontGroup.add(centerIntake);

    // 4. Low Carbon Fiber Splitter Tray
    const mainSplitter = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.035, 0.55), this.materials.carbon);
    mainSplitter.position.set(0, 0.09, 2.24);
    frontGroup.add(mainSplitter);

    // Upturned Aerodynamic Winglets / Dive Planes at Splitter Corners
    [-0.97, 0.97].forEach(x => {
      const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.36), this.materials.carbon);
      winglet.position.set(x, 0.16, 2.24);
      frontGroup.add(winglet);
    });

    // 5. Swept-Back Angular Headlights (Huracán Jewel Clusters)
    [-0.56, 0.56].forEach(x => {
      const side = Math.sign(x);
      const lightGroup = new THREE.Group();
      lightGroup.position.set(x, 0.46, 1.94);

      // Elongated Dark Angular Housing
      const housingGeo = new THREE.BoxGeometry(0.24, 0.07, 0.42);
      housingGeo.rotateY(-side * 0.28);
      housingGeo.rotateX(0.18);
      const housing = new THREE.Mesh(housingGeo, this.materials.glossBlack);
      lightGroup.add(housing);

      // Glowing Y-Shaped LED Daytime Running Light Tube
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.02), this.materials.headlights);
      stem.position.set(side * 0.05, 0.01, 0.04);
      stem.rotation.y = -side * 0.28;
      lightGroup.add(stem);

      const topArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.02), this.materials.headlights);
      topArm.rotation.z = side * 0.42;
      topArm.rotation.y = -side * 0.28;
      topArm.position.set(-side * 0.03, 0.03, 0);
      lightGroup.add(topArm);

      const btmArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.02), this.materials.headlights);
      btmArm.rotation.z = -side * 0.42;
      btmArm.rotation.y = -side * 0.28;
      btmArm.position.set(-side * 0.03, -0.01, 0);
      lightGroup.add(btmArm);

      // Dual High-Intensity Projector Spheres
      [-0.04, 0.04].forEach(offsetZ => {
        const projector = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 12), this.materials.headlights);
        projector.position.set(0, 0.01, offsetZ);
        lightGroup.add(projector);
      });

      // Clear Polycarbonate Protective Lens Cover
      const lensGeo = new THREE.BoxGeometry(0.25, 0.075, 0.44);
      lensGeo.rotateY(-side * 0.28);
      lensGeo.rotateX(0.18);
      const lens = new THREE.Mesh(lensGeo, this.materials.headlightLens);
      lens.position.set(0, 0.01, 0.02);
      lightGroup.add(lens);

      frontGroup.add(lightGroup);
    });

    this.group.add(frontGroup);
    this.parts.splitter = frontGroup;
    this.standardObjects.push(frontGroup);
  }

  /**
   * Parametric Cockpit Greenhouse with Exact Sports Car Angles:
   * 1. Low trapezoid windshield sloping at exact 32.5° rake from cowl to roof header.
   * 2. Raked gloss-black A-pillars framing the windshield seamlessly.
   * 3. Taut low roof canopy with center depression.
   * 4. Rear quarter spear windows & sloping engine viewing glass.
   */
  _buildCockpitCanopy() {
    const glassGroup = new THREE.Group();
    glassGroup.name = 'GreenhouseCanopy';

    // 1. Trapezoid Windshield Glass (Wider at cowl, narrower at roof header)
    // Cowl base: (±0.66, 0.58, 0.65) -> Roof top: (±0.49, 1.03, -0.06)
    const windP0 = new THREE.Vector3(-0.66, 0.58, 0.65);
    const windP1 = new THREE.Vector3(-0.49, 1.03, -0.06);
    const windP2 = new THREE.Vector3( 0.49, 1.03, -0.06);
    const windP3 = new THREE.Vector3( 0.66, 0.58, 0.65);

    const windGeo = createGlassQuadGeometry(windP0, windP1, windP2, windP3);
    const windshield = new THREE.Mesh(windGeo, this.materials.glass);
    glassGroup.add(windshield);

    // 2. Sleek Raked A-Pillars (Framing the windshield along its exact 32.5° slope)
    [-1, 1].forEach(side => {
      const pBase = new THREE.Vector3(side * 0.67, 0.58, 0.65);
      const pTop = new THREE.Vector3(side * 0.50, 1.03, -0.06);
      const length = pBase.distanceTo(pTop);

      const pillarGeo = new THREE.BoxGeometry(0.045, 0.045, length);
      const pillar = new THREE.Mesh(pillarGeo, this.materials.glossBlack);
      pillar.position.copy(pBase).lerp(pTop, 0.5);
      pillar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pTop.clone().sub(pBase).normalize());
      glassGroup.add(pillar);
    });

    // 3. Taut Hexagonal Roof Canopy
    const roofGeo = new THREE.BoxGeometry(0.98, 0.04, 0.44);
    const roof = new THREE.Mesh(roofGeo, this.materials.body);
    roof.position.set(0, 1.035, -0.28);
    glassGroup.add(roof);

    // Gloss Black Roof Header & Cantrail Arches
    const roofHeader = new THREE.Mesh(new THREE.BoxGeometry(1.00, 0.035, 0.06), this.materials.glossBlack);
    roofHeader.position.set(0, 1.04, -0.06);
    glassGroup.add(roofHeader);

    // 4. Sloping Rear Engine Viewing Glass (Meeting the rear deck louvers)
    const rearGlassP0 = new THREE.Vector3(-0.49, 1.02, -0.50);
    const rearGlassP1 = new THREE.Vector3(-0.64, 0.66, -1.25);
    const rearGlassP2 = new THREE.Vector3( 0.64, 0.66, -1.25);
    const rearGlassP3 = new THREE.Vector3( 0.49, 1.02, -0.50);
    const rearGlassGeo = createGlassQuadGeometry(rearGlassP0, rearGlassP1, rearGlassP2, rearGlassP3);
    const rearGlass = new THREE.Mesh(rearGlassGeo, this.materials.glass);
    glassGroup.add(rearGlass);

    // 5. Fixed Rear Quarter Triangular Spear Windows
    [-1, 1].forEach(side => {
      const qP0 = new THREE.Vector3(side * 0.52, 0.99, -0.46);
      const qP1 = new THREE.Vector3(side * 0.76, 0.66, -0.48);
      const qP2 = new THREE.Vector3(side * 0.70, 0.68, -0.76);
      const qP3 = new THREE.Vector3(side * 0.52, 0.99, -0.46); // triangular collapse
      const qGeo = createGlassQuadGeometry(qP0, qP1, qP2, qP3);
      const quarterGlass = new THREE.Mesh(qGeo, this.materials.glass);
      glassGroup.add(quarterGlass);
    });

    this.parts.canopy = glassGroup;

    // 6. High-Aerodynamic Sports Wing Mirrors on Angular Door Stalks (Matching Photo!)
    [-1, 1].forEach(side => {
      const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.04), this.materials.glossBlack);
      mirrorArm.rotation.z = side * 0.55;
      mirrorArm.position.set(side * 0.84, 0.72, 0.56);
      glassGroup.add(mirrorArm);

      // Sculpted Body-Color Yellow Mirror Shell
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.11), this.materials.body);
      housing.rotation.y = side * 0.18;
      housing.position.set(side * 0.98, 0.78, 0.54);
      glassGroup.add(housing);

      // Reflective Chrome Mirror Glass
      const mirrorFace = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.07), new THREE.MeshStandardMaterial({
        color: 0xe0e4ec,
        metalness: 0.98,
        roughness: 0.05,
      }));
      mirrorFace.rotation.y = side > 0 ? -Math.PI / 2 + 0.15 : Math.PI / 2 - 0.15;
      mirrorFace.position.set(side * 0.976, 0.78, 0.54);
      glassGroup.add(mirrorFace);
    });

    this.group.add(glassGroup);
    this.standardObjects.push(glassGroup);

    // 7. Cockpit Interior (Carbon Bucket Seats & Digital Cluster)
    this._buildInterior();
  }

  _buildInterior() {
    const interior = new THREE.Group();
    interior.position.set(0, 0.38, 0);

    // Dual Deep Carbon Bucket Racing Seats with Yellow Contrast Centers
    [-0.32, 0.32].forEach(x => {
      // Seat Cushion
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.54), this.materials.interiorAlcantara);
      cushion.position.set(x, 0, -0.05);
      interior.add(cushion);

      // Yellow Center Accent Strip
      const centerStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.115, 0.52), this.materials.interiorAccent);
      centerStrip.position.set(x, 0, -0.05);
      interior.add(centerStrip);

      // Angled Backrest
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.68, 0.12), this.materials.interiorAlcantara);
      backrest.rotation.x = -0.32;
      backrest.position.set(x, 0.35, -0.35);
      interior.add(backrest);

      // Headrest with Yellow Bull Crest
      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.18, 0.08), this.materials.interiorAccent);
      headrest.position.set(x, 0.70, -0.44);
      interior.add(headrest);
    });

    // D-Cut Racing Steering Wheel
    const steerGroup = new THREE.Group();
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 12, 28), this.materials.interiorAlcantara);
    steerGroup.add(wheelRim);

    const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 12), this.materials.interiorAccent);
    centerHub.rotation.x = Math.PI / 2;
    steerGroup.add(centerHub);

    // Carbon Paddle Shifters
    [-0.08, 0.08].forEach(px => {
      const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.12, 0.008), this.materials.carbon);
      paddle.position.set(px, 0.03, -0.02);
      steerGroup.add(paddle);
    });

    steerGroup.position.set(-0.32, 0.28, 0.46);
    steerGroup.rotation.x = -0.38;
    interior.add(steerGroup);

    // Center Console with Fighter Jet Ignition Cover
    const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.20, 0.95), this.materials.interiorAlcantara);
    consoleBox.position.set(0, 0.12, 0.08);
    interior.add(consoleBox);

    const redFlipCover = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.04), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
    redFlipCover.position.set(0, 0.23, 0.22);
    interior.add(redFlipCover);

    // Digital Instrument Cluster Display
    const dashDisplay = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.14), this.materials.cockpitDisplays);
    dashDisplay.position.set(0, 0.32, 0.49);
    dashDisplay.rotation.x = -0.42;
    interior.add(dashDisplay);

    this.group.add(interior);
    this.parts.interior = interior;
    this.standardObjects.push(interior);
  }

  /**
   * Scissor Doors with Parametric Frameless Window Glass
   * The window quad precisely matches the 32.5° A-pillar slope, the horizontal roofline,
   * the rear B-pillar drop, and the door waistline with authentic inward tumblehome.
   */
  _buildScissorDoors() {
    this.doors = {};

    [-1, 1].forEach((side) => {
      const doorPivot = new THREE.Group();
      doorPivot.position.set(side * 0.80, 0.50, 0.72);

      const doorMeshGroup = new THREE.Group();
      doorMeshGroup.position.set(-side * 0.80, -0.50, -0.72);

      // Outer Sculpted Door Panel
      const doorSkinGeo = new THREE.BoxGeometry(0.12, 0.44, 1.25);
      doorSkinGeo.rotateY(side * 0.06);
      const doorSkin = new THREE.Mesh(doorSkinGeo, this.materials.body);
      doorSkin.position.set(side * 0.92, 0.46, 0.08);
      doorMeshGroup.add(doorSkin);

      // --- PARAMETRIC FRAMELESS SIDE WINDOW GLASS ---
      // Defined in world coordinates then converted to doorMeshGroup local coordinates:
      // Front-bottom (mirror base): (side * 0.78, 0.60, 0.62)
      // Front-top (A-pillar/roof header): (side * 0.50, 1.02, -0.06)
      // Rear-top (roofline): (side * 0.52, 0.99, -0.46)
      // Rear-bottom (B-pillar/beltline): (side * 0.80, 0.64, -0.48)
      //
      // Notice: Front edge slopes from (0.62, 0.60) to (-0.06, 1.02)
      // Slope: ΔY / ΔZ = 0.42 / 0.68 ≈ 32.5° -> EXACTLY MATCHES THE A-PILLAR RAKE!
      const pPivot = new THREE.Vector3(side * 0.80, 0.50, 0.72);
      const w0 = new THREE.Vector3(side * 0.78, 0.60,  0.62).sub(pPivot);
      const w1 = new THREE.Vector3(side * 0.50, 1.02, -0.06).sub(pPivot);
      const w2 = new THREE.Vector3(side * 0.52, 0.99, -0.46).sub(pPivot);
      const w3 = new THREE.Vector3(side * 0.80, 0.64, -0.48).sub(pPivot);

      const sideGlassGeo = createGlassQuadGeometry(w0, w1, w2, w3);
      const sideGlass = new THREE.Mesh(sideGlassGeo, this.materials.glass);
      doorMeshGroup.add(sideGlass);

      // Horizontal Door Crease Line
      const doorCrease = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 1.2), this.materials.body);
      doorCrease.position.set(side * 0.96, 0.54, 0.08);
      doorMeshGroup.add(doorCrease);

      doorPivot.add(doorMeshGroup);
      this.group.add(doorPivot);

      if (side === -1) {
        this.doors.left = doorPivot;
      } else {
        this.doors.right = doorPivot;
      }

      this.standardObjects.push(doorMeshGroup);
    });
  }

  /**
   * Rear Engine Deck with Stepped Louvers & Twin Flying Buttresses
   */
  _buildRearEngineDeckAndLouvers() {
    const deckGroup = new THREE.Group();

    // Sloping Rear Deck Lid
    const deckLidGeo = new THREE.BoxGeometry(1.64, 0.16, 1.55);
    deckLidGeo.rotateX(-0.16);
    const deckLid = new THREE.Mesh(deckLidGeo, this.materials.body);
    deckLid.position.set(0, 0.56, -1.18);
    deckGroup.add(deckLid);

    // Twin Flying Buttress Aerodynamic Channels
    [-0.58, 0.58].forEach(x => {
      const buttressGeo = new THREE.BoxGeometry(0.24, 0.18, 1.4);
      buttressGeo.rotateX(-0.20);
      const buttress = new THREE.Mesh(buttressGeo, this.materials.body);
      buttress.position.set(x, 0.68, -1.05);
      deckGroup.add(buttress);
    });

    // 4 Stepped Tinted Glass Engine Heat Extractors / Louvers
    for (let i = 0; i < 4; i++) {
      const louver = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.02, 0.18), this.materials.glass);
      louver.rotation.x = -0.25;
      louver.position.set(0, 0.72 - i * 0.05, -0.68 - i * 0.24);
      deckGroup.add(louver);
    }

    // Rear Integrated Lip / Ducktail Spoiler
    const ducktailGeo = new THREE.BoxGeometry(1.72, 0.06, 0.22);
    ducktailGeo.rotateX(0.25); // Kicks up at tail
    const ducktail = new THREE.Mesh(ducktailGeo, this.materials.body);
    ducktail.position.set(0, 0.65, -2.12);
    deckGroup.add(ducktail);

    this.group.add(deckGroup);
    this.parts.rearDeck = deckGroup;
    this.standardObjects.push(deckGroup);
  }

  /**
   * Rear Diffuser, High-Mounted Hexagonal Exhausts & Y-Taillights
   */
  _buildRearDiffuserAndHexExhaust() {
    const rearGroup = new THREE.Group();

    // 1. Recessed Rear Bumper Fascia (Matte Black)
    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.80, 0.32, 0.40), this.materials.glossBlack);
    rearBumper.position.set(0, 0.38, -2.16);
    rearGroup.add(rearBumper);

    // 2. High-Exit Center Dual Hexagonal Exhausts (Huracán EVO / STO signature placement)
    [-0.14, 0.14].forEach(x => {
      const hexPipeGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.22, 6);
      hexPipeGeo.rotateX(Math.PI / 2);
      const hexPipe = new THREE.Mesh(hexPipeGeo, this.materials.exhaust);
      hexPipe.position.set(x, 0.52, -2.36);
      rearGroup.add(hexPipe);

      const hexInner = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.23, 6), this.materials.glossBlack);
      hexInner.rotateX(Math.PI / 2);
      hexInner.position.set(x, 0.52, -2.36);
      rearGroup.add(hexInner);
    });

    // 3. Aggressive 6-Strake Carbon Rear Venturi Diffuser
    const diffuserBase = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.05, 0.85), this.materials.carbon);
    diffuserBase.rotation.x = -0.22;
    diffuserBase.position.set(0, 0.18, -2.22);
    rearGroup.add(diffuserBase);

    [-0.70, -0.42, -0.15, 0.15, 0.42, 0.70].forEach(x => {
      const strake = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.75), this.materials.carbon);
      strake.rotation.x = -0.22;
      strake.position.set(x, 0.18, -2.22);
      rearGroup.add(strake);
    });

    // Central F1 Style Red Rain Safety LED
    const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.03), this.materials.taillights);
    rainLight.position.set(0, 0.16, -2.52);
    rearGroup.add(rainLight);

    // 4. Horizontal Y-Shaped Razor LED Taillights
    [-0.64, 0.64].forEach(x => {
      const side = Math.sign(x);
      const tailGroup = new THREE.Group();
      tailGroup.position.set(x, 0.56, -2.32);

      // Center light stem
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.022, 0.03), this.materials.taillights);
      stem.position.set(side * 0.06, 0, 0);
      tailGroup.add(stem);

      // Upper Y-Branch
      const topArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, 0.03), this.materials.taillights);
      topArm.rotation.z = side * -0.42;
      topArm.position.set(side * -0.06, 0.04, 0);
      tailGroup.add(topArm);

      // Lower Y-Branch
      const btmArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, 0.03), this.materials.taillights);
      btmArm.rotation.z = side * 0.42;
      btmArm.position.set(side * -0.06, -0.04, 0);
      tailGroup.add(btmArm);

      rearGroup.add(tailGroup);
    });

    this.group.add(rearGroup);
    this.parts.diffuser = rearGroup;
    this.standardObjects.push(rearGroup);
  }

  /**
   * Active Aerodinamica Lamborghini Attiva (ALA) Rear Wing
   */
  _buildActiveAlaWing() {
    this.spoilerGroup = new THREE.Group();
    this.spoilerGroup.position.set(0, 0.68, -1.95);

    // Carbon Wing Mainplane
    const wingGeo = new THREE.BoxGeometry(1.82, 0.04, 0.32);
    const wing = new THREE.Mesh(wingGeo, this.materials.carbon);
    this.spoilerGroup.add(wing);

    // Sharp Angular Wing Endplates
    [-0.91, 0.91].forEach(x => {
      const ep = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.38), this.materials.carbon);
      ep.position.set(x, 0.04, 0);
      this.spoilerGroup.add(ep);
    });

    // Twin Swan-Neck Carbon Support Pylons
    this.spoilerStruts = [];
    [-0.42, 0.42].forEach(x => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.08), this.materials.carbon);
      strut.position.set(x, -0.12, 0);
      this.spoilerGroup.add(strut);
      this.spoilerStruts.push(strut);
    });

    this.group.add(this.spoilerGroup);
    this.standardObjects.push(this.spoilerGroup);
  }

  /**
   * Authentic Open-Spoke Forged Supercar Wheels & 100% Visible 6-Piston Calipers
   * Designed with a hollow cylindrical barrel (openEnded: true) and slender Y-spokes,
   * allowing the cross-drilled carbon-ceramic rotor and large monobloc caliper to be
   * prominently and clearly visible from any camera angle!
   */
  _buildWheels() {
    const wheelPositions = [
      { x: -0.92, y: 0.34, z: 1.35, isFront: true, width: 0.28, radius: 0.34 },
      { x: 0.92, y: 0.34, z: 1.35, isFront: true, width: 0.28, radius: 0.34 },
      { x: -0.96, y: 0.36, z: -1.35, isFront: false, width: 0.36, radius: 0.36 }, // Deep dish rear
      { x: 0.96, y: 0.36, z: -1.35, isFront: false, width: 0.36, radius: 0.36 },  // Deep dish rear
    ];

    wheelPositions.forEach((pos) => {
      const assembly = new THREE.Group();
      assembly.position.set(pos.x, pos.y, pos.z);

      const wheelRotateGroup = new THREE.Group();

      // 1. Low Profile Supercar Rubber Tire
      const tireGeo = new THREE.CylinderGeometry(pos.radius, pos.radius, pos.width, 36);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, this.materials.tires);
      wheelRotateGroup.add(tire);

      // 2. Hollow Rim Barrel (openEnded: true -> NO END CAPS! Calipers are fully visible!)
      const rimBarrelGeo = new THREE.CylinderGeometry(pos.radius * 0.80, pos.radius * 0.80, pos.width * 0.92, 32, 1, true);
      rimBarrelGeo.rotateZ(Math.PI / 2);
      const rimBarrel = new THREE.Mesh(rimBarrelGeo, this.materials.rims);
      wheelRotateGroup.add(rimBarrel);
      this.rimMeshes.push(rimBarrel);

      // 3. Outer Rim Lip Ring
      const outerX = pos.x < 0 ? -pos.width * 0.46 : pos.width * 0.46;
      const lipGeo = new THREE.TorusGeometry(pos.radius * 0.80, 0.016, 12, 36);
      lipGeo.rotateY(Math.PI / 2);
      const rimLip = new THREE.Mesh(lipGeo, this.materials.rims);
      rimLip.position.set(outerX, 0, 0);
      wheelRotateGroup.add(rimLip);
      this.rimMeshes.push(rimLip);

      // 4. Central Wheel Hub
      const hubGeo = new THREE.CylinderGeometry(pos.radius * 0.24, pos.radius * 0.24, 0.04, 24);
      hubGeo.rotateZ(Math.PI / 2);
      const hub = new THREE.Mesh(hubGeo, this.materials.rims);
      hub.position.set(outerX * 0.94, 0, 0);
      wheelRotateGroup.add(hub);
      this.rimMeshes.push(hub);

      // 5. Open-Air Directional Y-Spokes (10 slender spokes with wide open gaps!)
      const spokeCount = 5;
      for (let s = 0; s < spokeCount; s++) {
        const angle = (s / spokeCount) * Math.PI * 2;
        [-0.07, 0.07].forEach(offset => {
          const spokeGeo = new THREE.BoxGeometry(0.016, pos.radius * 0.68, 0.024);
          const spoke = new THREE.Mesh(spokeGeo, this.materials.rims);
          spoke.rotation.x = angle + offset;
          spoke.position.set(
            outerX * 0.96,
            Math.sin(angle) * pos.radius * 0.38,
            Math.cos(angle) * pos.radius * 0.38
          );
          wheelRotateGroup.add(spoke);
          this.rimMeshes.push(spoke);
        });
      }

      // 6. Center Lock Hexagonal Wheel Nut
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 6), this.materials.rimAccent);
      nut.rotateZ(Math.PI / 2);
      nut.position.set(outerX * 1.02, 0, 0);
      wheelRotateGroup.add(nut);

      assembly.add(wheelRotateGroup);
      this.wheels.push(wheelRotateGroup);

      // 7. Stationary Cross-Drilled Carbon Ceramic Brake Rotor (Mounted directly behind spokes!)
      const rotorX = pos.x < 0 ? -pos.width * 0.22 : pos.width * 0.22;
      const rotorGeo = new THREE.CylinderGeometry(pos.radius * 0.72, pos.radius * 0.72, 0.026, 32);
      rotorGeo.rotateZ(Math.PI / 2);
      const rotor = new THREE.Mesh(rotorGeo, this.materials.brakeDiscs);
      rotor.position.set(rotorX, 0, 0);
      assembly.add(rotor);

      // 8. Enormous 6-Piston Monobloc Brake Caliper (Prominently mounted on outer rotor edge right behind spokes!)
      const caliperGroup = new THREE.Group();
      caliperGroup.name = 'CaliperGroup';
      const caliperX = pos.x < 0 ? -pos.width * 0.36 : pos.width * 0.36;
      caliperGroup.position.set(caliperX, pos.radius * 0.50, pos.radius * 0.34);
      caliperGroup.rotation.x = -0.60;

      // Main caliper housing
      const caliperBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.28), this.materials.caliper);
      caliperBody.castShadow = false;
      caliperBody.receiveShadow = false;
      caliperGroup.add(caliperBody);
      this.caliperMeshes.push(caliperBody);

      // Outer arched bridge / pressure crest
      const caliperBridge = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.22), this.materials.caliper);
      caliperBridge.position.set(0, 0.085, 0);
      caliperBridge.castShadow = false;
      caliperBridge.receiveShadow = false;
      caliperGroup.add(caliperBridge);
      this.caliperMeshes.push(caliperBridge);

      // White High-Contrast Logo Strip on Caliper Face
      const badgeX = pos.x < 0 ? -0.048 : 0.048;
      const logoBadge = new THREE.Mesh(
        new THREE.BoxGeometry(0.006, 0.035, 0.16),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      logoBadge.position.set(badgeX, 0, 0);
      caliperGroup.add(logoBadge);

      assembly.add(caliperGroup);

      this.wheelAssemblies.push({
        group: assembly,
        isFront: pos.isFront,
        isLeft: pos.x < 0,
        basePos: new THREE.Vector3(pos.x, pos.y, pos.z)
      });

      this.group.add(assembly);
      this.standardObjects.push(assembly);
    });
  }

  _buildPowertrainXRay() {
    this.xrayGroup = new THREE.Group();
    this.xrayGroup.name = 'PowertrainXRay';
    this.xrayGroup.visible = false;

    // High Voltage Battery & V10/V12 Hybrid Block
    const packEnclosure = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.12, 2.1),
      this.materials.batteryPack
    );
    packEnclosure.position.set(0, 0.20, 0);
    this.xrayGroup.add(packEnclosure);

    // Glowing cell modules
    for (let row = -0.75; row <= 0.75; row += 0.35) {
      for (let col = -0.4; col <= 0.4; col += 0.28) {
        const cell = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.24), this.materials.batteryPack);
        cell.position.set(col, 0.28, row);
        this.xrayGroup.add(cell);
      }
    }

    // Mid-Mounted V10/V12 Hybrid Engine Motor
    const midEngine = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.75, 20), this.materials.electricMotor);
    midEngine.rotateZ(Math.PI / 2);
    midEngine.position.set(0, 0.36, -0.6);
    this.xrayGroup.add(midEngine);

    // Front Torque Vectoring Electric Motor
    const frontMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.55, 20), this.materials.electricMotor);
    frontMotor.rotateZ(Math.PI / 2);
    frontMotor.position.set(0, 0.34, 1.35);
    this.xrayGroup.add(frontMotor);

    // Carbon Monocoque Spaceframe Tub
    const spaceframeGroup = new THREE.Group();
    const tubeCoords = [
      [-0.62, 0.18, -1.7, -0.62, 0.18, 1.7],
      [0.62, 0.18, -1.7, 0.62, 0.18, 1.7],
      [-0.52, 0.85, -0.3, -0.52, 0.85, 0.4],
      [0.52, 0.85, -0.3, 0.52, 0.85, 0.4],
      [-0.62, 0.18, 0, 0.62, 0.18, 0],
      [-0.62, 0.18, -1.3, 0.62, 0.18, -1.3],
      [-0.62, 0.18, 1.3, 0.62, 0.18, 1.3],
    ];

    tubeCoords.forEach(c => {
      const p1 = new THREE.Vector3(c[0], c[1], c[2]);
      const p2 = new THREE.Vector3(c[3], c[4], c[5]);
      const dist = p1.distanceTo(p2);
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, dist, 8), this.materials.chassisTube);
      cyl.position.copy(p1).lerp(p2, 0.5);
      cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
      spaceframeGroup.add(cyl);
    });

    this.xrayGroup.add(spaceframeGroup);
    this.group.add(this.xrayGroup);
  }

  _buildHotspots() {
    this.hotspotGroup = new THREE.Group();
    this.hotspotGroup.name = 'Hotspots';
    this.hotspots = [
      {
        id: 'splitter',
        title: 'Huracán EVO Aerodynamic Fascia',
        detail: 'Integrated body-colored chevron Y-wings channel high-pressure air through side cooling tunnels with 420 kg front downforce.',
        position: new THREE.Vector3(0, 0.26, 2.26),
        camPos: new THREE.Vector3(0, 0.95, 3.4),
        camTarget: new THREE.Vector3(0, 0.32, 2.0),
      },
      {
        id: 'rockerscoop',
        title: 'Triangular Rocker Air Intake',
        detail: 'Signature lower NACA rocker duct ahead of the rear tire, feeding high-velocity cooling air to rear brakes and oil coolers.',
        position: new THREE.Vector3(-0.96, 0.32, -0.66),
        camPos: new THREE.Vector3(-2.6, 0.75, -0.4),
        camTarget: new THREE.Vector3(-0.8, 0.35, -0.65),
      },
      {
        id: 'wheel',
        title: '21-inch Forged Wheels & Giallo Calipers',
        detail: 'Gloss black directional lightweight alloy wheels paired with 380mm carbon-ceramic rotors and 6-piston monobloc calipers.',
        position: new THREE.Vector3(-0.95, 0.36, 1.35),
        camPos: new THREE.Vector3(-2.2, 0.65, 1.7),
        camTarget: new THREE.Vector3(-0.9, 0.35, 1.35),
      },
      {
        id: 'canopy',
        title: 'Parametric Wedge Greenhouse',
        detail: 'Continuous aerodynamic wedge line from cowl to roof header with flush frameless window glass and dual carbon bucket seats.',
        position: new THREE.Vector3(0, 0.98, -0.05),
        camPos: new THREE.Vector3(0.5, 2.0, 1.3),
        camTarget: new THREE.Vector3(0, 0.6, 0),
      },
      {
        id: 'exhaust',
        title: 'High-Exit Hexagonal Titanium Exhausts',
        detail: 'Center-mounted titanium hexagonal exhaust outlets generating a symphonic 8,500 RPM V10 note above a 6-strake diffuser.',
        position: new THREE.Vector3(0, 0.54, -2.36),
        camPos: new THREE.Vector3(1.8, 1.35, -3.2),
        camTarget: new THREE.Vector3(0, 0.50, -2.1),
      },
    ];

    this.hotspotMeshes = [];

    this.hotspots.forEach(h => {
      const marker = new THREE.Group();
      marker.position.copy(h.position);

      const sphereGeo = new THREE.SphereGeometry(0.045, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffd200 });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.userData = { hotspot: h };
      marker.add(sphere);

      const ringGeo = new THREE.RingGeometry(0.065, 0.085, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffd200,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.lookAt(0, 1, 0);
      marker.add(ring);
      h.ring = ring;

      this.hotspotGroup.add(marker);
      this.hotspotMeshes.push(sphere);
    });

    this.group.add(this.hotspotGroup);
  }

  // --- Animation and Control API ---

  toggleDoors() {
    this.doorsOpen = !this.doorsOpen;
    return this.doorsOpen;
  }

  toggleSpoiler() {
    this.spoilerRaised = !this.spoilerRaised;
    return this.spoilerRaised;
  }

  setPaintColor(hex) {
    this.materials.body.color.setHex(hex);
  }

  setCaliperColor(hex) {
    this.materials.caliper.color.setHex(hex);
    this.materials.caliper.emissive.setHex(hex);
    this.materials.caliper.emissiveIntensity = 0.40;
    this.materials.caliper.needsUpdate = true;

    // Synchronize wheel center-lock nut accent
    if (this.materials.rimAccent) {
      this.materials.rimAccent.color.setHex(hex);
      this.materials.rimAccent.emissive.setHex(hex);
      this.materials.rimAccent.emissiveIntensity = 0.40;
      this.materials.rimAccent.needsUpdate = true;
    }

    // Synchronize interior sport seat contrast stitching & inlays
    if (this.materials.interiorAccent) {
      this.materials.interiorAccent.color.setHex(hex);
      this.materials.interiorAccent.needsUpdate = true;
    }

    this.caliperMeshes.forEach(mesh => {
      if (mesh && mesh.material) {
        mesh.material.color.setHex(hex);
        if (mesh.material.emissive) {
          mesh.material.emissive.setHex(hex);
          mesh.material.emissiveIntensity = 0.40;
        }
        mesh.material.needsUpdate = true;
      }
    });
  }

  setRimFinish(style) {
    let colorHex = 0x141518;
    let metalness = 0.92;
    let roughness = 0.15;

    if (style === 'titanium') {
      colorHex = 0xd1d5db; // Bright liquid platinum titanium
      metalness = 0.95;
      roughness = 0.18;
    } else if (style === 'gold') {
      colorHex = 0xdfa837; // Rich satin metallic racing gold
      metalness = 0.90;
      roughness = 0.22;
    }

    this.materials.rims.color.setHex(colorHex);
    this.materials.rims.metalness = metalness;
    this.materials.rims.roughness = roughness;
    this.materials.rims.needsUpdate = true;

    this.rimMeshes.forEach(mesh => {
      if (mesh && mesh.material) {
        mesh.material.color.setHex(colorHex);
        mesh.material.metalness = metalness;
        mesh.material.roughness = roughness;
        mesh.material.needsUpdate = true;
      }
    });
  }

  setXRayMode(enable) {
    this.isXRay = enable;
    this.xrayGroup.visible = enable;

    const targets = [
      this.parts.bodyShell,
      this.parts.canopy,
      this.parts.splitter,
      this.parts.diffuser,
      this.parts.rearDeck,
      this.spoilerGroup,
      this.doors.left,
      this.doors.right
    ];

    targets.forEach(grp => {
      if (!grp) return;
      grp.traverse(child => {
        if (child.isMesh && child !== this.underglowMesh) {
          if (!child.userData.origMat) {
            child.userData.origMat = child.material;
          }
          child.material = enable ? this.materials.wireframeGhost : child.userData.origMat;
        }
      });
    });
  }

  setHotspotsVisible(visible) {
    if (this.hotspotGroup) {
      this.hotspotGroup.visible = visible;
    }
  }

  toggleExplode() {
    this.isExploded = !this.isExploded;
    return this.isExploded;
  }

  setUnderglow(colorHex) {
    if (colorHex === null) {
      this.materials.underglow.opacity = 0.0;
    } else {
      this.materials.underglow.color.setHex(colorHex);
      this.materials.underglow.opacity = 0.85;
    }
  }

  getHotspots() {
    return this.hotspots;
  }

  getHotspotMeshes() {
    return this.hotspotMeshes;
  }

  /**
   * Main Per-Frame Update Loop
   */
  update(delta, driveSpeed = 0, steerAngle = 0) {
    // 1. Wheel Rotation (calculated from linear ground velocity)
    const forwardVelocity = (driveSpeed * 0.44704); // MPH to m/s
    const wheelCircumference = 2 * Math.PI * 0.35;
    const revsPerSec = forwardVelocity / wheelCircumference;
    this.wheelRotation -= revsPerSec * delta * Math.PI * 2;

    this.wheels.forEach(w => {
      w.rotation.x = this.wheelRotation;
    });

    // 2. Animate Vertical Scissor Doors
    const targetDoor = this.doorsOpen ? 1 : 0;
    this.doorProgress += (targetDoor - this.doorProgress) * Math.min(1, delta * 4.0);

    const scissorAngleZ = this.doorProgress * Math.PI * 0.44; // ~80 degrees straight up
    const outwardSplayY = this.doorProgress * 0.16;

    if (this.doors.left) {
      this.doors.left.rotation.z = -scissorAngleZ;
      this.doors.left.rotation.y = -outwardSplayY;
    }
    if (this.doors.right) {
      this.doors.right.rotation.z = scissorAngleZ;
      this.doors.right.rotation.y = outwardSplayY;
    }

    // 3. Animate Active Rear Wing
    const targetSpoiler = this.spoilerRaised ? 1 : 0;
    this.spoilerProgress += (targetSpoiler - this.spoilerProgress) * Math.min(1, delta * 3.5);

    if (this.spoilerGroup) {
      const sp = this.spoilerProgress;
      this.spoilerGroup.position.y = 0.68 + sp * 0.18;
      this.spoilerGroup.position.z = -1.95 - sp * 0.06;
      this.spoilerGroup.rotation.x = sp * 0.22; // Aerodynamic angle of attack
    }

    // Front Wheel Steering Angle
    this.steeringAngle = THREE.MathUtils.lerp(this.steeringAngle, steerAngle, Math.min(1, delta * 8));
    this.wheelAssemblies.forEach(wa => {
      if (wa.isFront) {
        wa.group.rotation.y = this.steeringAngle;
      }
    });

    // 4. Animate Exploded Assembly View
    const targetExplode = this.isExploded ? 1 : 0;
    this.explodeProgress += (targetExplode - this.explodeProgress) * Math.min(1, delta * 3.5);
    const ep = this.explodeProgress;

    if (this.parts.bodyShell) {
      this.parts.bodyShell.position.set(0, ep * 0.85, ep * 0.2);
    }
    if (this.parts.canopy) {
      this.parts.canopy.position.set(0, ep * 1.25, ep * 0.15);
    }
    if (this.parts.splitter) {
      this.parts.splitter.position.set(0, ep * 0.12, ep * 0.85);
    }
    if (this.parts.rearDeck) {
      this.parts.rearDeck.position.set(0, ep * 0.95, -ep * 0.55);
    }
    if (this.parts.diffuser) {
      this.parts.diffuser.position.set(0, ep * 0.12, -ep * 0.85);
    }
    if (this.spoilerGroup) {
      this.spoilerGroup.position.set(0, 0.68 + this.spoilerProgress * 0.18 + ep * 0.7, -1.95 - ep * 0.6);
    }
    if (this.doors.left) {
      this.doors.left.position.set(-0.80 - ep * 0.45, 0.50 + ep * 0.6, 0.72 + ep * 0.15);
    }
    if (this.doors.right) {
      this.doors.right.position.set(0.80 + ep * 0.45, 0.50 + ep * 0.6, 0.72 + ep * 0.15);
    }
    this.wheelAssemblies.forEach(wa => {
      const side = wa.basePos.x < 0 ? -1 : 1;
      wa.group.position.x = wa.basePos.x + side * ep * 0.65;
    });

    // 5. Idle suspension breathing
    if (driveSpeed === 0 && !this.isXRay && ep < 0.05) {
      const time = performance.now() * 0.0015;
      this.group.position.y = Math.sin(time) * 0.004;
    } else {
      this.group.position.y = 0;
    }

    // 6. Pulse Hotspot Markers
    if (this.hotspotGroup) {
      const pulseTime = performance.now() * 0.003;
      const s = 1.0 + Math.sin(pulseTime) * 0.18;
      this.hotspots.forEach(h => {
        if (h.ring) h.ring.scale.set(s, s, s);
      });
    }
  }
}
