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
    new THREE.Color("#00ff66"),
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
          bendX: (0.35 + random() * 1.35) * config.variation.intensity * (random() > 0.5 ? 1 : -1),
          bendY: (0.25 + random() * 1.15) * config.variation.intensity * (random() > 0.5 ? 1 : -1),
          bendZ: (0.2 + random() * 1.0) * config.variation.intensity * (random() > 0.5 ? 1 : -1),
          twistX: (0.3 + random() * 1.1) * config.variation.intensity * (random() > 0.5 ? 1 : -1),
          twistY: (0.4 + random() * 1.3) * config.variation.intensity * (random() > 0.5 ? 1 : -1),
          twistZ: (0.28 + random() * 1.08) * config.variation.intensity * (random() > 0.5 ? 1 : -1),
          waveX: (0.25 + random() * 1.2) * config.variation.intensity,
          waveY: (0.25 + random() * 1.2) * config.variation.intensity,
          waveZ: (0.2 + random() * 1.0) * config.variation.intensity,
          noiseLow: (0.35 + random() * 1.0) * config.variation.intensity,
          noiseHigh: (0.4 + random() * 1.25) * config.variation.intensity,
          axisScale: new THREE.Vector3(
            (random() - 0.5) * 1.2 * config.variation.intensity,
            (random() - 0.5) * 1.3 * config.variation.intensity,
            (random() - 0.5) * 1.4 * config.variation.intensity
          ),
          shear: {
            xy: (random() - 0.5) * 0.9 * config.variation.intensity,
            xz: (random() - 0.5) * 1.1 * config.variation.intensity,
            yx: (random() - 0.5) * 0.8 * config.variation.intensity,
            yz: (random() - 0.5) * 1.0 * config.variation.intensity,
            zx: (random() - 0.5) * 0.9 * config.variation.intensity,
            zy: (random() - 0.5) * 0.8 * config.variation.intensity
          },
          rotationField: new THREE.Vector3(
            (0.15 + random() * 1.0) * config.variation.intensity * (random() > 0.5 ? 1 : -1),
            (0.18 + random() * 1.1) * config.variation.intensity * (random() > 0.5 ? 1 : -1),
            (0.15 + random() * 0.95) * config.variation.intensity * (random() > 0.5 ? 1 : -1)
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
    this.introStart = performance.now();
    this.typographyData = buildFallbackTypographyData("TEST");
    this.variants = [];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#050505");

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
    this.camera.position.set(0.8, 0.2, 8.6);

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
    this.controls.minDistance = 4;
    this.controls.maxDistance = 22;
    this.controls.rotateSpeed = 0.72;
    this.controls.target.set(0, 0, 0);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.15, 0.6, 0.18);
    this.composer.addPass(this.bloomPass);

    this.world = new THREE.Group();
    this.backgroundGroup = new THREE.Group();
    this.variantGroup = new THREE.Group();
    this.scene.add(this.backgroundGroup);
    this.scene.add(this.world);
    this.world.add(this.variantGroup);

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
        color: "#00ff66",
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
  }

  async rebuildTypography(typographyConfig, config) {
    this.config = config;

    try {
      this.typographyData = await buildTypographyData(typographyConfig);
    } catch (error) {
      console.warn("Typography build failed, using fallback.", error);
      this.typographyData = buildFallbackTypographyData(typographyConfig.text || "TEST");
    }

    this.introStart = performance.now();
    this.rebuildLayout();
    this.applyConfig(config, { rebuildBackground: true });
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
      const variant = new TypographyVariant(this.typographyData, setting, width, height);
      this.variantGroup.add(variant.group);
      this.variants.push(variant);
    }

    this.fallbackMesh.visible = this.variants.length === 0;
  }

  updateBackground() {
    const transparent = Boolean(this.config.transparentBackground);
    this.scene.background = transparent ? null : new THREE.Color("#050505");
    this.renderer.setClearColor("#000000", transparent ? 0 : 1);
    this.backgroundPlane.visible = !transparent;

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
    if (!this.config.glow.enabled || this.config.renderMode === "outline") {
      this.bloomPass.threshold = 1;
      this.bloomPass.strength = 0;
      this.bloomPass.radius = 0;
      return;
    }

    this.bloomPass.threshold = 0.08;
    this.bloomPass.strength = this.config.glow.intensity;
    this.bloomPass.radius = 0.58;
  }

  fitCamera() {
    const bounds = this.typographyData.bounds || { width: 4, height: 1.4, depth: 0.6 };
    const baseDistance = Math.max(this.config.camera.distance, bounds.width * 1.45, bounds.height * 2.2, 6);
    const preset = this.config.camera.preset;

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
    this.controls.minDistance = Math.max(3.2, baseDistance * 0.45);
    this.controls.maxDistance = Math.max(16, baseDistance * 2.4);
    this.controls.update();
  }

  applyConfig(config, options = {}) {
    this.config = config;

    if (options.rebuildLayout) {
      this.rebuildLayout();
    }

    if (options.rebuildBackground) {
      this.updateBackground();
    }

    this.applyGlow();
    this.fitCamera();

    for (const variant of this.variants) {
      variant.setMode(config.renderMode);
      variant.setAppearance({
        strokeWidth: config.strokeWidth,
        opacity: 1,
        glowEnabled: config.glow.enabled
      });
    }
  }

  buildRuntime(time = this.clock.getElapsedTime()) {
    const intro = Math.min((performance.now() - this.introStart) / 1400, 1);
    return {
      time,
      intro,
      globalDistortion: this.config.distortion,
      animation: getAnimationProfile(this.config.animation.preset, time, intro)
    };
  }

  renderFrame(time = this.clock.getElapsedTime()) {
    const runtime = this.buildRuntime(time);

    this.controls.update();
    this.world.rotation.y = time * runtime.animation.rotationSpeed;

    if (this.variants.length === 0) {
      this.fallbackMesh.visible = true;
      this.fallbackMesh.rotation.y = time * 0.18;
    } else {
      this.fallbackMesh.visible = false;
      for (const variant of this.variants) {
        variant.update(runtime);
      }
    }

    this.composer.render();
  }

  animate = () => {
    this.renderFrame();
    requestAnimationFrame(this.animate);
  };

  getProjectedSVG() {
    this.scene.updateMatrixWorld(true);
    return buildProjectedSVGFromVariants(this.variants, this.camera, this.stage.clientWidth || 1400, this.stage.clientHeight || 900);
  }

  createExportGroup() {
    this.scene.updateMatrixWorld(true);
    return buildExportGroupFromVariants(this.variants, this.config.renderMode);
  }
}
