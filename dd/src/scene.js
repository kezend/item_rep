import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { TypographyVariant, buildProjectedSVGFromVariants, buildExportGroupFromVariants } from "./renderers.js";
import { buildFallbackTypographyData, buildTypographyData } from "./typographyData.js";

function createBackgroundTexture(mode, seed) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 800;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.fillStyle = "#060606";
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (mode === "blocks") {
    const palette = ["#171717", "#222222", "#132118", "#231621", "#0f1824", "#28211a"];
    let value = Number(seed) || 2026;

    const random = () => {
      value |= 0;
      value = (value + 0x6d2b79f5) | 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const cols = 5;
    const rows = 4;
    const cellWidth = canvas.width / cols;
    const cellHeight = canvas.height / rows;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        context.fillStyle = palette[Math.floor(random() * palette.length)];
        context.fillRect(col * cellWidth, row * cellHeight, cellWidth + 1, cellHeight + 1);
      }
    }
  }

  context.strokeStyle = "rgba(255,255,255,0.04)";
  context.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += 80) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }

  for (let y = 0; y <= canvas.height; y += 80) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function hashSeed(seed) {
  const stringSeed = String(seed || "2026");
  let hash = 2166136261;

  for (let index = 0; index < stringSeed.length; index += 1) {
    hash ^= stringSeed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRandom(seed) {
  let value = hashSeed(seed);
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mixColor(base, target, amount) {
  return base.clone().lerp(target, amount);
}

function getAnimationProfile(preset, time, intro) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.0);
  const dissolve = 0.5 + 0.5 * Math.sin(time * 0.9);
  const glitch = Math.max(0, Math.sin(time * 13.5));

  switch (preset) {
    case "scan":
      return { assemble: intro, scatter: 1 - intro, pulse: 0, glitch: 0, rotationSpeed: 0.12 };
    case "glitch":
      return { assemble: 1, scatter: 0.03, pulse: 0.08, glitch: glitch * 0.75, rotationSpeed: 0.18 };
    case "dissolve":
      return { assemble: 1 - dissolve * 0.3, scatter: dissolve * 0.5, pulse: 0.1, glitch: 0.06, rotationSpeed: 0.1 };
    case "pulse":
      return { assemble: 1, scatter: 0.01, pulse, glitch: 0, rotationSpeed: 0.16 };
    case "slow":
    default:
      return { assemble: 1, scatter: 0, pulse: 0.06, glitch: 0, rotationSpeed: 0.12 };
  }
}

function buildVariantSettings(data, config) {
  const baseColor = new THREE.Color(config.glow.color);
  const paletteTargets = [
    new THREE.Color("#ffffff"),
    new THREE.Color("#f0f0f0"),
    new THREE.Color("#ffd9ec"),
    new THREE.Color("#8ec5ff"),
    new THREE.Color("#ffcf8b")
  ];

  const random = createRandom(config.variation.seed);
  const settings = [];
  const gridEnabled = config.variation.enabled;
  const rows = gridEnabled ? config.variation.rows : 1;
  const cols = gridEnabled ? config.variation.cols : 1;
  const spacingX = 5.4;
  const spacingY = 3.4;
  const startX = -((cols - 1) * spacingX) / 2;
  const startY = ((rows - 1) * spacingY) / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const targetColor = paletteTargets[Math.floor(random() * paletteTargets.length)];
      const amount = gridEnabled ? 0.2 + random() * 0.55 : 0;
      const color = gridEnabled ? mixColor(baseColor, targetColor, amount) : baseColor.clone();
      const position = gridEnabled
        ? new THREE.Vector3(
            startX + col * spacingX + (random() - 0.5) * 0.6,
            startY - row * spacingY + (random() - 0.5) * 0.4,
            (random() - 0.5) * 1.5
          )
        : new THREE.Vector3(0, 0, 0);

      settings.push({
        color,
        position,
        rotation: new THREE.Euler(
          gridEnabled ? (random() - 0.5) * 0.6 : -0.08,
          gridEnabled ? (random() - 0.5) * 1.2 : 0,
          gridEnabled ? (random() - 0.5) * 0.6 : 0
        ),
        scale: gridEnabled ? 0.8 + random() * 0.4 : 1,
        distortions: {
          bendX: (0.35 + random() * 1.35) * (random() > 0.5 ? 1 : -1),
          bendY: (0.25 + random() * 1.15) * (random() > 0.5 ? 1 : -1),
          bendZ: (0.2 + random() * 1.0) * (random() > 0.5 ? 1 : -1),
          twistX: (0.3 + random() * 1.1) * (random() > 0.5 ? 1 : -1),
          twistY: (0.4 + random() * 1.3) * (random() > 0.5 ? 1 : -1),
          twistZ: (0.28 + random() * 1.08) * (random() > 0.5 ? 1 : -1),
          waveX: 0.25 + random() * 1.2,
          waveY: 0.25 + random() * 1.2,
          waveZ: 0.2 + random() * 1.0,
          noiseLow: 0.35 + random() * 1.0,
          noiseHigh: 0.4 + random() * 1.25,
          axisScale: new THREE.Vector3(
            (random() - 0.5) * 1.2,
            (random() - 0.5) * 1.3,
            (random() - 0.5) * 1.4
          ),
          shear: {
            xy: (random() - 0.5) * 0.9,
            xz: (random() - 0.5) * 1.1,
            yx: (random() - 0.5) * 0.8,
            yz: (random() - 0.5) * 1.0,
            zx: (random() - 0.5) * 0.9,
            zy: (random() - 0.5) * 0.8
          },
          rotationField: new THREE.Vector3(
            (0.15 + random() * 1.0) * (random() > 0.5 ? 1 : -1),
            (0.18 + random() * 1.1) * (random() > 0.5 ? 1 : -1),
            (0.15 + random() * 0.95) * (random() > 0.5 ? 1 : -1)
          ),
          axisPriority: new THREE.Vector3(
            0.4 + random() * 1.4,
            0.4 + random() * 1.4,
            0.4 + random() * 1.4
          )
        },
        outlineLayers: [
          {
            color: color.clone(),
            offset: new THREE.Vector3(0, 0, 0),
            scale: 1,
            opacity: 0.96
          },
          {
            color: mixColor(color, new THREE.Color("#ffffff"), 0.08),
            offset: new THREE.Vector3((random() - 0.5) * 0.06, (random() - 0.5) * 0.06, (random() - 0.5) * 0.08),
            scale: 1.012 + random() * 0.02,
            opacity: 0.3 + random() * 0.12
          },
          {
            color: mixColor(color, new THREE.Color("#000000"), 0.18),
            offset: new THREE.Vector3((random() - 0.5) * 0.1, (random() - 0.5) * 0.1, (random() - 0.5) * 0.12),
            scale: 0.988 - random() * 0.02,
            opacity: 0.12 + random() * 0.08
          }
        ],
        revealOffset: random() * 0.28
      });
    }
  }

  if (settings.length === 0) {
    settings.push({
      color: baseColor.clone(),
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(-0.08, 0, 0),
      scale: 1,
      distortions: {
        bendX: 1,
        bendY: 0.75,
        bendZ: 0.6,
        twistX: 0.7,
        twistY: 1,
        twistZ: 0.55,
        waveX: 1,
        waveY: 0.8,
        waveZ: 0.7,
        noiseLow: 0.7,
        noiseHigh: 0.6,
        axisScale: new THREE.Vector3(0.12, -0.08, 0.16),
        shear: { xy: 0.08, xz: -0.1, yx: 0.04, yz: 0.06, zx: -0.08, zy: 0.02 },
        rotationField: new THREE.Vector3(0.18, -0.12, 0.14),
        axisPriority: new THREE.Vector3(1, 1, 1)
      },
      outlineLayers: [
        {
          color: baseColor.clone(),
          offset: new THREE.Vector3(0, 0, 0),
          scale: 1,
          opacity: 0.96
        },
        {
          color: mixColor(baseColor, new THREE.Color("#ffffff"), 0.08),
          offset: new THREE.Vector3(0.04, 0.02, 0.05),
          scale: 1.016,
          opacity: 0.28
        },
        {
          color: mixColor(baseColor, new THREE.Color("#000000"), 0.18),
          offset: new THREE.Vector3(-0.06, -0.03, 0.08),
          scale: 0.986,
          opacity: 0.14
        }
      ],
      revealOffset: 0
    });
  }

  return settings;
}

export class TypographyStudio {
  constructor({ canvas, stage }) {
    this.canvas = canvas;
    this.stage = stage;
    this.clock = new THREE.Clock();
    this.config = null;
    this.introStart = 0;
    this.autoMotionPaused = false;
    this.motionPauseStartedAt = null;
    this.motionPauseOffset = 0;
    this.motionPausedAt = 0;
    this.typographyData = buildFallbackTypographyData("TEST");
    this.variants = [];
    this.pointImageTextures = [];
    this.brandMainTextures = [];
    this.brandOrbitTextures = [];
    this.pointer = new THREE.Vector2(2, 2);
    this.raycaster = new THREE.Raycaster();
    this.interactionMode = "none";
    this.stepMode = "none";
    this.cinematicMode = false;
    this.brandMode = false;
    this.editorialMode = false;
    this.cameraDramaFocus = null;
    this.isDirectManipulating = false;
    this.isBrandDragging = false;
    this.chaosBurst = 0;
    this.handControl = {
      enabled: false,
      pinch: 0,
      rotationX: 0,
      rotationY: 0,
      handsDetected: 0,
      variationIntensity: 1,
      baseVariationIntensity: 1,
      mode: "system",
      brandVariation: 0,
      brandSwitchX: 0,
      brandNextPulse: 0
    };
    this.handScaleTarget = new THREE.Vector3(1, 1, 1);
    this.onEditorialLayoutChange = null;
    this.onEditorialBackdropChange = null;
    this.capturedPointerId = null;
    this.userCameraOverride = false;
    this.isApplyingCameraFit = false;
    this.hasAutoFramedCamera = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#050505");
    this.scene.layers.enable(1);
    this.scene.layers.enable(2);

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
    this.camera.position.set(0.8, 0.2, 8.6);
    this.camera.layers.enable(1);
    this.camera.layers.enable(2);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor("#050505", 1);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.03;
    this.controls.maxDistance = 120;
    this.controls.rotateSpeed = 0.72;
    this.controls.zoomSpeed = 1.4;
    this.controls.target.set(0, 0, 0);
    this.controls.addEventListener("end", () => {
      if (!this.isApplyingCameraFit) {
        this.userCameraOverride = true;
      }
    });

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.15, 0.6, 0.18);
    this.composer.addPass(this.bloomPass);

    this.world = new THREE.Group();
    this.backgroundGroup = new THREE.Group();
    this.variantGroup = new THREE.Group();
    this.axisGuideGroup = new THREE.Group();
    this.axisVisualizationGroup = new THREE.Group();
    this.world.layers.enable(1);
    this.world.layers.enable(2);
    this.variantGroup.layers.enable(1);
    this.variantGroup.layers.enable(2);
    this.scene.add(this.backgroundGroup);
    this.scene.add(this.world);
    this.world.add(this.variantGroup);
    this.world.add(this.axisGuideGroup);
    this.world.add(this.axisVisualizationGroup);

    this.backgroundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 24),
      new THREE.MeshBasicMaterial({
        color: "#050505",
        transparent: true,
        opacity: 1
      })
    );
    this.backgroundPlane.position.z = -10;
    this.backgroundGroup.add(this.backgroundPlane);

    this.editorialBackdropCanvas = document.createElement("canvas");
    this.editorialBackdropContext2D = this.editorialBackdropCanvas.getContext("2d");
    this.editorialBackdropTexture = new THREE.CanvasTexture(this.editorialBackdropCanvas);
    this.editorialBackdropTexture.colorSpace = THREE.SRGBColorSpace;
    this.editorialBackdropTexture.minFilter = THREE.LinearFilter;
    this.editorialBackdropTexture.magFilter = THREE.LinearFilter;
    this.editorialBackdropTexture.generateMipmaps = false;
    this.editorialBackdropActive = false;
    this.editorialBackdropContext = "standalone";
    this.editorialBackdropOffset = new THREE.Vector3();
    this.editorialBackdropDrag = null;
    this.editorialBackdropMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: this.editorialBackdropTexture,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        depthTest: false,
        toneMapped: false
      })
    );
    this.editorialBackdropMesh.visible = false;
    this.editorialBackdropMesh.renderOrder = 1;
    this.editorialBackdropMesh.layers.set(1);
    this.camera.add(this.editorialBackdropMesh);

    const axisMaterial = new THREE.LineBasicMaterial({
      color: "#8a8a8a",
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });
    const axisPositions = new Float32Array([
      -2.8, 0, 0, 2.8, 0, 0,
      0, -2.3, 0, 0, 2.3, 0,
      0, 0, -2.8, 0, 0, 2.8
    ]);
    const axisGeometry = new THREE.BufferGeometry();
    axisGeometry.setAttribute("position", new THREE.BufferAttribute(axisPositions, 3));
    this.axisLines = new THREE.LineSegments(axisGeometry, axisMaterial);
    this.axisGuideGroup.add(this.axisLines);

    this.axisGrid = new THREE.GridHelper(6, 12, "#3e3e3e", "#262626");
    this.axisGrid.rotation.x = Math.PI / 2;
    this.axisGrid.material.transparent = true;
    this.axisGrid.material.opacity = 0.16;
    this.axisGuideGroup.add(this.axisGrid);
    this.axisGuideGroup.visible = false;

    const axisVizConfigs = [
      { color: "#ff4d5a", points: [-3.2, 0, 0, 3.2, 0, 0] },
      { color: "#45d16a", points: [0, -2.7, 0, 0, 2.7, 0] },
      { color: "#4f7cff", points: [0, 0, -3.2, 0, 0, 3.2] }
    ];

    for (const config of axisVizConfigs) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(config.points, 3));
      this.axisVisualizationGroup.add(
        new THREE.LineSegments(
          geometry,
          new THREE.LineBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
          })
        )
      );
    }

    this.axisPlaneXY = new THREE.GridHelper(6, 12, "#6a6a6a", "#252525");
    this.axisPlaneXY.material.transparent = true;
    this.axisPlaneXY.material.opacity = 0.14;
    this.axisVisualizationGroup.add(this.axisPlaneXY);

    this.axisPlaneXZ = new THREE.GridHelper(6, 12, "#6a6a6a", "#252525");
    this.axisPlaneXZ.rotation.x = Math.PI / 2;
    this.axisPlaneXZ.material.transparent = true;
    this.axisPlaneXZ.material.opacity = 0.1;
    this.axisVisualizationGroup.add(this.axisPlaneXZ);

    this.axisPlaneYZ = new THREE.GridHelper(6, 12, "#6a6a6a", "#252525");
    this.axisPlaneYZ.rotation.z = Math.PI / 2;
    this.axisPlaneYZ.material.transparent = true;
    this.axisPlaneYZ.material.opacity = 0.08;
    this.axisVisualizationGroup.add(this.axisPlaneYZ);
    this.axisVisualizationGroup.visible = false;

    this.scene.add(new THREE.AmbientLight("#ffffff", 0.55));
    const keyLight = new THREE.DirectionalLight("#ffffff", 0.9);
    keyLight.position.set(6, 8, 10);
    this.scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight("#77ffba", 0.3);
    rimLight.position.set(-6, -2, -5);
    this.scene.add(rimLight);

    this.fallbackMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.1, 0.45),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        wireframe: true,
        transparent: true,
        opacity: 0.35
      })
    );
    this.fallbackMesh.visible = false;
    this.variantGroup.add(this.fallbackMesh);

    this.bindEvents();
    this.resize();
  }

  bindEvents() {
    window.addEventListener("resize", () => this.resize());
    this.canvas.addEventListener("pointermove", (event) => {
      const bounds = this.canvas.getBoundingClientRect();
      this.pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -(((event.clientY - bounds.top) / bounds.height) * 2 - 1)
      );
      this.raycaster.setFromCamera(this.pointer, this.camera);

      if (this.stepMode === "direct-manipulation") {
        for (const variant of this.variants) {
          const handled = variant.handleLetterPointerMove?.(this.raycaster, this.camera, this.pointer, {
            shiftKey: event.shiftKey,
            altKey: event.altKey
          });

          if (handled) {
            this.isDirectManipulating = true;
          }
        }

        this.controls.enabled = !this.isDirectManipulating;
        if (this.isDirectManipulating) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (this.editorialMode) {
        const editorialContext = this.config?.editorial?.context || "standalone";
        this.isBrandDragging = false;

        for (const variant of this.variants) {
          const handled = variant.handleEditorialPointerMove?.(this.raycaster, this.camera, this.pointer, {
            shiftKey: event.shiftKey,
            altKey: event.altKey
          });

          if (handled) {
            this.isBrandDragging = true;
          }
        }

        this.controls.enabled = !this.isBrandDragging;
        if (this.isBrandDragging) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (editorialContext === "brand" && this.brandMode) {
          for (const variant of this.variants) {
            const handled = variant.handleBrandPointerMove?.(this.raycaster, this.camera, this.pointer);

            if (handled) {
              this.isBrandDragging = true;
            }
          }

          this.controls.enabled = !this.isBrandDragging;
          if (this.isBrandDragging) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }
        return;
      }

      if (this.brandMode) {
        this.isBrandDragging = false;

        for (const variant of this.variants) {
          const handled = variant.handleBrandPointerMove?.(this.raycaster, this.camera, this.pointer);

          if (handled) {
            this.isBrandDragging = true;
          }
        }

        this.controls.enabled = !this.isBrandDragging;
        if (this.isBrandDragging) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }, true);
    this.canvas.addEventListener("pointerleave", () => {
      this.pointer.set(2, 2);
    });
    this.canvas.addEventListener("pointerdown", (event) => {
      if (this.stepMode === "snapshot") {
        return;
      }

      if (this.stepMode === "direct-manipulation") {
        this.isDirectManipulating = false;
        this.raycaster.setFromCamera(this.pointer, this.camera);

        let activeVariant = null;

        for (const variant of this.variants) {
          const handled = variant.handleLetterPointerDown?.(this.raycaster, this.camera, {
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey
          });

          if (handled) {
            this.isDirectManipulating = true;
            activeVariant = variant;
            break;
          }
        }

        if (activeVariant) {
          for (const variant of this.variants) {
            if (variant !== activeVariant) {
              variant.clearLetterSelection?.();
            }
          }
        } else {
          for (const variant of this.variants) {
            variant.clearLetterSelection?.();
          }
        }

        this.controls.enabled = !this.isDirectManipulating;
        if (this.isDirectManipulating) {
          this.capturedPointerId = event.pointerId;
          this.canvas.setPointerCapture?.(event.pointerId);
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (this.stepMode === "axis-visualization") {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        let activeVariant = null;

        for (const variant of this.variants) {
          const handled = variant.handleLetterSelect?.(this.raycaster);

          if (handled) {
            activeVariant = variant;
            break;
          }
        }

        for (const variant of this.variants) {
          if (variant !== activeVariant) {
            variant.clearLetterSelection?.();
          }
        }
        return;
      }

      if (this.stepMode === "camera-drama") {
        let handled = false;

        for (const variant of this.variants) {
          if (variant.handleCameraDramaClick?.()) {
            handled = true;
          }
        }

        if (!handled) {
          this.cameraDramaFocus = null;
        }

        return;
      }

      if (this.stepMode === "media-space") {
        let handled = false;

        for (const variant of this.variants) {
          if (variant.handleMediaSpaceClick?.()) {
            handled = true;
          }
        }

        if (!handled) {
          this.cameraDramaFocus = null;
        }

        return;
      }

      if (this.brandMode && !this.editorialMode) {
        this.isBrandDragging = false;
        this.raycaster.setFromCamera(this.pointer, this.camera);

        for (const variant of this.variants) {
          const handled = variant.handleBrandPointerDown?.(this.raycaster, this.camera);

          if (handled) {
            this.isBrandDragging = true;
            break;
          }
        }

        if (this.isBrandDragging) {
          this.controls.enabled = false;
          this.capturedPointerId = event.pointerId;
          this.canvas.setPointerCapture?.(event.pointerId);
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        let handled = false;

        for (const variant of this.variants) {
          if (variant.handleBrandClick?.()) {
            handled = true;
          }
        }

        if (!handled) {
          this.cameraDramaFocus = null;
        }

        return;
      }

      if (this.editorialMode) {
        const editorialContext = this.config?.editorial?.context || "standalone";
        this.isBrandDragging = false;
        this.raycaster.setFromCamera(this.pointer, this.camera);

        for (const variant of this.variants) {
          const handled = variant.handleEditorialPointerDown?.(this.raycaster, this.camera, this.pointer, {
            shiftKey: event.shiftKey,
            altKey: event.altKey
          });

          if (handled) {
            this.isBrandDragging = true;
            break;
          }
        }

        if (this.isBrandDragging) {
          this.controls.enabled = false;
          this.capturedPointerId = event.pointerId;
          this.canvas.setPointerCapture?.(event.pointerId);
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        for (const variant of this.variants) {
          variant.handleEditorialClick?.();
        }

        if (editorialContext === "brand" && this.brandMode) {
          for (const variant of this.variants) {
            const handled = variant.handleBrandPointerDown?.(this.raycaster, this.camera);

            if (handled) {
              this.isBrandDragging = true;
              break;
            }
          }

          if (this.isBrandDragging) {
            this.controls.enabled = false;
            this.capturedPointerId = event.pointerId;
            this.canvas.setPointerCapture?.(event.pointerId);
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          let handled = false;

          for (const variant of this.variants) {
            if (variant.handleBrandClick?.()) {
              handled = true;
            }
          }

          if (!handled) {
            this.cameraDramaFocus = null;
          }
        }

        return;
      }

      if (this.cinematicMode || this.stepMode === "cinematic-export") {
        let handled = false;

        for (const variant of this.variants) {
          if (variant.handleMediaSpaceClick?.()) {
            handled = true;
          }
        }

        if (!handled) {
          this.cameraDramaFocus = null;
        }

        return;
      }

      if (this.stepMode === "curation") {
        for (const variant of this.variants) {
          variant.handleCurationClick?.();
        }
        return;
      }

      if (this.interactionMode === "chaos") {
        this.chaosBurst = 1;
        return;
      }

      for (const variant of this.variants) {
        variant.handleContentClick?.();
      }
    }, true);

    window.addEventListener("pointerup", () => {
      const hadEditorialDrag = this.variants.some((variant) => Boolean(variant.editorialDrag));

      if (this.isDirectManipulating) {
        for (const variant of this.variants) {
          variant.handleLetterPointerUp?.();
        }
      }

      if (this.isBrandDragging) {
        for (const variant of this.variants) {
          variant.handleEditorialPointerUp?.();
          variant.handleBrandPointerUp?.();
        }
      }

      this.isDirectManipulating = false;
      this.isBrandDragging = false;
      this.controls.enabled = true;
      if (this.capturedPointerId != null) {
        try {
          this.canvas.releasePointerCapture?.(this.capturedPointerId);
        } catch {}
        this.capturedPointerId = null;
      }

      if (hadEditorialDrag) {
        this.onEditorialLayoutChange?.(this.getEditorialLayoutState());
      }
    });

    window.addEventListener("keydown", (event) => {
      if (this.stepMode !== "direct-manipulation") {
        return;
      }

      let handled = false;

      for (const variant of this.variants) {
        handled = variant.handleLetterKey?.(event) || handled;
      }

      if (handled) {
        event.preventDefault();
      }
    });
  }

  resize() {
    const width = this.stage.clientWidth || window.innerWidth || 1;
    const height = this.stage.clientHeight || window.innerHeight || 1;

    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);

    for (const variant of this.variants) {
      variant.setResolution(width, height);
    }

    this.updateEditorialBackdropFrame();
  }

  updateEditorialBackdropFrame() {
    const distance = 2.4;
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * distance;
    const visibleWidth = visibleHeight * this.camera.aspect;
    this.editorialBackdropMesh.position.set(
      this.editorialBackdropOffset.x,
      this.editorialBackdropOffset.y,
      -distance + this.editorialBackdropOffset.z
    );
    this.editorialBackdropMesh.scale.set(visibleWidth, visibleHeight, 1);
  }

  async rebuildTypography(typographyConfig, config) {
    this.config = config;

    try {
      this.typographyData = await buildTypographyData(typographyConfig);
    } catch (error) {
      console.warn("Typography build failed, using fallback.", error);
      this.typographyData = buildFallbackTypographyData(typographyConfig.text || "TEST");
    }

    this.introStart = this.getMotionTime(this.clock.getElapsedTime());
    this.rebuildLayout();
    this.applyConfig(config, {
      rebuildBackground: true,
      forceFitCamera: true,
      clearUserCameraOverride: true
    });
  }

  rebuildLayout() {
    const width = this.stage.clientWidth || window.innerWidth || 1;
    const height = this.stage.clientHeight || window.innerHeight || 1;

    for (const variant of this.variants) {
      variant.dispose();
      this.variantGroup.remove(variant.group);
    }

    this.variants = [];

    if (!this.config) {
      return;
    }

    const settings = buildVariantSettings(this.typographyData, this.config);

    for (const setting of settings) {
      const variant = new TypographyVariant(
        this.typographyData,
        setting,
        width,
        height,
        this.pointImageTextures,
        this.config.content
      );
      variant.group.layers.enable(1);
      variant.group.layers.enable(2);
      variant.setBrandAssets?.({
        mainTextures: this.brandMainTextures,
        orbitTextures: this.brandOrbitTextures
      });
      this.variantGroup.add(variant.group);
      this.variants.push(variant);
    }

    this.fallbackMesh.visible = this.variants.length === 0;
    this.updateCinematicVariantVisibility();
  }

  updateCinematicVariantVisibility() {
    if (!this.variants.length) {
      return;
    }

    const isolateSingleVariant = this.cinematicMode || this.brandMode;

    if (!isolateSingleVariant) {
      for (const variant of this.variants) {
        variant.group.visible = true;
      }
      return;
    }

    let focusIndex = 0;
    let smallestDistance = Infinity;

    for (let index = 0; index < this.variants.length; index += 1) {
      const distance = this.variants[index].group.position.lengthSq();

      if (distance < smallestDistance) {
        smallestDistance = distance;
        focusIndex = index;
      }
    }

    for (let index = 0; index < this.variants.length; index += 1) {
      this.variants[index].group.visible = index === focusIndex;
    }
  }

  getEditorialHostVariantIndex() {
    if (!this.variants.length) {
      return -1;
    }

    let focusIndex = 0;
    let smallestDistance = Infinity;

    for (let index = 0; index < this.variants.length; index += 1) {
      const distance = this.variants[index].group.position.lengthSq();

      if (distance < smallestDistance) {
        smallestDistance = distance;
        focusIndex = index;
      }
    }

    return focusIndex;
  }

  updateBackground() {
    const transparent = Boolean(this.config.transparentBackground);
    const color = this.config.backgroundColor || "#050505";
    this.scene.background = transparent ? null : new THREE.Color(color);
    this.renderer.setClearColor(color, transparent ? 0 : 1);
    this.backgroundPlane.visible = !transparent;
    this.backgroundPlane.material.color.set(color);
    this.stage.style.background = transparent ? "transparent" : color;

    if (transparent) {
      return;
    }

    const texture = createBackgroundTexture(this.config.variation.backgroundMode, this.config.variation.seed);

    if (this.backgroundPlane.material.map) {
      this.backgroundPlane.material.map.dispose();
    }

    this.backgroundPlane.material.map = texture;
    this.backgroundPlane.material.needsUpdate = true;
  }

  applyGlow() {
    const editorialGlowEnabled = this.editorialMode
      ? Boolean(this.config.editorial?.glowEnabled ?? true)
      : true;
    const brandGlowEnabled = this.brandMode
      ? Boolean(this.config.brand?.glowEnabled ?? true)
      : true;
    const effectiveGlowEnabled = Boolean(
      this.config.glow.enabled
      && editorialGlowEnabled
      && brandGlowEnabled
    );

    if (!effectiveGlowEnabled || this.config.renderMode === "outline") {
      this.bloomPass.threshold = 1;
      this.bloomPass.strength = 0;
      this.bloomPass.radius = 0;
      return;
    }

    this.bloomPass.threshold = 0.08;
    this.bloomPass.strength = this.config.glow.intensity;
    this.bloomPass.radius = 0.58;
  }

  fitCamera(options = {}) {
    const bounds = this.typographyData.bounds || { width: 4, height: 1.4, depth: 0.6 };
    const baseDistance = Math.max(this.config.camera.distance, bounds.width * 1.45, bounds.height * 2.2, 6);
    const preset = this.config.camera.preset;

    if (options.clearUserOverride) {
      this.userCameraOverride = false;
    }

    this.isApplyingCameraFit = true;
    this.camera.fov = this.config.camera.fov;
    this.camera.updateProjectionMatrix();

    if (preset === "front") {
      this.camera.position.set(0, 0, baseDistance);
    } else if (preset === "top") {
      this.camera.position.set(0.001, baseDistance, 0.001);
    } else if (preset === "editorial") {
      this.camera.position.set(baseDistance * 0.5, baseDistance * 0.16, baseDistance * 0.92);
    } else {
      this.camera.position.set(baseDistance * 0.18, baseDistance * 0.08, baseDistance);
    }

    this.controls.target.set(0, 0, 0);
    this.updateControlZoomLimits(baseDistance);
    this.controls.update();
    this.hasAutoFramedCamera = true;
    this.isApplyingCameraFit = false;
  }

  updateControlZoomLimits(baseDistanceInput = null) {
    const bounds = this.typographyData.bounds || { width: 4, height: 1.4, depth: 0.6 };
    const baseDistance = Number.isFinite(baseDistanceInput)
      ? baseDistanceInput
      : Math.max(this.config?.camera?.distance || 6, bounds.width * 1.45, bounds.height * 2.2, 6);
    const smallestDimension = Math.max(0.08, Math.min(
      bounds.width || 4,
      bounds.height || 1.4,
      Math.max(bounds.depth || 0.6, 0.08)
    ));
    const tinyObjectBoost = smallestDimension < 1
      ? THREE.MathUtils.mapLinear(smallestDimension, 0.08, 1, 0.22, 1)
      : 1;
    const minFactor = this.editorialMode ? 0.0025 : 0.01;
    this.controls.minDistance = Math.max(0.01, baseDistance * minFactor * tinyObjectBoost);
    this.controls.maxDistance = Math.max(48, baseDistance * 8);
    this.controls.zoomSpeed = this.editorialMode ? 1.8 : 1.55;
  }

  applyConfig(config, options = {}) {
    this.config = config;
    this.interactionMode = config.interactionMode || "none";
    this.stepMode = config.stepMode || "none";
    this.setAutoMotionPaused(config.autoMotionPaused);
    this.cinematicMode = Boolean(config.cinematic?.enabled);
    const editorialContext = config.editorial?.context || "standalone";
    const editorialUsesBrand = Boolean(config.editorial?.enabled && editorialContext === "brand");
    this.brandMode = Boolean(config.brand?.enabled || editorialUsesBrand);
    this.editorialMode = Boolean(config.editorial?.enabled);

    if (options.rebuildLayout) {
      this.rebuildLayout();
    }

    if (options.rebuildBackground) {
      this.updateBackground();
    }

    this.applyGlow();
    this.updateControlZoomLimits();
    if (options.clearUserCameraOverride) {
      this.userCameraOverride = false;
    }

    if (options.forceFitCamera || !this.hasAutoFramedCamera) {
      this.fitCamera({ clearUserOverride: options.clearUserCameraOverride });
    }
    this.axisGuideGroup.visible = Boolean(config.axisStep?.enabled && config.axisStep?.guides);
    this.axisVisualizationGroup.visible = this.stepMode === "axis-visualization";
    this.updateCinematicVariantVisibility();

    const effectiveBrandConfig = editorialUsesBrand
      ? {
          ...(config.brand || {}),
          enabled: true
        }
      : (config.brand || { enabled: this.brandMode });
    const whitePointsGlowOnly = Boolean(
      config.glow?.basePointsOnly
      && !this.cinematicMode
      && !effectiveBrandConfig.enabled
      && !this.editorialMode
    );
    const editorialHostIndex = this.getEditorialHostVariantIndex();
    const editorialConfigForVariant = {
      ...(config.editorial || { enabled: this.editorialMode }),
      backdropCaptured: false
    };
    this.editorialBackdropOffset.set(0, 0, 0);

    for (let index = 0; index < this.variants.length; index += 1) {
      const variant = this.variants[index];
      const editorialEnabledForVariant = Boolean(editorialConfigForVariant.enabled && index === editorialHostIndex);
      variant.setStepMode?.(this.stepMode);
      variant.setCinematicMode?.(config.cinematic || { enabled: this.cinematicMode, showPoints: false });
      variant.setBrandMode?.(effectiveBrandConfig);
      variant.setEditorialMode?.({
        ...editorialConfigForVariant,
        enabled: editorialEnabledForVariant
      });
      variant.setSystemEditorialOverlay?.({
        ...(config.systemEditorialOverlay || { enabled: false }),
        enabled: Boolean(config.systemEditorialOverlay?.enabled && index === editorialHostIndex)
      });
      variant.setBrandAssets?.({
        mainTextures: this.brandMainTextures,
        orbitTextures: this.brandOrbitTextures
      });
      variant.setMode(config.renderMode);
      variant.setContentDisplay?.({
        enabled: Boolean(config.content?.onlyMode),
        type: config.content?.onlyType || "mixed"
      });
      variant.setAppearance({
        strokeWidth: config.strokeWidth,
        opacity: 1,
        glowEnabled: config.glow.enabled,
        glowBasePointsOnly: whitePointsGlowOnly,
        pointSize: config.pointAppearance?.size,
        pointOpacity: config.pointAppearance?.opacity,
        pointColorMode: config.pointAppearance?.colorMode,
        pointColorA: config.pointAppearance?.colorA,
        pointColorB: config.pointAppearance?.colorB
      });
    }

    this.editorialBackdropMesh.visible = false;
    this.updateEditorialBackdropFrame();
  }

  buildRuntime(time = this.clock.getElapsedTime()) {
    const intro = Math.min(Math.max(0, time - this.introStart) / 1.4, 1);
    const handSpread = this.handControl.enabled ? this.handControl.pinch : 0;
    const distortionBoost = 1 + Math.max(0, handSpread) * 1.4;
    const variationIntensityMultiplier = this.handControl.enabled
      ? THREE.MathUtils.clamp(this.handControl.variationIntensity ?? this.config.variation.intensity ?? 0, 0, 1.5)
      : THREE.MathUtils.clamp(this.config.variation.intensity ?? 0, 0, 1.5);

    return {
      time,
      intro,
      globalDistortion: {
        ...this.config.distortion,
        bend: (this.config.distortion.bend ?? 0) * distortionBoost,
        twist: (this.config.distortion.twist ?? 0) * distortionBoost,
        wave: (this.config.distortion.wave ?? 0) * distortionBoost,
        noise: (this.config.distortion.noise ?? 0) * distortionBoost
      },
      animation: getAnimationProfile(this.config.animation.preset, time, intro),
      interactionMode: this.interactionMode,
      stepMode: this.stepMode,
      stepSettings: this.config.stepSettings || {
        filterKind: "all",
        boundaryShape: "box",
        fieldShape: "plane",
        trailLength: 7,
        mediaSpacePreset: "depth-field",
        hoverProximityStrength: 0.75,
        cinematicDepthSpeed: 0.6,
        cinematicDirection: "forward"
      },
      chaosBurst: this.chaosBurst,
      axisStep: this.config.axisStep || { enabled: false, guides: false },
      handControl: this.handControl,
      brand: {
        enabled: false,
        orbitSpeed: 0.62,
        orbitRadius: 1.9,
        orbitRandomness: 0.28,
        ...(this.config.brand || {}),
        exportRatio: this.config.export?.ratio || this.config.brand?.exportRatio || "current"
      },
      editorial: this.config.editorial || { enabled: false },
      systemEditorialOverlay: this.config.systemEditorialOverlay || { enabled: false },
      variationIntensityMultiplier,
      expansionRandomness: THREE.MathUtils.clamp(
        this.brandMode && this.handControl.mode === "brand"
          ? Math.max(this.config.brand?.orbitRandomness ?? 0, this.handControl.brandVariation ?? 0)
          : this.config.cinematic?.enabled
            ? this.config.cinematic.expansionRandomness
            : this.config.expansionRandomness ?? 0,
        0,
        1
      ),
      cinematic: this.config.cinematic || {
        enabled: false,
        layoutPreset: "depth-field",
        showPoints: false,
        hoverProximityStrength: 0.9,
        depthSpeed: 0.6,
        direction: "forward"
      }
    };
  }

  updateCameraDrama(runtime) {
    if (this.userCameraOverride) {
      this.cameraDramaFocus = null;
      return;
    }

    if (!this.cinematicMode && !this.brandMode && this.stepMode !== "camera-drama" && this.stepMode !== "media-space" && this.stepMode !== "cinematic-export") {
      this.cameraDramaFocus = null;
      return;
    }

    const focusWorld = new THREE.Vector3();
    let found = false;

    for (const variant of this.variants) {
      if (variant.getStepFocusTarget?.(focusWorld)) {
        found = true;
        break;
      }
    }

    if (!found && !this.cameraDramaFocus) {
      return;
    }

    if (found) {
      if (!this.cameraDramaFocus) {
        this.cameraDramaFocus = {
          target: focusWorld.clone(),
          distance: this.camera.position.distanceTo(this.controls.target)
        };
      } else {
        this.cameraDramaFocus.target.lerp(focusWorld, 0.14);
      }
    }

    const focusTarget = this.cameraDramaFocus?.target || new THREE.Vector3();
    const brandCameraActive = Boolean(this.brandMode && runtime.brand?.enabled);
    const brandPreset = runtime.brand?.cameraPreset || "medium";
    const brandDrift = runtime.brand?.slowCameraDrift ?? 0.18;
    const brandParallax = runtime.brand?.parallaxStrength ?? 0.35;
    let baseDirection;
    let desiredDistance;
    let parallax;

    if (brandCameraActive) {
      if (brandPreset === "close-up") {
        baseDirection = new THREE.Vector3(0.12, 0.04, 1).normalize();
        desiredDistance = found ? 2.45 : 3.2;
      } else if (brandPreset === "wide-orbit") {
        baseDirection = new THREE.Vector3(0.32, 0.12, 1).normalize();
        desiredDistance = found ? 4.4 : 5.1;
      } else if (brandPreset === "low-angle") {
        baseDirection = new THREE.Vector3(0.14, -0.2, 1).normalize();
        desiredDistance = found ? 3.25 : 4;
      } else if (brandPreset === "top-angle") {
        baseDirection = new THREE.Vector3(0.04, 0.9, 0.42).normalize();
        desiredDistance = found ? 4.1 : 4.8;
      } else if (brandPreset === "editorial-oblique") {
        baseDirection = new THREE.Vector3(0.46, 0.08, 1).normalize();
        desiredDistance = found ? 3.7 : 4.5;
      } else {
        baseDirection = new THREE.Vector3(0.2, 0.06, 1).normalize();
        desiredDistance = found ? 3.1 : 3.9;
      }

      parallax = new THREE.Vector3(
        this.pointer.x * 0.1 * brandParallax,
        this.pointer.y * 0.08 * brandParallax,
        Math.sin(runtime.time * 0.18) * 0.05 * brandDrift
      );
      const driftOffset = new THREE.Vector3(
        Math.sin(runtime.time * 0.11) * 0.08 * brandDrift,
        Math.cos(runtime.time * 0.09) * 0.05 * brandDrift,
        0
      );
      parallax.add(driftOffset);
    } else {
      baseDirection = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
      desiredDistance = found
        ? (this.cinematicMode || this.stepMode === "cinematic-export" ? 3.4 : this.stepMode === "media-space" ? 3.9 : 4.9)
        : Math.max(6, this.camera.position.distanceTo(this.controls.target));
      parallax = this.cinematicMode || this.stepMode === "cinematic-export"
        ? new THREE.Vector3(this.pointer.x * 0.12, this.pointer.y * 0.08, Math.sin(runtime.time * 0.14) * 0.04)
        : this.stepMode === "media-space"
        ? new THREE.Vector3(this.pointer.x * 0.16, this.pointer.y * 0.12, Math.sin(runtime.time * 0.18) * 0.06)
        : new THREE.Vector3(this.pointer.x * 0.22, this.pointer.y * 0.16, Math.sin(runtime.time * 0.24) * 0.08);
    }

    const desiredPosition = focusTarget.clone()
      .addScaledVector(baseDirection, desiredDistance)
      .add(parallax);

    this.controls.target.lerp(focusTarget, found ? 0.12 : 0.06);
    this.camera.position.lerp(desiredPosition, found ? 0.1 : 0.05);
    this.controls.update();
  }

  renderFrame(time = this.clock.getElapsedTime()) {
    const motionTime = this.getMotionTime(time);
    const runtime = this.buildRuntime(motionTime);
    this.chaosBurst = THREE.MathUtils.lerp(this.chaosBurst, 0, 0.045);

    this.controls.update();
    this.updateEditorialBackdropFrame();

    if (this.handControl.enabled) {
      const uniformScale = THREE.MathUtils.clamp(1 + this.handControl.pinch * 0.32, 0.72, 1.45);
      this.handScaleTarget.setScalar(uniformScale);
      this.variantGroup.scale.lerp(this.handScaleTarget, 0.14);
      this.world.rotation.x = THREE.MathUtils.lerp(this.world.rotation.x, this.handControl.rotationX * 0.5, 0.12);
      this.world.rotation.y = THREE.MathUtils.lerp(this.world.rotation.y, this.handControl.rotationY * 0.7, 0.12);
    } else {
      this.handScaleTarget.setScalar(1);
      this.variantGroup.scale.lerp(this.handScaleTarget, 0.14);
      this.world.rotation.x = THREE.MathUtils.lerp(this.world.rotation.x, 0, 0.12);
      this.world.rotation.y = THREE.MathUtils.lerp(this.world.rotation.y, 0, 0.12);
    }

    if (this.variants.length === 0) {
      this.fallbackMesh.visible = true;
    } else {
      this.fallbackMesh.visible = false;
      for (const variant of this.variants) {
        if (!variant.group.visible) {
          continue;
        }
        variant.update(runtime);
        variant.updateInteraction(this.camera, this.pointer, runtime);
      }
    }

    this.updateCameraDrama(runtime);
    const hasIsolatedContent = this.variants.some((variant) => variant.hasNonBloomContentLayer?.());
    const previousMask = this.camera.layers.mask;

    if (hasIsolatedContent) {
      this.camera.layers.disable(2);
      this.composer.render();
      this.renderer.clearDepth();
      const previousAutoClear = this.renderer.autoClear;
      this.renderer.autoClear = false;
      this.camera.layers.set(2);
      this.renderer.render(this.scene, this.camera);
      this.renderer.autoClear = previousAutoClear;
      this.camera.layers.mask = previousMask;
      return;
    }

    this.composer.render();
  }

  clearEditorialBackdrop() {
    this.editorialBackdropActive = false;
    this.editorialBackdropContext = "standalone";
    this.editorialBackdropOffset.set(0, 0, 0);
    this.editorialBackdropDrag = null;
    this.editorialBackdropMesh.visible = false;
    this.editorialBackdropTexture.needsUpdate = true;
  }

  async captureEditorialBackdrop(sourceConfig, context = "system") {
    if (!sourceConfig || !this.editorialBackdropContext2D) {
      return;
    }

    if (context !== "system" && context !== "brand") {
      this.clearEditorialBackdrop();
      return;
    }

    const originalConfig = this.config ? JSON.parse(JSON.stringify(this.config)) : null;
    const captureConfig = JSON.parse(JSON.stringify(sourceConfig));
    captureConfig.editorial = {
      ...(captureConfig.editorial || {}),
      enabled: false
    };
    captureConfig.systemEditorialOverlay = {
      ...(captureConfig.systemEditorialOverlay || {}),
      enabled: false
    };
    captureConfig.brand = {
      ...(captureConfig.brand || {}),
      enabled: context === "brand"
    };

    this.editorialBackdropActive = false;
    this.editorialBackdropMesh.visible = false;
    this.applyConfig(captureConfig, {});
    this.renderFrame(this.clock.getElapsedTime());

    const renderCanvas = this.renderer.domElement;
    const width = renderCanvas.width || this.stage.clientWidth || 1;
    const height = renderCanvas.height || this.stage.clientHeight || 1;
    this.editorialBackdropCanvas.width = width;
    this.editorialBackdropCanvas.height = height;
    this.editorialBackdropContext2D.clearRect(0, 0, width, height);
    this.editorialBackdropContext2D.drawImage(renderCanvas, 0, 0, width, height);
    this.editorialBackdropTexture.needsUpdate = true;
    this.editorialBackdropActive = true;
    this.editorialBackdropContext = context;

    if (originalConfig) {
      this.applyConfig(originalConfig, {});
    }
  }

  async setPointImagesFromFiles(files) {
    await this.setPointImagesFromSources(files);
  }

  async setPointImagesFromSources(sources) {
    this.pointImageTextures.forEach((texture) => texture.dispose());
    this.pointImageTextures = [];

    for (const texture of await this.loadTexturesFromSources(sources)) {
      this.pointImageTextures.push(texture);
    }
  }

  async loadTexturesFromFiles(files) {
    return this.loadTexturesFromSources(files);
  }

  async loadTexturesFromSources(sources) {
    const textures = [];

    for (const source of sources || []) {
      const isFile = typeof File !== "undefined" && source instanceof File;
      const url = isFile ? URL.createObjectURL(source) : String(source || "");

      if (!url) {
        continue;
      }

      try {
        const image = await new Promise((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = () => reject(
            new Error(`Unable to load image ${isFile ? source.name : "source"}.`)
          );
          element.src = url;
        });

        const texture = new THREE.Texture(image);
        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        textures.push(texture);
      } finally {
        if (isFile) {
          URL.revokeObjectURL(url);
        }
      }
    }

    return textures;
  }

  async setBrandMainImagesFromFiles(files) {
    await this.setBrandMainImagesFromSources(files);
  }

  async setBrandMainImagesFromSources(sources) {
    this.brandMainTextures.forEach((texture) => texture.dispose());
    this.brandMainTextures = await this.loadTexturesFromSources(sources);

    for (const variant of this.variants) {
      variant.setBrandAssets?.({
        mainTextures: this.brandMainTextures,
        orbitTextures: this.brandOrbitTextures
      });
    }
  }

  async setBrandOrbitImagesFromFiles(files) {
    await this.setBrandOrbitImagesFromSources(files);
  }

  async setBrandOrbitImagesFromSources(sources) {
    this.brandOrbitTextures.forEach((texture) => texture.dispose());
    this.brandOrbitTextures = await this.loadTexturesFromSources(sources);

    for (const variant of this.variants) {
      variant.setBrandAssets?.({
        mainTextures: this.brandMainTextures,
        orbitTextures: this.brandOrbitTextures
      });
    }
  }

  setInteractionMode(mode) {
    this.interactionMode = mode || "none";

    if (this.interactionMode === "chaos") {
      this.chaosBurst = 1;
    }
  }

  setStepMode(mode) {
    this.stepMode = mode || "none";

    if (!this.cinematicMode && !this.brandMode && !this.editorialMode && this.stepMode !== "camera-drama" && this.stepMode !== "media-space" && this.stepMode !== "cinematic-export") {
      this.cameraDramaFocus = null;
    }

    this.axisVisualizationGroup.visible = this.stepMode === "axis-visualization";

    for (const variant of this.variants) {
      variant.setStepMode?.(this.stepMode);
    }
  }

  setCinematicMode(enabled) {
    this.cinematicMode = Boolean(enabled);

    if (!this.cinematicMode && !this.brandMode && !this.editorialMode && this.stepMode !== "camera-drama" && this.stepMode !== "media-space" && this.stepMode !== "cinematic-export") {
      this.cameraDramaFocus = null;
    }

    this.updateCinematicVariantVisibility();

    for (const variant of this.variants) {
      variant.setCinematicMode?.(this.config?.cinematic || { enabled: this.cinematicMode, showPoints: false });
    }
  }

  setBrandMode(config) {
    if (typeof config === "object" && config !== null) {
      this.brandMode = Boolean(config.enabled);
    } else {
      this.brandMode = Boolean(config);
    }

    if (!this.brandMode && !this.cinematicMode && !this.editorialMode && this.stepMode !== "camera-drama" && this.stepMode !== "media-space" && this.stepMode !== "cinematic-export") {
      this.cameraDramaFocus = null;
    }

    this.updateCinematicVariantVisibility();

    for (const variant of this.variants) {
      variant.setBrandMode?.(this.config?.brand || { enabled: this.brandMode });
    }
  }

  setEditorialMode(config) {
    if (typeof config === "object" && config !== null) {
      this.editorialMode = Boolean(config.enabled);
      this.config = {
        ...this.config,
        editorial: {
          ...(this.config?.editorial || {}),
          ...config,
          enabled: this.editorialMode
        }
      };
    } else {
      this.editorialMode = Boolean(config);
      this.config = {
        ...this.config,
        editorial: {
          ...(this.config?.editorial || {}),
          enabled: this.editorialMode
        }
      };
    }

    if (!this.editorialMode && !this.brandMode && !this.cinematicMode && this.stepMode !== "camera-drama" && this.stepMode !== "media-space" && this.stepMode !== "cinematic-export") {
      this.cameraDramaFocus = null;
    }

    this.updateCinematicVariantVisibility();

    const editorialHostIndex = this.getEditorialHostVariantIndex();

    for (let index = 0; index < this.variants.length; index += 1) {
      this.variants[index].setEditorialMode?.({
        ...(this.config?.editorial || { enabled: this.editorialMode }),
        enabled: Boolean(this.editorialMode && index === editorialHostIndex)
      });
    }
  }

  setHandControlEnabled(enabled) {
    this.handControl.enabled = Boolean(enabled);
    this.controls.enabled = !this.handControl.enabled && !this.isDirectManipulating;
  }

  setHandControlState(patch = {}) {
    this.handControl.enabled = Boolean(patch.enabled);
    this.handControl.pinch = THREE.MathUtils.clamp(patch.pinch ?? this.handControl.pinch, -1, 1);
    this.handControl.rotationX = THREE.MathUtils.clamp(patch.rotationX ?? this.handControl.rotationX, -1, 1);
    this.handControl.rotationY = THREE.MathUtils.clamp(patch.rotationY ?? this.handControl.rotationY, -1, 1);
    this.handControl.handsDetected = patch.handsDetected ?? this.handControl.handsDetected;
    this.handControl.variationIntensity = patch.variationIntensity ?? this.handControl.variationIntensity;
    this.handControl.baseVariationIntensity = patch.baseVariationIntensity ?? this.handControl.baseVariationIntensity;
    this.handControl.mode = patch.mode ?? this.handControl.mode;
    this.handControl.brandVariation = THREE.MathUtils.clamp(patch.brandVariation ?? this.handControl.brandVariation, 0, 1);
    this.handControl.brandSwitchX = THREE.MathUtils.clamp(patch.brandSwitchX ?? this.handControl.brandSwitchX, -1, 1);
    this.handControl.brandNextPulse = THREE.MathUtils.clamp(patch.brandNextPulse ?? this.handControl.brandNextPulse, 0, 1);
  }

  getCameraPose() {
    return {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      target: {
        x: this.controls.target.x,
        y: this.controls.target.y,
        z: this.controls.target.z
      },
      fov: this.camera.fov
    };
  }

  setCameraPose(pose, options = {}) {
    if (!pose) {
      return;
    }

    this.isApplyingCameraFit = true;
    if (pose.position) {
      this.camera.position.set(
        Number(pose.position.x || 0),
        Number(pose.position.y || 0),
        Number(pose.position.z || 0)
      );
    }
    if (pose.target) {
      this.controls.target.set(
        Number(pose.target.x || 0),
        Number(pose.target.y || 0),
        Number(pose.target.z || 0)
      );
    }
    if (pose.fov != null) {
      this.camera.fov = Number(pose.fov || this.camera.fov);
      this.camera.updateProjectionMatrix();
    }
    this.controls.update();
    this.isApplyingCameraFit = false;

    if (options.markUserOverride !== false) {
      this.userCameraOverride = true;
    }
  }

  getSelectedLetterState() {
    for (const variant of this.variants) {
      const selection = variant.getSelectedLetterState?.();

      if (selection) {
        return selection;
      }
    }

    return null;
  }

  setEditorialLayoutChangeHandler(handler) {
    this.onEditorialLayoutChange = typeof handler === "function" ? handler : null;
  }

  setEditorialBackdropChangeHandler(handler) {
    this.onEditorialBackdropChange = typeof handler === "function" ? handler : null;
  }

  handleEditorialBackdropPointerDown(raycaster, camera) {
    const validContext = this.editorialBackdropContext === "system" || this.editorialBackdropContext === "brand";

    if (!this.editorialMode || !this.editorialBackdropActive || !validContext || !this.editorialBackdropMesh.visible) {
      return false;
    }

    const intersection = raycaster.intersectObject(this.editorialBackdropMesh, false)[0];

    if (!intersection) {
      return false;
    }

    const worldPosition = new THREE.Vector3();
    const planeNormal = new THREE.Vector3();
    const startWorld = new THREE.Vector3();
    const dragPlane = new THREE.Plane();

    this.editorialBackdropMesh.getWorldPosition(worldPosition);
    camera.getWorldDirection(planeNormal);
    dragPlane.setFromNormalAndCoplanarPoint(planeNormal, worldPosition);

    if (!raycaster.ray.intersectPlane(dragPlane, startWorld)) {
      return false;
    }

    this.editorialBackdropDrag = {
      dragPlane,
      startWorld,
      startOffset: this.editorialBackdropOffset.clone()
    };
    return true;
  }

  handleEditorialBackdropPointerMove() {
    if (!this.editorialBackdropDrag) {
      return false;
    }

    const currentWorld = new THREE.Vector3();

    if (!this.raycaster.ray.intersectPlane(this.editorialBackdropDrag.dragPlane, currentWorld)) {
      return true;
    }

    const startLocal = this.camera.worldToLocal(this.editorialBackdropDrag.startWorld.clone());
    const currentLocal = this.camera.worldToLocal(currentWorld.clone());
    const deltaLocal = currentLocal.sub(startLocal);

    this.editorialBackdropOffset.copy(this.editorialBackdropDrag.startOffset).add(deltaLocal);
    this.editorialBackdropOffset.x = THREE.MathUtils.clamp(this.editorialBackdropOffset.x, -3.6, 3.6);
    this.editorialBackdropOffset.y = THREE.MathUtils.clamp(this.editorialBackdropOffset.y, -3.2, 3.2);
    this.editorialBackdropOffset.z = THREE.MathUtils.clamp(this.editorialBackdropOffset.z, -0.8, 0.8);
    this.updateEditorialBackdropFrame();
    return true;
  }

  getEditorialLayoutState() {
    for (const variant of this.variants) {
      const layoutState = variant.getEditorialLayoutState?.();

      if (layoutState) {
        return layoutState;
      }
    }

    return null;
  }

  updateSelectedLetterState(patch) {
    for (const variant of this.variants) {
      if (variant.updateSelectedLetterState?.(patch)) {
        return true;
      }
    }

    return false;
  }

  resetSelectedLetter() {
    for (const variant of this.variants) {
      if (variant.resetSelectedLetter?.()) {
        return true;
      }
    }

    return false;
  }

  resetAllLetters() {
    let handled = false;

    for (const variant of this.variants) {
      handled = Boolean(variant.resetAllLetters?.()) || handled;
    }

    return handled;
  }

  animate = () => {
    this.renderFrame();
    requestAnimationFrame(this.animate);
  };

  setAutoMotionPaused(paused) {
    const nextPaused = Boolean(paused);
    const rawTime = this.clock.getElapsedTime();

    if (nextPaused === this.autoMotionPaused) {
      return;
    }

    if (nextPaused) {
      this.motionPausedAt = rawTime - this.motionPauseOffset;
      this.motionPauseStartedAt = rawTime;
    } else if (this.motionPauseStartedAt != null) {
      this.motionPauseOffset += rawTime - this.motionPauseStartedAt;
      this.motionPauseStartedAt = null;
    }

    this.autoMotionPaused = nextPaused;
  }

  getMotionTime(rawTime = this.clock.getElapsedTime()) {
    if (this.autoMotionPaused) {
      return this.motionPausedAt;
    }

    return rawTime - this.motionPauseOffset;
  }

  getProjectedSVG() {
    this.scene.updateMatrixWorld(true);
    return buildProjectedSVGFromVariants(this.variants, this.camera, this.stage.clientWidth || 1400, this.stage.clientHeight || 900);
  }

  createExportGroup() {
    this.scene.updateMatrixWorld(true);
    return buildExportGroupFromVariants(this.variants, this.config.renderMode);
  }
}
