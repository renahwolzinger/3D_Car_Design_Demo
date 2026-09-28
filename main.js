import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { ApexCar } from './car.js';
import { WindTunnelParticles } from './particles.js';
import { EnvironmentManager } from './environment.js';
import { CameraDirector } from './cameraDirector.js';
import { sound } from './audio.js';

class App {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();
    this.currentMode = 'studio'; // 'studio' | 'aero' | 'drive'
    this.driveSpeed = 0; // 0 to 185 mph
    this.isAccelerating = false;
    this.steeringInput = 0;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-1000, -1000);

    this._initThree();
    this._initPostProcessing();
    this._initComponents();
    this._initUI();
    this._setupEvents();

    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  _initThree() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06070a);
    this.scene.fog = new THREE.FogExp2(0x06070a, 0.025);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(4.6, 1.6, 4.8);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent camera dipping below floor
    this.controls.minDistance = 1.8;
    this.controls.maxDistance = 14.0;
    this.controls.target.set(0, 0.45, 0);

    // Stop cinematic tour if user manually grabs the orbit controls
    this.controls.addEventListener('start', () => {
      if (this.director && this.director.isTourActive) {
        this.director.stopKeynoteTour();
        const tourBtn = document.getElementById('btn-keynote');
        if (tourBtn) tourBtn.classList.remove('active');
      }
    });
  }

  _initPostProcessing() {
    // High-Fidelity Cinematic Bloom Pipeline
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.65, // strength
      0.35, // radius
      0.82  // threshold
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  _initComponents() {
    this.environment = new EnvironmentManager(this.scene, this.renderer);
    this.car = new ApexCar(this.scene);
    this.particles = new WindTunnelParticles(this.scene);
    this.director = new CameraDirector(this.camera, this.controls);
  }

  _initUI() {
    // 1. Color Swatches
    const swatches = [
      { id: 'swatch-orange', color: 0xff5500, name: 'Arancio Argos' },
      { id: 'swatch-green', color: 0x00e640, name: 'Verde Mantis' },
      { id: 'swatch-yellow', color: 0xffd700, name: 'Giallo Auge' },
      { id: 'swatch-cyan', color: 0x00bbff, name: 'Blu Cepheus' },
      { id: 'swatch-black', color: 0x0e1014, name: 'Nero Nemesis' },
      { id: 'swatch-white', color: 0xf5f7fb, name: 'Bianco Monocerus' },
    ];

    swatches.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) {
        el.addEventListener('click', () => {
          document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
          el.classList.add('active');
          this.car.setPaintColor(s.color);
          sound.playClick();
        });
      }
    });

    // 2. Caliper Color Buttons
    const calipers = [
      { id: 'caliper-yellow', color: 0xffd200 },
      { id: 'caliper-acid', color: 0x00ff88 },
      { id: 'caliper-orange', color: 0xff6600 },
      { id: 'caliper-red', color: 0xff1744 },
      { id: 'caliper-cyan', color: 0x00e5ff },
    ];
    calipers.forEach(c => {
      const el = document.getElementById(c.id);
      if (el) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          calipers.forEach(item => {
            const btn = document.getElementById(item.id);
            if (btn) btn.classList.remove('active');
          });
          el.classList.add('active');
          this.car.setCaliperColor(c.color);
          sound.playClick();
        });
      }
    });

    // 3. Wheel Finish Selection
    const rimStyles = [
      { id: 'rim-dark', style: 'dark' },
      { id: 'rim-titanium', style: 'titanium' },
      { id: 'rim-gold', style: 'gold' },
    ];
    rimStyles.forEach(rf => {
      const el = document.getElementById(rf.id);
      if (el) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          rimStyles.forEach(item => {
            const btn = document.getElementById(item.id);
            if (btn) btn.classList.remove('active');
          });
          el.classList.add('active');
          this.car.setRimFinish(rf.style);
          sound.playClick();
        });
      }
    });

    // 4. Action Toggles
    const doorBtn = document.getElementById('btn-doors');
    if (doorBtn) {
      doorBtn.addEventListener('click', () => {
        const isOpen = this.car.toggleDoors();
        doorBtn.classList.toggle('active', isOpen);
        doorBtn.querySelector('.status-text').textContent = isOpen ? 'OPEN' : 'CLOSED';
        sound.playDoorSound(isOpen);
      });
    }

    const spoilerBtn = document.getElementById('btn-spoiler');
    if (spoilerBtn) {
      spoilerBtn.addEventListener('click', () => {
        const isRaised = this.car.toggleSpoiler();
        spoilerBtn.classList.toggle('active', isRaised);
        spoilerBtn.querySelector('.status-text').textContent = isRaised ? 'DEPLOYED' : 'RETRACTED';
        sound.playClick();
      });
    }

    const xrayBtn = document.getElementById('btn-xray');
    if (xrayBtn) {
      xrayBtn.addEventListener('click', () => {
        const isXRay = !this.car.isXRay;
        this.car.setXRayMode(isXRay);
        xrayBtn.classList.toggle('active', isXRay);
        xrayBtn.querySelector('.status-text').textContent = isXRay ? 'ACTIVE' : 'OFF';
        sound.playClick();
      });
    }

    const explodeBtn = document.getElementById('btn-explode');
    if (explodeBtn) {
      explodeBtn.addEventListener('click', () => {
        const isExploded = this.car.toggleExplode();
        explodeBtn.classList.toggle('active', isExploded);
        explodeBtn.querySelector('.status-text').textContent = isExploded ? 'EXPLODED' : 'OFF';
        sound.playDoorSound(isExploded);
      });
    }

    // Underglow Neon Palette
    const underglowOptions = [
      { id: 'ug-off', color: null },
      { id: 'ug-cyan', color: 0x00f0ff },
      { id: 'ug-purple', color: 0xa855f7 },
      { id: 'ug-green', color: 0x00ff88 },
      { id: 'ug-amber', color: 0xff6600 },
    ];
    underglowOptions.forEach(ug => {
      const el = document.getElementById(ug.id);
      if (el) {
        el.addEventListener('click', () => {
          underglowOptions.forEach(o => {
            const btn = document.getElementById(o.id);
            if (btn) btn.classList.remove('active');
          });
          el.classList.add('active');
          this.car.setUnderglow(ug.color);
          sound.playClick();
        });
      }
    });

    const keynoteBtn = document.getElementById('btn-keynote');
    if (keynoteBtn) {
      keynoteBtn.addEventListener('click', () => {
        const isActive = !this.director.isTourActive;
        if (isActive) {
          this.director.startKeynoteTour();
          keynoteBtn.classList.add('active');
          this._hideHotspotCard();
        } else {
          this.director.stopKeynoteTour();
          keynoteBtn.classList.remove('active');
        }
        sound.playModeChime();
      });
    }

    const snapshotBtn = document.getElementById('btn-snapshot');
    if (snapshotBtn) {
      snapshotBtn.addEventListener('click', () => {
        this._captureSnapshot();
      });
    }

    // 5. Camera Preset Buttons
    ['front', 'side', 'rear', 'top', 'cockpit'].forEach(p => {
      const btn = document.getElementById(`cam-${p}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.director.moveToPreset(p);
          this._hideHotspotCard();
          sound.playClick();
        });
      }
    });

    // 6. Mode Navigation Tabs (Studio vs Aero Lab vs Dynamic Drive)
    ['studio', 'aero', 'drive'].forEach(m => {
      const tab = document.getElementById(`tab-${m}`);
      if (tab) {
        tab.addEventListener('click', () => {
          this._switchMode(m);
        });
      }
    });

    // 7. Audio Mute Toggle
    const soundBtn = document.getElementById('btn-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const isMuted = sound.toggleMute();
        soundBtn.classList.toggle('muted', isMuted);
        soundBtn.title = isMuted ? 'Unmute Sound' : 'Mute Sound';
      });
    }

    // 8. Drive Mode Controls (Accelerator Pedals / Slider)
    const throttleSlider = document.getElementById('throttle-slider');
    if (throttleSlider) {
      throttleSlider.addEventListener('input', (e) => {
        this.driveSpeed = parseFloat(e.target.value);
        this._updateSpeedUI();
      });
    }

    const throttleBtn = document.getElementById('btn-throttle');
    if (throttleBtn) {
      const startThrottle = (e) => {
        e.preventDefault();
        this.isAccelerating = true;
        sound.resume();
      };
      const stopThrottle = () => {
        this.isAccelerating = false;
      };

      throttleBtn.addEventListener('mousedown', startThrottle);
      throttleBtn.addEventListener('touchstart', startThrottle, { passive: false });
      window.addEventListener('mouseup', stopThrottle);
      window.addEventListener('touchend', stopThrottle);
    }

    // 9. Aero Lab Controls
    const aeroSpeedSlider = document.getElementById('aero-speed-slider');
    const aeroSpeedVal = document.getElementById('aero-speed-val');
    if (aeroSpeedSlider) {
      aeroSpeedSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.particles.setSpeed(val);
        if (aeroSpeedVal) aeroSpeedVal.textContent = Math.round(val * 140) + ' MPH';
        sound.setWindTunnelActive(true, val);
      });
    }

    const visModes = [
      { id: 'vis-velocity', mode: 'velocity' },
      { id: 'vis-cyan', mode: 'cyan' },
      { id: 'vis-thermal', mode: 'thermal' },
    ];
    visModes.forEach(v => {
      const btn = document.getElementById(v.id);
      if (btn) {
        btn.addEventListener('click', () => {
          visModes.forEach(other => {
            const b = document.getElementById(other.id);
            if (b) b.classList.remove('active');
          });
          btn.classList.add('active');
          this.particles.colorMode = v.mode;
          sound.playClick();
        });
      }
    });

    // 10. Hotspot Modal Dismiss
    const hotspotCard = document.getElementById('hotspot-card');
    const hotspotClose = document.getElementById('hotspot-close');
    if (hotspotClose && hotspotCard) {
      hotspotClose.addEventListener('click', () => {
        this._hideHotspotCard();
      });
    }

    // 11. Fullscreen HUD Toggle (Clean screenshot / showroom view)
    const btnHud = document.getElementById('btn-hud');
    if (btnHud) {
      btnHud.addEventListener('click', () => {
        document.body.classList.toggle('hud-hidden');
        sound.playClick();
      });
    }

    // 12. First-Class Collapsible Control Drawers (Left & Right)
    const panelLeft = document.getElementById('panel-left');
    const panelRight = document.getElementById('panel-right');
    const btnCollapseLeft = document.getElementById('btn-collapse-left');
    const btnExpandLeft = document.getElementById('btn-expand-left');
    const btnCollapseRight = document.getElementById('btn-collapse-right');
    const btnExpandRight = document.getElementById('btn-expand-right');
    const btnToggleDrawers = document.getElementById('btn-toggle-drawers');
    const drawerToggleText = document.getElementById('drawer-toggle-text');
    const drawerBackdrop = document.getElementById('drawer-backdrop');

    const updateBackdrop = () => {
      if (!drawerBackdrop) return;
      const isMobile = window.innerWidth <= 860;
      const leftOpen = panelLeft && !panelLeft.classList.contains('collapsed');
      const rightOpen = panelRight && !panelRight.classList.contains('collapsed');
      if (isMobile && (leftOpen || rightOpen)) {
        drawerBackdrop.classList.add('active');
      } else {
        drawerBackdrop.classList.remove('active');
      }
      if (btnToggleDrawers) {
        btnToggleDrawers.classList.toggle('collapsed', !leftOpen && !rightOpen);
        btnToggleDrawers.classList.toggle('active', leftOpen || rightOpen);
      }
      if (drawerToggleText) {
        drawerToggleText.textContent = (leftOpen || rightOpen) ? 'Drawers: Open' : 'Drawers: Closed';
      }
    };

    const collapseLeft = () => {
      if (panelLeft) panelLeft.classList.add('collapsed');
      if (btnExpandLeft) btnExpandLeft.classList.add('visible');
      updateBackdrop();
    };

    const expandLeft = () => {
      if (panelLeft) panelLeft.classList.remove('collapsed');
      if (btnExpandLeft) btnExpandLeft.classList.remove('visible');
      if (window.innerWidth <= 860) collapseRight();
      updateBackdrop();
      sound.playClick();
    };

    const collapseRight = () => {
      if (panelRight) panelRight.classList.add('collapsed');
      if (btnExpandRight) btnExpandRight.classList.add('visible');
      updateBackdrop();
    };

    const expandRight = () => {
      if (panelRight) panelRight.classList.remove('collapsed');
      if (btnExpandRight) btnExpandRight.classList.remove('visible');
      if (window.innerWidth <= 860) collapseLeft();
      updateBackdrop();
      sound.playClick();
    };

    const toggleBothDrawers = () => {
      const leftOpen = panelLeft && !panelLeft.classList.contains('collapsed');
      const rightOpen = panelRight && !panelRight.classList.contains('collapsed');
      if (leftOpen || rightOpen) {
        collapseLeft();
        collapseRight();
      } else {
        expandLeft();
        expandRight();
      }
      sound.playClick();
    };

    if (btnToggleDrawers) {
      btnToggleDrawers.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBothDrawers();
      });
    }

    if (btnCollapseLeft) {
      btnCollapseLeft.addEventListener('click', (e) => {
        e.stopPropagation();
        collapseLeft();
        sound.playClick();
      });
    }

    if (btnExpandLeft) {
      btnExpandLeft.addEventListener('click', (e) => {
        e.stopPropagation();
        expandLeft();
      });
    }

    if (btnCollapseRight) {
      btnCollapseRight.addEventListener('click', (e) => {
        e.stopPropagation();
        collapseRight();
        sound.playClick();
      });
    }

    if (btnExpandRight) {
      btnExpandRight.addEventListener('click', (e) => {
        e.stopPropagation();
        expandRight();
      });
    }

    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', () => {
        collapseLeft();
        collapseRight();
      });
    }

    // Hotkey 'C' on keyboard to toggle drawers on computer
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'c' || e.key === 'C') {
        toggleBothDrawers();
      }
    });

    // Default state: On mobile devices, start collapsed so the 3D car is 100% visible!
    if (window.innerWidth <= 860) {
      collapseLeft();
      collapseRight();
    } else {
      if (panelLeft) panelLeft.classList.remove('collapsed');
      if (panelRight) panelRight.classList.remove('collapsed');
      if (btnExpandLeft) btnExpandLeft.classList.remove('visible');
      if (btnExpandRight) btnExpandRight.classList.remove('visible');
      updateBackdrop();
    }

    // Handle screen resize dynamically
    window.addEventListener('resize', () => {
      updateBackdrop();
    });
  }

  _switchMode(mode) {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this._hideHotspotCard();
    sound.resume();
    sound.playModeChime();

    // Update mode titles on drawer header and edge tab
    const rightTitle = document.getElementById('right-panel-header-title');
    const edgeRightLabel = document.getElementById('edge-right-label');
    const btnExpandLeft = document.getElementById('btn-expand-left');
    const btnExpandRight = document.getElementById('btn-expand-right');
    const panelLeft = document.getElementById('panel-left');
    const panelRight = document.getElementById('panel-right');
    const drawerBackdrop = document.getElementById('drawer-backdrop');

    if (mode === 'studio') {
      if (rightTitle) rightTitle.textContent = 'Configurator';
      if (edgeRightLabel) edgeRightLabel.textContent = 'Configurator';
    } else if (mode === 'aero') {
      if (rightTitle) rightTitle.textContent = 'CFD Aero Lab';
      if (edgeRightLabel) edgeRightLabel.textContent = 'Aero Lab';
    } else if (mode === 'drive') {
      if (rightTitle) rightTitle.textContent = 'Highway Drive';
      if (edgeRightLabel) edgeRightLabel.textContent = 'Highway Drive';
      if (panelLeft) panelLeft.classList.add('collapsed');
      if (panelRight) panelRight.classList.add('collapsed');
      if (btnExpandLeft) btnExpandLeft.classList.remove('visible');
      if (btnExpandRight) btnExpandRight.classList.remove('visible');
      if (drawerBackdrop) drawerBackdrop.classList.remove('active');
    }

    if (mode !== 'drive') {
      if (panelLeft && panelLeft.classList.contains('collapsed') && btnExpandLeft) {
        btnExpandLeft.classList.add('visible');
      }
      if (panelRight && panelRight.classList.contains('collapsed') && btnExpandRight) {
        btnExpandRight.classList.add('visible');
      }
    }

    // Update active tab styles
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.getElementById(`tab-${mode}`);
    if (activeTab) activeTab.classList.add('active');

    // Update view panels
    document.getElementById('panel-configurator').style.display = mode === 'studio' ? 'block' : 'none';
    document.getElementById('panel-aero').style.display = mode === 'aero' ? 'block' : 'none';
    document.getElementById('panel-drive').style.display = mode === 'drive' ? 'block' : 'none';

    const driveHud = document.querySelector('.drive-hud');
    const bottomNav = document.querySelector('.bottom-nav');
    if (driveHud) driveHud.classList.toggle('active', mode === 'drive');
    if (bottomNav) bottomNav.style.display = mode === 'drive' ? 'none' : 'flex';

    // Show hotspots in studio mode, hide during dynamic drive
    this.car.setHotspotsVisible(mode === 'studio');

    // Update Environment & Particles
    this.environment.setMode(mode);
    this.particles.setActive(mode === 'aero');
    sound.setWindTunnelActive(mode === 'aero');

    if (mode === 'drive') {
      this.director.moveToPreset('rear');
      this.driveSpeed = 65;
      const throttleSlider = document.getElementById('throttle-slider');
      if (throttleSlider) throttleSlider.value = 65;
    } else {
      this.driveSpeed = 0;
      sound.stopMotor();
    }
    this._updateSpeedUI();
  }

  _updateSpeedUI() {
    sound.setDriveSpeed(this.driveSpeed);
    const speedVal = document.getElementById('speedometer-val');
    if (speedVal) speedVal.textContent = Math.round(this.driveSpeed);

    const rpmVal = document.getElementById('telemetry-rpm');
    if (rpmVal) rpmVal.textContent = Math.round(this.driveSpeed * 95);
  }

  _showHotspotCard(hotspot) {
    const card = document.getElementById('hotspot-card');
    const title = document.getElementById('hotspot-title');
    const desc = document.getElementById('hotspot-desc');
    if (!card || !title || !desc) return;

    title.textContent = hotspot.title;
    desc.textContent = hotspot.detail;
    card.classList.add('visible');
  }

  _hideHotspotCard() {
    const card = document.getElementById('hotspot-card');
    if (card) card.classList.remove('visible');
  }

  _captureSnapshot() {
    sound.playShutterSound();
    const uiElements = document.querySelectorAll('header, aside, .bottom-nav, .drive-hud, #hotspot-card');
    uiElements.forEach(el => { el.style.opacity = '0'; });

    requestAnimationFrame(() => {
      this.composer.render();
      const dataUrl = this.renderer.domElement.toDataURL('image/png');

      const link = document.createElement('a');
      link.download = `apex-vision-${this.currentMode}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      uiElements.forEach(el => { el.style.opacity = ''; });
    });
  }

  _setupEvents() {
    this.pointerDownPos = { x: 0, y: 0 };

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
      if (this.bloomPass) {
        this.bloomPass.setSize(window.innerWidth, window.innerHeight);
      }
    });

    // Keyboard Steering & Acceleration Controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.steeringInput = -1;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.steeringInput = 1;
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.isAccelerating = true;
        sound.resume();
      }
    });

    window.addEventListener('keyup', (e) => {
      if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && this.steeringInput < 0) {
        this.steeringInput = 0;
      } else if ((e.code === 'ArrowRight' || e.code === 'KeyD') && this.steeringInput > 0) {
        this.steeringInput = 0;
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.isAccelerating = false;
      }
    });

    // Track mouse for hotspot cursor pointer feedback
    window.addEventListener('pointermove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (this.currentMode === 'studio' && this.car.hotspotMeshes && !this.director.isTourActive) {
        if (!e.target.closest('header, aside, .bottom-nav, .drive-hud, #hotspot-card')) {
          this.raycaster.setFromCamera(this.mouse, this.camera);
          const intersects = this.raycaster.intersectObjects(this.car.hotspotMeshes);
          this.container.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
          return;
        }
      }
      this.container.style.cursor = 'default';
    });

    window.addEventListener('pointerdown', (e) => {
      sound.resume();
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    // Handle 3D Hotspot Inspection clicks on pointerup (avoiding camera drag conflicts)
    window.addEventListener('pointerup', (e) => {
      if (this.currentMode !== 'studio' || !this.car.hotspotMeshes || this.director.isTourActive) return;
      if (e.target.closest('header, aside, .bottom-nav, .drive-hud, #hotspot-card')) return;

      const distMoved = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (distMoved < 6) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.car.hotspotMeshes);
        if (intersects.length > 0) {
          const hitHotspot = intersects[0].object.userData.hotspot;
          if (hitHotspot) {
            this.director.presets.custom = {
              pos: hitHotspot.camPos,
              target: hitHotspot.camTarget,
            };
            this.director.moveToPreset('custom');
            this._showHotspotCard(hitHotspot);
            sound.playClick();
          }
        }
      }
    });
  }

  _animate() {
    requestAnimationFrame(this._animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Throttle Acceleration physics in Drive Mode
    if (this.currentMode === 'drive') {
      if (this.isAccelerating) {
        this.driveSpeed = Math.min(185, this.driveSpeed + delta * 60);
        this._updateSpeedUI();
      } else if (this.driveSpeed > 35) {
        this.driveSpeed = Math.max(35, this.driveSpeed - delta * 22);
        this._updateSpeedUI();
      }
    }

    // Dynamic Camera FOV Warp during high-speed drive (Hyperspace sensation)
    const targetFov = this.currentMode === 'drive' ? 42 + (this.driveSpeed / 185) * 14 : 42;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, delta * 3.0);
      this.camera.updateProjectionMatrix();
    }

    // Dynamic interactive steering & lateral physics (correct Left/Right direction)
    const targetSteer = this.steeringInput * 0.38;
    this.car.steeringAngle += (targetSteer - this.car.steeringAngle) * Math.min(1, delta * 9);

    if (this.currentMode === 'drive' && this.driveSpeed > 0) {
      const lateralSpeed = (this.driveSpeed / 45) * delta * 2.8;
      this.car.group.position.x = Math.max(-2.4, Math.min(2.4, this.car.group.position.x + this.car.steeringAngle * lateralSpeed));
      this.car.group.rotation.z = this.car.steeringAngle * 0.12;
    } else {
      this.car.group.position.x += (0 - this.car.group.position.x) * Math.min(1, delta * 4);
      this.car.group.rotation.z += (0 - this.car.group.rotation.z) * Math.min(1, delta * 4);
    }

    // Update Subsystems
    this.controls.update();
    this.car.update(delta, this.driveSpeed);
    this.particles.update(delta);
    this.environment.update(delta, this.driveSpeed);
    this.director.update(delta);

    // Post-processed Render
    this.composer.render();
  }
}

// Boot application safely when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.appInstance = new App();
  });
} else {
  window.appInstance = new App();
}
