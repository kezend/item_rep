import { TypographyStudio } from "./scene.js";
import { loadFontFromFile } from "./typographyData.js";

const elements = {
  stage: document.querySelector("#stage"),
  canvas: document.querySelector("#scene-canvas"),
  status: document.querySelector("#status-line"),
  textInput: document.querySelector("#text-input"),
  fontSelect: document.querySelector("#font-select"),
  fontUpload: document.querySelector("#font-upload"),
  renderModeToggle: document.querySelector("#render-mode-toggle"),
  colorPresets: document.querySelector("#color-presets"),
  backgroundModeToggle: document.querySelector("#background-mode-toggle"),
  cameraPresetToggle: document.querySelector("#camera-preset-toggle"),
  exportButtons: [...document.querySelectorAll("[data-export]")],
  controls: {
    fontSize: document.querySelector("#font-size"),
    tracking: document.querySelector("#tracking"),
    lineHeight: document.querySelector("#line-height"),
    strokeWidth: document.querySelector("#stroke-width"),
    glowEnabled: document.querySelector("#glow-enabled"),
    glowColor: document.querySelector("#glow-color"),
    glowIntensity: document.querySelector("#glow-intensity"),
    bend: document.querySelector("#bend"),
    twist: document.querySelector("#twist"),
    wave: document.querySelector("#wave"),
    noise: document.querySelector("#noise"),
    gridEnabled: document.querySelector("#grid-enabled"),
    gridRows: document.querySelector("#grid-rows"),
    gridCols: document.querySelector("#grid-cols"),
    seedInput: document.querySelector("#seed-input"),
    variationIntensity: document.querySelector("#variation-intensity"),
    cameraFov: document.querySelector("#camera-fov"),
    cameraDistance: document.querySelector("#camera-distance"),
    animationPreset: document.querySelector("#animation-preset")
  }
};

const state = {
  typography: {
    text: elements.textInput.value,
    fontFamily: elements.fontSelect.value,
    fontSize: Number(elements.controls.fontSize.value),
    tracking: Number(elements.controls.tracking.value),
    lineHeight: Number(elements.controls.lineHeight.value)
  },
  renderMode: "outline",
  strokeWidth: Number(elements.controls.strokeWidth.value),
  glow: {
    enabled: elements.controls.glowEnabled.checked,
    color: elements.controls.glowColor.value,
    intensity: Number(elements.controls.glowIntensity.value)
  },
  distortion: {
    bend: Number(elements.controls.bend.value),
    twist: Number(elements.controls.twist.value),
    wave: Number(elements.controls.wave.value),
    noise: Number(elements.controls.noise.value)
  },
  variation: {
    enabled: elements.controls.gridEnabled.checked,
    rows: Number(elements.controls.gridRows.value),
    cols: Number(elements.controls.gridCols.value),
    seed: elements.controls.seedInput.value,
    intensity: Number(elements.controls.variationIntensity.value),
    backgroundMode: "single"
  },
  camera: {
    preset: "perspective",
    fov: Number(elements.controls.cameraFov.value),
    distance: Number(elements.controls.cameraDistance.value)
  },
  animation: {
    preset: elements.controls.animationPreset.value
  }
};

const studio = new TypographyStudio({
  canvas: elements.canvas,
  stage: elements.stage
});

let rebuildTimer = 0;

function setStatus(message) {
  elements.status.textContent = message;
}

function updateOutputs() {
  const formatters = {
    "font-size": (value) => `${value}px`,
    tracking: (value) => `${value}px`,
    "line-height": (value) => Number(value).toFixed(2),
    "stroke-width": (value) => `${Number(value).toFixed(1)}px`,
    "glow-intensity": (value) => Number(value).toFixed(2),
    bend: (value) => Number(value).toFixed(2),
    twist: (value) => Number(value).toFixed(2),
    wave: (value) => Number(value).toFixed(2),
    noise: (value) => Number(value).toFixed(2),
    "grid-rows": (value) => value,
    "grid-cols": (value) => value,
    "variation-intensity": (value) => Number(value).toFixed(2),
    "camera-fov": (value) => `${value}deg`,
    "camera-distance": (value) => Number(value).toFixed(1)
  };

  for (const output of document.querySelectorAll("[data-output]")) {
    const id = output.dataset.output;
    const input = document.querySelector(`#${id}`);

    if (!input) {
      continue;
    }

    output.textContent = (formatters[id] || ((value) => value))(input.value);
  }
}

function updateTypographyState() {
  state.typography.text = elements.textInput.value;
  state.typography.fontFamily = elements.fontSelect.value;
  state.typography.fontSize = Number(elements.controls.fontSize.value);
  state.typography.tracking = Number(elements.controls.tracking.value);
  state.typography.lineHeight = Number(elements.controls.lineHeight.value);
}

function updateVisualState() {
  state.strokeWidth = Number(elements.controls.strokeWidth.value);
  state.glow.enabled = elements.controls.glowEnabled.checked;
  state.glow.color = elements.controls.glowColor.value;
  state.glow.intensity = Number(elements.controls.glowIntensity.value);
  state.distortion.bend = Number(elements.controls.bend.value);
  state.distortion.twist = Number(elements.controls.twist.value);
  state.distortion.wave = Number(elements.controls.wave.value);
  state.distortion.noise = Number(elements.controls.noise.value);
  state.variation.enabled = elements.controls.gridEnabled.checked;
  state.variation.rows = Number(elements.controls.gridRows.value);
  state.variation.cols = Number(elements.controls.gridCols.value);
  state.variation.seed = elements.controls.seedInput.value;
  state.variation.intensity = Number(elements.controls.variationIntensity.value);
  state.camera.fov = Number(elements.controls.cameraFov.value);
  state.camera.distance = Number(elements.controls.cameraDistance.value);
  state.animation.preset = elements.controls.animationPreset.value;
}

function applyState(options = {}) {
  updateVisualState();
  studio.applyConfig(state, options);
}

async function rebuildTypography() {
  setStatus("Building typography...");
  await studio.rebuildTypography(state.typography, state);
  setStatus("Ready.");
}

function scheduleRebuildTypography() {
  window.clearTimeout(rebuildTimer);
  rebuildTimer = window.setTimeout(() => {
    rebuildTypography().catch((error) => {
      console.error(error);
      setStatus(error.message || "Unable to build typography.");
    });
  }, 120);
}

async function runExport(type) {
  const fileStem = (state.typography.text.trim() || "scanner-type")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase();

  setStatus(`Preparing ${type.toUpperCase()}...`);

  try {
    const exporters = await import("./exporters.js");

    if (type === "png") {
      await exporters.exportPNG(elements.stage, `${fileStem}.png`);
    } else if (type === "jpg") {
      await exporters.exportJPG(elements.stage, `${fileStem}.jpg`);
    } else if (type === "gif") {
      await exporters.exportGif(studio, `${fileStem}.gif`, setStatus);
    } else if (type === "svg") {
      exporters.exportSVG(studio, `${fileStem}.svg`);
    } else if (type === "gltf") {
      await exporters.exportGLTF(studio, `${fileStem}.gltf`);
    } else if (type === "obj") {
      exporters.exportOBJ(studio, `${fileStem}.obj`);
    }

    setStatus(`${type.toUpperCase()} export complete.`);
  } catch (error) {
    console.error(error);
    setStatus(error.message || `Unable to export ${type.toUpperCase()}.`);
  }
}

function setActiveToggle(group, datasetKey, value) {
  for (const button of group.querySelectorAll("button")) {
    button.classList.toggle("is-active", button.dataset[datasetKey] === value);
  }
}

function bindEvents() {
  const typographyControls = [
    elements.textInput,
    elements.fontSelect,
    elements.controls.fontSize,
    elements.controls.tracking,
    elements.controls.lineHeight
  ];

  for (const control of typographyControls) {
    const handler = () => {
      updateTypographyState();
      updateOutputs();
      scheduleRebuildTypography();
    };

    control.addEventListener("input", handler);
    control.addEventListener("change", handler);
  }

  const visualControls = [
    elements.controls.strokeWidth,
    elements.controls.glowEnabled,
    elements.controls.glowColor,
    elements.controls.glowIntensity,
    elements.controls.bend,
    elements.controls.twist,
    elements.controls.wave,
    elements.controls.noise,
    elements.controls.gridEnabled,
    elements.controls.gridRows,
    elements.controls.gridCols,
    elements.controls.seedInput,
    elements.controls.variationIntensity,
    elements.controls.cameraFov,
    elements.controls.cameraDistance,
    elements.controls.animationPreset
  ];

  for (const control of visualControls) {
    const handler = () => {
      updateOutputs();
      applyState({ rebuildLayout: true });
    };

    control.addEventListener("input", handler);
    control.addEventListener("change", handler);
  }

  elements.renderModeToggle.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-render-mode]");

    if (!button) {
      return;
    }

    state.renderMode = button.dataset.renderMode;
    setActiveToggle(elements.renderModeToggle, "renderMode", state.renderMode);
    applyState();
  });

  elements.backgroundModeToggle.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-background-mode]");

    if (!button) {
      return;
    }

    state.variation.backgroundMode = button.dataset.backgroundMode;
    setActiveToggle(elements.backgroundModeToggle, "backgroundMode", state.variation.backgroundMode);
    applyState({ rebuildLayout: true, rebuildBackground: true });
  });

  elements.cameraPresetToggle.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-camera]");

    if (!button) {
      return;
    }

    state.camera.preset = button.dataset.camera;
    setActiveToggle(elements.cameraPresetToggle, "camera", state.camera.preset);
    applyState();
  });

  elements.colorPresets.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-color]");

    if (!button) {
      return;
    }

    elements.controls.glowColor.value = button.dataset.color;
    applyState();
  });

  elements.fontUpload.addEventListener("change", async (event) => {
    const [file] = event.target.files;

    if (!file) {
      return;
    }

    try {
      setStatus("Loading font...");
      const { family, label } = await loadFontFromFile(file);
      const option = document.createElement("option");
      option.value = family;
      option.textContent = `${label} (Upload)`;
      elements.fontSelect.append(option);
      elements.fontSelect.value = family;
      updateTypographyState();
      await rebuildTypography();
    } catch (error) {
      console.error(error);
      setStatus("Unable to load font.");
    }
  });

  for (const button of elements.exportButtons) {
    button.addEventListener("click", () => runExport(button.dataset.export));
  }
}

async function init() {
  updateOutputs();
  bindEvents();
  await rebuildTypography();
  studio.animate();
}

init().catch((error) => {
  console.error(error);
  setStatus(error.message || "Unable to initialize.");
});
