# Apex Vision Hyper-EV — 3D Interactive Design Showcase

An interactive, high-fidelity 3D web demonstration of next-generation electric hypercar design, aerodynamics, and powertrain engineering.

Built with **Three.js**, **WebGL2**, **UnrealBloomPass Post-Processing**, and native **Web Audio API**.

---

## 🌟 Key Features

1. **Studio Showroom & Real-Time Configurator**:
   - 360° smooth damped orbital camera with ground level limits.
   - **PBR Multi-layer Automotive Paint**: Clearcoat shaders with swatches for Liquid Obsidian, Hyper Blue, Satin Titanium, Apex Sunset Orange, Kinetic Emerald, and Arctic Pearl.
   - **21-inch Directional Forged Wheels**: Selectable finishes (Carbon Dark, Titanium, Bronze Gold).
   - **Monobloc Brake Caliper Accents**: Acid Green, Solar Orange, Brembo Red, Electric Cyan.
   - **Ground Neon Underglow**: Customizable ambient chassis illumination (Cyan, Purple, Acid Green, Amber, Off).
   - **Functional Dihedral Scissor Doors**: Animated dampers with mechanical latch and hydraulic sound effects.
   - **Deployable Active Aerodynamic Rear Wing**: Dynamically articulates with speed or manual toggle.
   - **Powertrain X-Ray Mode**: Dissolves outer body shell into a holographic wireframe, revealing the 800V skateboard battery pack, dual axial-flux motors, high-voltage busbars, and aluminum spaceframe.
   - **Exploded Assembly CAD View**: Smoothly expands all body panels, glass canopy, aero splitter, rear diffuser, and wheel assemblies away from the core chassis to inspect mechanical packaging.
   - **Interactive 3D Engineering Hotspots**: Clickable pulsing 3D markers on signature components that animate the camera and present technical specs cards.

2. **CFD Aerodynamic Wind Tunnel ("Aero Lab")**:
   - High-density particle streamlines (2,800+ particles) simulated across aerodynamic body contours.
   - **Adjustable Tunnel Airspeed**: Real-time slider from 50 to 350 MPH with pitch-modulated wind whoosh audio.
   - **Visualization Modes**:
     - **Velocity**: Downforce compression gradient (Blue $\rightarrow$ Teal $\rightarrow$ Amber/Orange)
     - **Cyan**: Laser streamlines
     - **Thermal**: Boundary layer heat profile

3. **High-Speed Dynamic Night Drive & Interactive Steering**:
   - Infinite futuristic cyber-highway and pulsing neon tunnel arches.
   - **Interactive Steering & Lane Weaving**: Steer using `A` / `D` or Left / Right arrow keys with dynamic front wheel steering angles and realistic vehicle body roll.
   - **Hyperspace Boost Mode**: Accelerate up to 185+ MPH by holding the **BOOST ACCEL** button (or `W` / Up Arrow), triggering a dynamic camera FOV warp ($42^\circ \rightarrow 56^\circ$) and electric inverter whine.
   - Dynamic forward-projecting headlights and volumetric atmospheric light cones.

4. **Cinematic Keynote Director & First-Person Cockpit**:
   - One-click choreographed automotive keynote sequence gliding across signature design angles.
   - Dedicated **Cockpit Camera View** putting you behind the F1 yoke steering wheel and holographic instrument cluster.

5. **4K Wallpaper Snapshot Tool**:
   - Camera button in the top header that captures a clean, pristine high-resolution snapshot directly from the WebGL canvas with audio shutter feedback.

---

## 🚀 How to Run

1. Open a terminal in this directory:
   ```bash
   cd /Users/renahwolzinger/.gemini/antigravity/scratch/apex-3d-car
   ```

2. Start a local HTTP server:
   ```bash
   python3 -m http.server 8080
   ```

3. Open your browser and navigate to:
   [http://localhost:8080](http://localhost:8080)

---

## 📁 File Structure

- `index.html` - Application entry point, responsive HUD overlay, telemetry cards, and Three.js import map.
- `styles.css` - Luxury automotive glassmorphism styling, responsive layout, and glowing neon accents.
- `src/`
  - `main.js` - Central coordinator, Three.js setup, EffectComposer bloom pipeline, raycasting for 3D hotspots, keyboard steering, and snapshot tool.
  - `car.js` - Procedural 3D hypercar generator, PBR automotive shaders, carbon fiber texture generator, exploded view kinematics, underglow plane, and scissor doors.
  - `particles.js` - Wind tunnel CFD streamline particle simulation and velocity/thermal color mapping.
  - `environment.js` - Procedural PMREM HDRI studio reflection map, floor contact shadows & reflections, and dynamic neon cyber tunnel with volumetric headlights.
  - `cameraDirector.js` - Spline-based cinematic keynote camera tour and camera presets (including cockpit).
  - `audio.js` - Real-time procedural Web Audio sound synthesis (electric motor whine, air whoosh, door hydraulics, camera shutter, UI clicks).
