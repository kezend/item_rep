import * as THREE from "three";
import { TypographyStudio } from "./scene.js";
import { HandControlManager } from "./handControl.js";
import { loadFontFromFile, loadFontFromSource } from "./typographyData.js";

const EXPORTERS_MODULE_PATH = "./exporters.js?v=hand-mp4-finalize-fix1";
const SESSION_STORAGE_KEY = "dd:last-session:v1";
const COMPOSITION_HISTORY_STORAGE_KEY = "dd:composition-history:v1";
const PRESET_LIBRARY_STORAGE_KEY = "dd:preset-library:v1";
const PERSISTENCE_DB_NAME = "dd-persistence-v1";
const PERSISTENCE_DB_VERSION = 1;
const MAX_COMPOSITION_HISTORY = 16;
const MAX_PRESET_HISTORY = 40;

const elements = {
  stage: document.querySelector("#stage"),
  canvas: document.querySelector("#scene-canvas"),
  status: document.querySelector("#status-line"),
  textInput: document.querySelector("#text-input"),
  fontSelect: document.querySelector("#font-select"),
  fontUpload: document.querySelector("#font-upload"),
  renderModeToggle: document.querySelector("#render-mode-toggle"),
  colorPresets: document.querySelector("#color-presets"),
  panelTabToggle: document.querySelector("#panel-tab-toggle"),
  panelPanes: [...document.querySelectorAll("[data-panel-pane]")],
  backgroundModeToggle: document.querySelector("#background-mode-toggle"),
  cameraPresetToggle: document.querySelector("#camera-preset-toggle"),
  interactionModeToggle: document.querySelector("#interaction-mode-toggle"),
  stepModeToggle: document.querySelector("#step-mode-toggle"),
  exportButtons: [...document.querySelectorAll("[data-export]")],
  randomizeCompositionButton: document.querySelector("#randomize-composition-button"),
  invertCompositionButton: document.querySelector("#invert-composition-button"),
  autoMotionToggle: document.querySelector("#auto-motion-toggle"),
  resetAllButton: document.querySelector("#reset-all-button"),
  controls: {
    fontSize: document.querySelector("#font-size"),
    tracking: document.querySelector("#tracking"),
    lineHeight: document.querySelector("#line-height"),
    strokeWidth: document.querySelector("#stroke-width"),
    pointSize: document.querySelector("#point-size"),
    pointOpacity: document.querySelector("#point-opacity"),
    pointColorMode: document.querySelector("#point-color-mode"),
    pointColorA: document.querySelector("#point-color-a"),
    pointColorB: document.querySelector("#point-color-b"),
    backgroundColor: document.querySelector("#background-color"),
    transparentBackground: document.querySelector("#transparent-background"),
    glowEnabled: document.querySelector("#glow-enabled"),
    glowBasePointsOnly: document.querySelector("#glow-base-points-only"),
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
    axisStepEnabled: document.querySelector("#axis-step-enabled"),
    axisGuidesEnabled: document.querySelector("#axis-guides-enabled"),
    cameraFov: document.querySelector("#camera-fov"),
    cameraDistance: document.querySelector("#camera-distance"),
    resetCameraButton: document.querySelector("#reset-camera-button"),
    animationPreset: document.querySelector("#animation-preset"),
    pointImageUpload: document.querySelector("#point-image-upload"),
    pointTextInput: document.querySelector("#point-text-input"),
    pointTextFont: document.querySelector("#point-text-font"),
    pointTextFontUpload: document.querySelector("#point-text-font-upload"),
    pointTextUppercase: document.querySelector("#point-text-uppercase"),
    pointTextBackground: document.querySelector("#point-text-background"),
    pointTextColor: document.querySelector("#point-text-color"),
    pointTextBackgroundColor: document.querySelector("#point-text-background-color"),
    contentDensity: document.querySelector("#content-density"),
    contentFillPoints: document.querySelector("#content-fill-points"),
    contentHoverScale: document.querySelector("#content-hover-scale"),
    imageRatio: document.querySelector("#image-ratio"),
    textRatio: document.querySelector("#text-ratio"),
    emptyRatio: document.querySelector("#empty-ratio"),
    contentLayoutMode: document.querySelector("#content-layout-mode"),
    mediaSpacePreset: document.querySelector("#media-space-preset"),
    expansionRandomness: document.querySelector("#expansion-randomness"),
    hoverProximityStrength: document.querySelector("#hover-proximity-strength"),
    cinematicDepthSpeed: document.querySelector("#cinematic-depth-speed"),
    cinematicDirection: document.querySelector("#cinematic-direction"),
    contentOnlyMode: document.querySelector("#content-only-mode"),
    contentOnlyType: document.querySelector("#content-only-type"),
    filterKind: document.querySelector("#filter-kind"),
    boundaryShape: document.querySelector("#boundary-shape"),
    fieldShape: document.querySelector("#field-shape"),
    trailLength: document.querySelector("#trail-length"),
    exportRatio: document.querySelector("#export-ratio"),
    exportSize: document.querySelector("#export-size"),
    exportFrames: document.querySelector("#export-frames"),
    exportDuration: document.querySelector("#export-duration"),
    exportQuality: document.querySelector("#export-quality"),
    exportFps: document.querySelector("#export-fps")
  },
  deform: {
    status: document.querySelector("#selected-letter-status"),
    moveX: document.querySelector("#letter-move-x"),
    moveY: document.querySelector("#letter-move-y"),
    moveZ: document.querySelector("#letter-move-z"),
    scaleX: document.querySelector("#letter-scale-x"),
    scaleY: document.querySelector("#letter-scale-y"),
    scaleZ: document.querySelector("#letter-scale-z"),
    bendX: document.querySelector("#letter-bend-x"),
    bendY: document.querySelector("#letter-bend-y"),
    bendZ: document.querySelector("#letter-bend-z"),
    twistX: document.querySelector("#letter-twist-x"),
    twistY: document.querySelector("#letter-twist-y"),
    twistZ: document.querySelector("#letter-twist-z"),
    noise: document.querySelector("#letter-noise"),
    resetSelected: document.querySelector("#letter-reset-selected"),
    resetAll: document.querySelector("#letter-reset-all")
  },
  hand: {
    status: document.querySelector("#hand-control-status"),
    exportStatus: document.querySelector("#hand-export-status"),
    mode: document.querySelector("#hand-mode"),
    exportRatio: document.querySelector("#hand-export-ratio"),
    exportSize: document.querySelector("#hand-export-size"),
    exportFrames: document.querySelector("#hand-export-frames"),
    exportDuration: document.querySelector("#hand-export-duration"),
    exportQuality: document.querySelector("#hand-export-quality"),
    exportFps: document.querySelector("#hand-export-fps"),
    video: document.querySelector("#hand-video"),
    overlay: document.querySelector("#hand-overlay")
  },
  animationTab: {
    status: document.querySelector("#animation-status"),
    duration: document.querySelector("#animation-duration"),
    currentTime: document.querySelector("#animation-current-time"),
    loop: document.querySelector("#animation-loop"),
    autoKey: document.querySelector("#animation-auto-key"),
    easing: document.querySelector("#animation-easing"),
    flightProfile: document.querySelector("#animation-flight-profile"),
    flightIntensity: document.querySelector("#animation-flight-intensity"),
    prevKeyframe: document.querySelector("#animation-prev-keyframe"),
    nextKeyframe: document.querySelector("#animation-next-keyframe"),
    saveCurrentView: document.querySelector("#animation-save-current-view"),
    advancedToggle: document.querySelector("#animation-advanced-toggle"),
    advancedContent: document.querySelector("#animation-advanced-content"),
    sourceModeStatus: document.querySelector("#animation-source-mode-status"),
    captureComposition: document.querySelector("#animation-capture-composition"),
    addKeyframe: document.querySelector("#animation-add-keyframe"),
    updateKeyframe: document.querySelector("#animation-update-keyframe"),
    deleteKeyframe: document.querySelector("#animation-delete-keyframe"),
    playToggle: document.querySelector("#animation-play-toggle"),
    stop: document.querySelector("#animation-stop"),
    savePreset: document.querySelector("#animation-save-preset"),
    exportQuality: document.querySelector("#animation-export-quality"),
    exportFps: document.querySelector("#animation-export-fps"),
    trackList: document.querySelector("#animation-track-list"),
    keyframeList: document.querySelector("#animation-keyframe-list")
  },
  brand: {
    status: document.querySelector("#brand-status"),
    savePreset: document.querySelector("#brand-save-preset"),
    preset: document.querySelector("#brand-preset"),
    mainKind: document.querySelector("#brand-main-kind"),
    mainImageUpload: document.querySelector("#brand-main-image-upload"),
    mainText: document.querySelector("#brand-main-text"),
    orbitImageUpload: document.querySelector("#brand-orbit-image-upload"),
    orbitTexts: document.querySelector("#brand-orbit-texts"),
    titleText: document.querySelector("#brand-title-text"),
    subtitleText: document.querySelector("#brand-subtitle-text"),
    tagText: document.querySelector("#brand-tag-text"),
    backgroundWord: document.querySelector("#brand-background-word"),
    textFontSize: document.querySelector("#brand-text-font-size"),
    textAlign: document.querySelector("#brand-text-align"),
    textColor: document.querySelector("#brand-text-color"),
    textLineHeight: document.querySelector("#brand-text-line-height"),
    textLetterSpacing: document.querySelector("#brand-text-letter-spacing"),
    textOpacity: document.querySelector("#brand-text-opacity"),
    mainScale: document.querySelector("#brand-main-scale"),
    mainRotateX: document.querySelector("#brand-main-rotate-x"),
    mainRotateY: document.querySelector("#brand-main-rotate-y"),
    mainRotateZ: document.querySelector("#brand-main-rotate-z"),
    mainDepth: document.querySelector("#brand-main-depth"),
    activeDepthOffset: document.querySelector("#brand-active-depth-offset"),
    mainTilt: document.querySelector("#brand-main-tilt"),
    heroSkew: document.querySelector("#brand-hero-skew"),
    heroOpacity: document.querySelector("#brand-hero-opacity"),
    heroDominance: document.querySelector("#brand-hero-dominance"),
    showPoints: document.querySelector("#brand-show-points"),
    showImages: document.querySelector("#brand-show-images"),
    showText: document.querySelector("#brand-show-text"),
    pointDensity: document.querySelector("#brand-point-density"),
    pointSize: document.querySelector("#brand-point-size"),
    pointOpacity: document.querySelector("#brand-point-opacity"),
    pointColorMode: document.querySelector("#brand-point-color-mode"),
    pointColorA: document.querySelector("#brand-point-color-a"),
    pointColorB: document.querySelector("#brand-point-color-b"),
    orbitSpeed: document.querySelector("#brand-orbit-speed"),
    orbitRadius: document.querySelector("#brand-orbit-radius"),
    numberOfRings: document.querySelector("#brand-number-of-rings"),
    orbitSpacing: document.querySelector("#brand-orbit-spacing"),
    orbitRandomness: document.querySelector("#brand-orbit-randomness"),
    orbitJitter: document.querySelector("#brand-orbit-jitter"),
    orbitMinScale: document.querySelector("#brand-orbit-min-scale"),
    orbitMaxScale: document.querySelector("#brand-orbit-max-scale"),
    orbitDistance: document.querySelector("#brand-orbit-distance"),
    orbitDepthSpread: document.querySelector("#brand-orbit-depth-spread"),
    clusterStrength: document.querySelector("#brand-cluster-strength"),
    attractionToHero: document.querySelector("#brand-attraction-to-hero"),
    repulsionFromHero: document.querySelector("#brand-repulsion-from-hero"),
    orbitRandomRotation: document.querySelector("#brand-orbit-random-rotation"),
    secondaryEmphasis: document.querySelector("#brand-secondary-emphasis"),
    backgroundSuppression: document.querySelector("#brand-background-suppression"),
    opacityFalloffDepth: document.querySelector("#brand-opacity-falloff-depth"),
    scaleFalloffDistance: document.querySelector("#brand-scale-falloff-distance"),
    blurFalloffDepth: document.querySelector("#brand-blur-falloff-depth"),
    transitionStyle: document.querySelector("#brand-transition-style"),
    transitionDuration: document.querySelector("#brand-transition-duration"),
    transitionEasing: document.querySelector("#brand-transition-easing"),
    cameraPreset: document.querySelector("#brand-camera-preset"),
    slowCameraDrift: document.querySelector("#brand-slow-camera-drift"),
    parallaxStrength: document.querySelector("#brand-parallax-strength"),
    resetCameraButton: document.querySelector("#brand-reset-camera-button"),
    outputPreset: document.querySelector("#brand-output-preset"),
    glowEnabled: document.querySelector("#brand-glow-enabled"),
    moodPreset: document.querySelector("#brand-mood-preset"),
    backgroundColor: document.querySelector("#brand-background-color"),
    transparentBackground: document.querySelector("#brand-transparent-background"),
    auraStrength: document.querySelector("#brand-aura-strength"),
    auraRadius: document.querySelector("#brand-aura-radius"),
    auraOpacity: document.querySelector("#brand-aura-opacity"),
    memoryDuration: document.querySelector("#brand-memory-duration"),
    memoryOpacity: document.querySelector("#brand-memory-opacity"),
    memoryOffset: document.querySelector("#brand-memory-offset"),
    brandWeight: document.querySelector("#brand-weight"),
    dualHeroEnabled: document.querySelector("#brand-dual-hero-enabled"),
    dualHeroDistance: document.querySelector("#brand-dual-hero-distance"),
    dualHeroBalance: document.querySelector("#brand-dual-hero-balance"),
    exportRatio: document.querySelector("#brand-export-ratio"),
    exportSize: document.querySelector("#brand-export-size"),
    exportFrames: document.querySelector("#brand-export-frames"),
    exportDuration: document.querySelector("#brand-export-duration"),
    exportQuality: document.querySelector("#brand-export-quality"),
    exportFps: document.querySelector("#brand-export-fps"),
    clearOrbit: document.querySelector("#brand-clear-orbit"),
    randomizeOrbit: document.querySelector("#brand-randomize-orbit"),
    resetMain: document.querySelector("#brand-reset-main")
  },
  editorial: {
    status: document.querySelector("#editorial-status"),
    exportStatus: document.querySelector("#editorial-export-status"),
    contextToggle: document.querySelector("#editorial-context-toggle"),
    glowEnabled: document.querySelector("#editorial-glow-enabled"),
    heroBlockList: document.querySelector("#editorial-hero-block-list"),
    addHero: document.querySelector("#editorial-add-hero"),
    removeHero: document.querySelector("#editorial-remove-hero"),
    addTopLabels: document.querySelector("#editorial-add-top-labels"),
    removeTopLabels: document.querySelector("#editorial-remove-top-labels"),
    layoutPreset: document.querySelector("#editorial-layout-preset"),
    templatePreset: document.querySelector("#editorial-template-preset"),
    heroText: document.querySelector("#editorial-hero-text"),
    heroFont: document.querySelector("#editorial-hero-font"),
    heroFontUpload: document.querySelector("#editorial-hero-font-upload"),
    heroSize: document.querySelector("#editorial-hero-size"),
    heroTracking: document.querySelector("#editorial-hero-tracking"),
    heroLineHeight: document.querySelector("#editorial-hero-line-height"),
    heroOpacity: document.querySelector("#editorial-hero-opacity"),
    heroColor: document.querySelector("#editorial-hero-color"),
    heroLayer: document.querySelector("#editorial-hero-layer"),
    heroX: document.querySelector("#editorial-hero-x"),
    heroY: document.querySelector("#editorial-hero-y"),
    heroZ: document.querySelector("#editorial-hero-z"),
    heroMaxWidth: document.querySelector("#editorial-hero-max-width"),
    heroBackground: document.querySelector("#editorial-hero-background"),
    heroBackgroundOpacity: document.querySelector("#editorial-hero-bg-opacity"),
    heroBackgroundColor: document.querySelector("#editorial-hero-bg-color"),
    heroPaddingX: document.querySelector("#editorial-hero-padding-x"),
    heroPaddingY: document.querySelector("#editorial-hero-padding-y"),
    addInfoBlock: document.querySelector("#editorial-add-info-block"),
    removeInfoBlock: document.querySelector("#editorial-remove-info-block"),
    addSecondaryBlock: document.querySelector("#editorial-add-secondary-block"),
    removeSecondaryBlock: document.querySelector("#editorial-remove-secondary-block"),
    addLabelBlock: document.querySelector("#editorial-add-label-block"),
    removeLabelBlock: document.querySelector("#editorial-remove-label-block"),
    importBrand: document.querySelector("#editorial-import-brand"),
    saveBrand: document.querySelector("#editorial-save-brand"),
    savePreset: document.querySelector("#editorial-save-preset"),
    saveSystem: document.querySelector("#editorial-save-system"),
    loadSystem: document.querySelector("#editorial-load-system"),
    heroMaskEnabled: document.querySelector("#editorial-hero-mask-enabled"),
    heroMaskType: document.querySelector("#editorial-hero-mask-type"),
    heroMaskWidth: document.querySelector("#editorial-hero-mask-width"),
    heroMaskHeight: document.querySelector("#editorial-hero-mask-height"),
    heroMaskX: document.querySelector("#editorial-hero-mask-x"),
    heroMaskY: document.querySelector("#editorial-hero-mask-y"),
    opticalSizeBias: document.querySelector("#editorial-optical-size-bias"),
    heroContrast: document.querySelector("#editorial-hero-contrast"),
    microContrast: document.querySelector("#editorial-micro-contrast"),
    whitespaceBalance: document.querySelector("#editorial-whitespace-balance"),
    textDensity: document.querySelector("#editorial-text-density"),
    gridPreset: document.querySelector("#editorial-grid-preset"),
    gridSnap: document.querySelector("#editorial-grid-snap"),
    gridMargin: document.querySelector("#editorial-grid-margin"),
    gridGutter: document.querySelector("#editorial-grid-gutter"),
    frameLogic: document.querySelector("#editorial-frame-logic"),
    imageFollowHero: document.querySelector("#editorial-image-follow-hero"),
    imageScaleBias: document.querySelector("#editorial-image-scale-bias"),
    animationPreset: document.querySelector("#editorial-animation-preset"),
    animationSpeed: document.querySelector("#editorial-animation-speed"),
    animationIntensity: document.querySelector("#editorial-animation-intensity"),
    labelsText: document.querySelector("#editorial-labels-text"),
    labelsSize: document.querySelector("#editorial-labels-size"),
    labelsTracking: document.querySelector("#editorial-labels-tracking"),
    labelsSpacing: document.querySelector("#editorial-labels-spacing"),
    labelsAlign: document.querySelector("#editorial-labels-align"),
    labelsZ: document.querySelector("#editorial-labels-z"),
    labelsLayer: document.querySelector("#editorial-labels-layer"),
    textFont: document.querySelector("#editorial-text-font"),
    textFontUpload: document.querySelector("#editorial-text-font-upload"),
    metadataFont: document.querySelector("#editorial-metadata-font"),
    labelFont: document.querySelector("#editorial-label-font"),
    infoBlockList: document.querySelector("#editorial-info-block-list"),
    infoText: document.querySelector("#editorial-info-text"),
    infoFontSize: document.querySelector("#editorial-info-font-size"),
    infoTracking: document.querySelector("#editorial-info-tracking"),
    infoLineHeight: document.querySelector("#editorial-info-line-height"),
    infoWidth: document.querySelector("#editorial-info-width"),
    infoHeight: document.querySelector("#editorial-info-height"),
    infoPadding: document.querySelector("#editorial-info-padding"),
    infoAlign: document.querySelector("#editorial-info-align"),
    infoX: document.querySelector("#editorial-info-x"),
    infoY: document.querySelector("#editorial-info-y"),
    infoZ: document.querySelector("#editorial-info-z"),
    infoLayer: document.querySelector("#editorial-info-layer"),
    infoBorder: document.querySelector("#editorial-info-border"),
    secondaryText: document.querySelector("#editorial-secondary-text"),
    secondaryBlockList: document.querySelector("#editorial-secondary-block-list"),
    secondarySize: document.querySelector("#editorial-secondary-size"),
    secondaryTracking: document.querySelector("#editorial-secondary-tracking"),
    secondaryLineHeight: document.querySelector("#editorial-secondary-line-height"),
    secondaryOpacity: document.querySelector("#editorial-secondary-opacity"),
    secondaryX: document.querySelector("#editorial-secondary-x"),
    secondaryY: document.querySelector("#editorial-secondary-y"),
    secondaryZ: document.querySelector("#editorial-secondary-z"),
    secondaryLayer: document.querySelector("#editorial-secondary-layer"),
    showGuides: document.querySelector("#editorial-show-guides"),
    mediaOpacity: document.querySelector("#editorial-media-opacity"),
    mediaScale: document.querySelector("#editorial-media-scale"),
    labelBoxes: document.querySelector("#editorial-label-boxes"),
    labelBlockList: document.querySelector("#editorial-label-block-list"),
    labelStyle: document.querySelector("#editorial-label-style"),
    labelBoxSize: document.querySelector("#editorial-label-box-size"),
    labelTracking: document.querySelector("#editorial-label-tracking"),
    labelLineHeight: document.querySelector("#editorial-label-line-height"),
    labelBoxOpacity: document.querySelector("#editorial-label-box-opacity"),
    labelZ: document.querySelector("#editorial-label-z"),
    labelLayer: document.querySelector("#editorial-label-layer"),
    overlapTextOpacity: document.querySelector("#editorial-overlap-text-opacity"),
    overlapImageOpacity: document.querySelector("#editorial-overlap-image-opacity"),
    overlapBrightness: document.querySelector("#editorial-overlap-brightness"),
    overlapPriority: document.querySelector("#editorial-overlap-priority"),
    heroStyle: document.querySelector("#editorial-hero-style"),
    textStyle: document.querySelector("#editorial-text-style"),
    outlineThickness: document.querySelector("#editorial-outline-thickness"),
    shadowOpacity: document.querySelector("#editorial-shadow-opacity"),
    duplicateOffsetX: document.querySelector("#editorial-duplicate-offset-x"),
    duplicateOffsetY: document.querySelector("#editorial-duplicate-offset-y"),
    brandOrbitTexts: document.querySelector("#editorial-brand-orbit-texts"),
    pushBrandOrbit: document.querySelector("#editorial-push-brand-orbit"),
    sectionToggles: [...document.querySelectorAll("[data-editorial-section]")],
    sectionContents: [...document.querySelectorAll("[data-editorial-section-content]")]
  },
  cinematic: {
    status: document.querySelector("#cinematic-status"),
    savePreset: document.querySelector("#cinematic-save-preset"),
    layoutPreset: document.querySelector("#cinematic-layout-preset"),
    showPoints: document.querySelector("#cinematic-show-points"),
    expansionRandomness: document.querySelector("#cinematic-expansion-randomness"),
    hoverProximityStrength: document.querySelector("#cinematic-hover-proximity-strength"),
    depthSpeed: document.querySelector("#cinematic-depth-speed-tab"),
    direction: document.querySelector("#cinematic-direction-tab"),
    backgroundColor: document.querySelector("#cinematic-background-color"),
    transparentBackground: document.querySelector("#cinematic-transparent-background"),
    exportRatio: document.querySelector("#cinematic-export-ratio"),
    exportSize: document.querySelector("#cinematic-export-size"),
    exportFrames: document.querySelector("#cinematic-export-frames"),
    exportDuration: document.querySelector("#cinematic-export-duration"),
    exportQuality: document.querySelector("#cinematic-export-quality"),
    exportFps: document.querySelector("#cinematic-export-fps")
  },
  saved: {
    nameInput: document.querySelector("#saved-composition-name"),
    saveButton: document.querySelector("#save-composition-button"),
    savePresetButton: document.querySelector("#save-preset-button"),
    clearSessionButton: document.querySelector("#clear-session-button"),
    list: document.querySelector("#saved-composition-list")
  },
  presets: {
    status: document.querySelector("#presets-status"),
    categoryFilter: document.querySelector("#preset-category-filter"),
    list: document.querySelector("#preset-library-list")
  },
  presetModal: {
    root: document.querySelector("#preset-modal"),
    status: document.querySelector("#preset-modal-status"),
    name: document.querySelector("#preset-modal-name"),
    category: document.querySelector("#preset-modal-category"),
    sourceTab: document.querySelector("#preset-modal-source-tab"),
    confirm: document.querySelector("#preset-modal-confirm"),
    cancel: document.querySelector("#preset-modal-cancel")
  },
  systemEditorial: {
    enabled: document.querySelector("#system-editorial-overlay-enabled"),
    load: document.querySelector("#system-editorial-load"),
    remove: document.querySelector("#system-editorial-remove"),
    status: document.querySelector("#system-editorial-status")
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
  renderMode: "points",
  strokeWidth: Number(elements.controls.strokeWidth.value),
  pointAppearance: {
    size: Number(elements.controls.pointSize.value),
    opacity: Number(elements.controls.pointOpacity.value),
    colorMode: elements.controls.pointColorMode.value,
    colorA: elements.controls.pointColorA.value,
    colorB: elements.controls.pointColorB.value
  },
  backgroundColor: elements.controls.backgroundColor.value,
  transparentBackground: elements.controls.transparentBackground.checked,
  glow: {
    enabled: elements.controls.glowEnabled.checked,
    basePointsOnly: Boolean(elements.controls.glowBasePointsOnly?.checked ?? true),
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
  },
  animationWorkbench: {
    enabled: false,
    duration: Number(elements.animationTab.duration?.value || 5),
    currentTime: Number(elements.animationTab.currentTime?.value || 0),
    loop: Boolean(elements.animationTab.loop?.checked ?? true),
    autoKey: Boolean(elements.animationTab.autoKey?.checked),
    easing: elements.animationTab.easing?.value || "ease-in-out",
    flightProfile: elements.animationTab.flightProfile?.value || "slow-fast",
    flightIntensity: Number(elements.animationTab.flightIntensity?.value || 0.65),
    advancedExpanded: false,
    captureComposition: Boolean(elements.animationTab.captureComposition?.checked),
    playing: false,
    keyframes: [],
    selectedKeyframeId: null
  },
  interactionMode: "none",
  stepMode: "none",
  expansionRandomness: Number(elements.controls.expansionRandomness.value),
  stepSettings: {
    filterKind: elements.controls.filterKind.value,
    boundaryShape: elements.controls.boundaryShape.value,
    fieldShape: elements.controls.fieldShape.value,
    trailLength: Number(elements.controls.trailLength.value),
    mediaSpacePreset: elements.controls.mediaSpacePreset.value,
    hoverProximityStrength: Number(elements.controls.hoverProximityStrength.value),
    cinematicDepthSpeed: Number(elements.controls.cinematicDepthSpeed.value),
    cinematicDirection: elements.controls.cinematicDirection.value
  },
  content: {
    density: Number(elements.controls.contentDensity.value),
    fillPoints: Number(elements.controls.contentFillPoints?.value || 0),
    hoverScale: Number(elements.controls.contentHoverScale?.value || 220),
    textFontFamily: elements.controls.pointTextFont?.value || "Space Grotesk",
    textUppercase: Boolean(elements.controls.pointTextUppercase?.checked ?? true),
    textBackground: Boolean(elements.controls.pointTextBackground?.checked ?? true),
    textColor: elements.controls.pointTextColor?.value || "#050505",
    textBackgroundColor: elements.controls.pointTextBackgroundColor?.value || "#ffffff",
    imageRatio: Number(elements.controls.imageRatio.value),
    textRatio: Number(elements.controls.textRatio.value),
    emptyRatio: Number(elements.controls.emptyRatio.value),
    layoutMode: elements.controls.contentLayoutMode.value,
    onlyMode: elements.controls.contentOnlyMode.checked,
    onlyType: elements.controls.contentOnlyType.value,
    texts: elements.controls.pointTextInput.value
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
  },
  axisStep: {
    enabled: elements.controls.axisStepEnabled.checked,
    guides: elements.controls.axisGuidesEnabled.checked
  },
  cinematic: {
    enabled: false,
    layoutPreset: elements.cinematic.layoutPreset?.value || "depth-field",
    showPoints: elements.cinematic.showPoints?.checked || false,
    expansionRandomness: Number(elements.cinematic.expansionRandomness?.value || 0.35),
    hoverProximityStrength: Number(elements.cinematic.hoverProximityStrength?.value || 0.9),
    depthSpeed: Number(elements.cinematic.depthSpeed?.value || 0.6),
    direction: elements.cinematic.direction?.value || "forward"
  },
  autoMotionPaused: false,
  brand: {
    enabled: false,
    preset: elements.brand.preset?.value || "hero-orbit",
    mainKind: elements.brand.mainKind?.value || "auto",
    mainText: elements.brand.mainText?.value || "",
    orbitTexts: elements.brand.orbitTexts?.value
      ? elements.brand.orbitTexts.value.split(/[,\n]+/).map((item) => item.trim().toUpperCase()).filter(Boolean)
      : [],
    titleText: elements.brand.titleText?.value || "",
    subtitleText: elements.brand.subtitleText?.value || "",
    tagText: elements.brand.tagText?.value || "",
    backgroundWord: elements.brand.backgroundWord?.value || "",
    textFontSize: Number(elements.brand.textFontSize?.value || 108),
    textAlign: elements.brand.textAlign?.value || "center",
    textColor: elements.brand.textColor?.value || "#f5f2ed",
    textLineHeight: Number(elements.brand.textLineHeight?.value || 0.92),
    textLetterSpacing: Number(elements.brand.textLetterSpacing?.value || 4),
    textOpacity: Number(elements.brand.textOpacity?.value || 0.92),
    mainScale: Number(elements.brand.mainScale?.value || 0),
    mainRotateX: Number(elements.brand.mainRotateX?.value || 0),
    mainRotateY: Number(elements.brand.mainRotateY?.value || 0),
    mainRotateZ: Number(elements.brand.mainRotateZ?.value || 0),
    mainDepth: Number(elements.brand.mainDepth?.value || 0),
    activeDepthOffset: Number(elements.brand.activeDepthOffset?.value || 0.35),
    mainTilt: Number(elements.brand.mainTilt?.value || 0),
    heroSkew: Number(elements.brand.heroSkew?.value || 0),
    heroOpacity: Number(elements.brand.heroOpacity?.value || 1),
    heroDominance: Number(elements.brand.heroDominance?.value || 2.1),
    showPoints: Boolean(elements.brand.showPoints?.checked ?? true),
    showImages: Boolean(elements.brand.showImages?.checked ?? true),
    showText: Boolean(elements.brand.showText?.checked ?? true),
    pointDensity: Number(elements.brand.pointDensity?.value || 1),
    pointSize: Number(elements.brand.pointSize?.value || 1),
    pointOpacity: Number(elements.brand.pointOpacity?.value || 0.18),
    pointColorMode: elements.brand.pointColorMode?.value || "solid",
    pointColorA: elements.brand.pointColorA?.value || "#ffffff",
    pointColorB: elements.brand.pointColorB?.value || "#d9d9d9",
    orbitSpeed: Number(elements.brand.orbitSpeed?.value || 0.62),
    orbitRadius: Number(elements.brand.orbitRadius?.value || 1.9),
    numberOfRings: Number(elements.brand.numberOfRings?.value || 2),
    orbitSpacing: Number(elements.brand.orbitSpacing?.value || 0.38),
    orbitRandomness: Number(elements.brand.orbitRandomness?.value || 0.28),
    orbitJitter: Number(elements.brand.orbitJitter?.value || 0.12),
    orbitMinScale: Number(elements.brand.orbitMinScale?.value || 0.82),
    orbitMaxScale: Number(elements.brand.orbitMaxScale?.value || 1.08),
    orbitDistance: Number(elements.brand.orbitDistance?.value || 1.9),
    orbitDepthSpread: Number(elements.brand.orbitDepthSpread?.value || 1.6),
    clusterStrength: Number(elements.brand.clusterStrength?.value || 0.4),
    attractionToHero: Number(elements.brand.attractionToHero?.value || 0.65),
    repulsionFromHero: Number(elements.brand.repulsionFromHero?.value || 0.22),
    orbitRandomRotation: Boolean(elements.brand.orbitRandomRotation?.checked),
    secondaryEmphasis: Number(elements.brand.secondaryEmphasis?.value || 0.9),
    backgroundSuppression: Number(elements.brand.backgroundSuppression?.value || 0.28),
    opacityFalloffByDepth: Number(elements.brand.opacityFalloffDepth?.value || 0.3),
    scaleFalloffByDistance: Number(elements.brand.scaleFalloffDistance?.value || 0.22),
    blurFalloffByDepth: Number(elements.brand.blurFalloffDepth?.value || 0),
    transitionStyle: elements.brand.transitionStyle?.value || "slide",
    transitionDuration: Number(elements.brand.transitionDuration?.value || 0.9),
    transitionEasing: elements.brand.transitionEasing?.value || "ease-in-out",
    cameraPreset: elements.brand.cameraPreset?.value || "medium",
    slowCameraDrift: Number(elements.brand.slowCameraDrift?.value || 0.18),
    parallaxStrength: Number(elements.brand.parallaxStrength?.value || 0.35),
    outputPreset: elements.brand.outputPreset?.value || "poster",
    glowEnabled: Boolean(elements.brand.glowEnabled?.checked ?? true),
    moodPreset: elements.brand.moodPreset?.value || "luxury",
    auraStrength: Number(elements.brand.auraStrength?.value || 0.65),
    auraRadius: Number(elements.brand.auraRadius?.value || 1.15),
    auraOpacity: Number(elements.brand.auraOpacity?.value || 0.42),
    memoryDuration: Number(elements.brand.memoryDuration?.value || 0.9),
    memoryOpacity: Number(elements.brand.memoryOpacity?.value || 0.32),
    memoryOffset: Number(elements.brand.memoryOffset?.value || 0.42),
    brandWeight: Number(elements.brand.brandWeight?.value || 1),
    dualHeroEnabled: Boolean(elements.brand.dualHeroEnabled?.checked),
    dualHeroDistance: Number(elements.brand.dualHeroDistance?.value || 1.5),
    dualHeroBalance: Number(elements.brand.dualHeroBalance?.value || 0.5),
    orbitLayoutSeed: 0
  },
  editorial: {
    enabled: false,
    context: "standalone",
    glowEnabled: Boolean(elements.editorial.glowEnabled?.checked ?? true),
    layoutPreset: elements.editorial.layoutPreset?.value || "hero-center",
    templatePreset: elements.editorial.templatePreset?.value || "luxury-campaign",
    heroText: elements.editorial.heroText?.value || "",
    heroTexts: parseEditorialBlocks(
      elements.editorial.heroText?.value || "",
      []
    ),
    heroFontFamily: elements.editorial.heroFont?.value || "Cormorant Garamond",
    heroFontSize: Number(elements.editorial.heroSize?.value || 280),
    heroTracking: Number(elements.editorial.heroTracking?.value || -6),
    heroLineHeight: Number(elements.editorial.heroLineHeight?.value || 0.9),
    heroOpacity: Number(elements.editorial.heroOpacity?.value || 1),
    heroColor: elements.editorial.heroColor?.value || "#ffffff",
    heroLayer: elements.editorial.heroLayer?.value || "front",
    heroX: Number(elements.editorial.heroX?.value || 0),
    heroY: Number(elements.editorial.heroY?.value || 0),
    heroZ: Number(elements.editorial.heroZ?.value || 0.32),
    heroMaxWidth: Number(elements.editorial.heroMaxWidth?.value || 4.4),
    heroBackground: Boolean(elements.editorial.heroBackground?.checked),
    heroBackgroundOpacity: Number(elements.editorial.heroBackgroundOpacity?.value || 0.2),
    heroBackgroundColor: elements.editorial.heroBackgroundColor?.value || "#000000",
    heroPaddingX: Number(elements.editorial.heroPaddingX?.value || 40),
    heroPaddingY: Number(elements.editorial.heroPaddingY?.value || 26),
    heroMaskEnabled: Boolean(elements.editorial.heroMaskEnabled?.checked),
    heroMaskType: elements.editorial.heroMaskType?.value || "rectangle",
    heroMaskWidth: Number(elements.editorial.heroMaskWidth?.value || 0.72),
    heroMaskHeight: Number(elements.editorial.heroMaskHeight?.value || 0.38),
    heroMaskX: Number(elements.editorial.heroMaskX?.value || 0),
    heroMaskY: Number(elements.editorial.heroMaskY?.value || 0),
    opticalSizeBias: Number(elements.editorial.opticalSizeBias?.value || 0),
    heroContrast: Number(elements.editorial.heroContrast?.value || 1),
    microContrast: Number(elements.editorial.microContrast?.value || 1),
    whitespaceBalance: Number(elements.editorial.whitespaceBalance?.value || 0.7),
    textDensity: Number(elements.editorial.textDensity?.value || 1),
    gridPreset: elements.editorial.gridPreset?.value || "2-column",
    gridSnap: Number(elements.editorial.gridSnap?.value || 0),
    gridMargin: Number(elements.editorial.gridMargin?.value || 0.14),
    gridGutter: Number(elements.editorial.gridGutter?.value || 0.08),
    frameLogic: elements.editorial.frameLogic?.value || "under-hero",
    imageFollowHero: Boolean(elements.editorial.imageFollowHero?.checked ?? true),
    imageScaleBias: Number(elements.editorial.imageScaleBias?.value || 1),
    animationPreset: elements.editorial.animationPreset?.value || "none",
    animationSpeed: Number(elements.editorial.animationSpeed?.value || 0.4),
    animationIntensity: Number(elements.editorial.animationIntensity?.value || 0.35),
    labelsText: elements.editorial.labelsText?.value
      ? elements.editorial.labelsText.value.split(/[,\n]+/).map((item) => item.trim()).filter(Boolean)
      : [],
    labelsSize: Number(elements.editorial.labelsSize?.value || 24),
    labelsTracking: Number(elements.editorial.labelsTracking?.value || 14),
    labelsSpacing: Number(elements.editorial.labelsSpacing?.value || 0.75),
    labelsAlign: elements.editorial.labelsAlign?.value || "spread",
    labelsZ: Number(elements.editorial.labelsZ?.value || 0),
    labelsLayer: elements.editorial.labelsLayer?.value || "front",
    textFontFamily: elements.editorial.textFont?.value || "Cormorant Garamond",
    metadataFontFamily: elements.editorial.metadataFont?.value || "IBM Plex Mono",
    labelFontFamily: elements.editorial.labelFont?.value || "Space Grotesk",
    infoText: elements.editorial.infoText?.value || "",
    infoTexts: parseEditorialBlocks(
      elements.editorial.infoText?.value || "",
      []
    ),
    infoBlockSettings: [],
    infoFontSize: Number(elements.editorial.infoFontSize?.value || 38),
    infoTracking: Number(elements.editorial.infoTracking?.value || 0),
    infoLineHeight: Number(elements.editorial.infoLineHeight?.value || 1),
    infoWidth: Number(elements.editorial.infoWidth?.value || 1.9),
    infoHeight: Number(elements.editorial.infoHeight?.value || 0.92),
    infoPadding: Number(elements.editorial.infoPadding?.value || 30),
    infoAlign: elements.editorial.infoAlign?.value || "left",
    infoX: Number(elements.editorial.infoX?.value || 1.25),
    infoY: Number(elements.editorial.infoY?.value || -0.52),
    infoZ: Number(elements.editorial.infoZ?.value || 0.42),
    infoLayer: elements.editorial.infoLayer?.value || "front",
    infoBorder: Boolean(elements.editorial.infoBorder?.checked ?? true),
    secondaryText: elements.editorial.secondaryText?.value || "",
    secondaryTexts: parseEditorialBlocks(
      elements.editorial.secondaryText?.value || "",
      []
    ),
    secondarySize: Number(elements.editorial.secondarySize?.value || 26),
    secondaryTracking: Number(elements.editorial.secondaryTracking?.value || 4),
    secondaryLineHeight: Number(elements.editorial.secondaryLineHeight?.value || 1),
    secondaryOpacity: Number(elements.editorial.secondaryOpacity?.value || 0.86),
    secondaryX: Number(elements.editorial.secondaryX?.value || 1.25),
    secondaryY: Number(elements.editorial.secondaryY?.value || -1.2),
    secondaryZ: Number(elements.editorial.secondaryZ?.value || 0.46),
    secondaryLayer: elements.editorial.secondaryLayer?.value || "front",
    showGuides: Boolean(elements.editorial.showGuides?.checked),
    mediaOpacity: Number(elements.editorial.mediaOpacity?.value || 0.92),
    mediaScale: Number(elements.editorial.mediaScale?.value || 1),
    labelTexts: parseEditorialBlocks(elements.editorial.labelBoxes?.value || "", []),
    labelStyle: elements.editorial.labelStyle?.value || "outline",
    labelBoxSize: Number(elements.editorial.labelBoxSize?.value || 24),
    labelTracking: Number(elements.editorial.labelTracking?.value || 2),
    labelLineHeight: Number(elements.editorial.labelLineHeight?.value || 1),
    labelBoxOpacity: Number(elements.editorial.labelBoxOpacity?.value || 1),
    labelZ: Number(elements.editorial.labelZ?.value || 0.28),
    labelLayer: elements.editorial.labelLayer?.value || "front",
    overlapTextOpacity: Number(elements.editorial.overlapTextOpacity?.value || 0.72),
    overlapImageOpacity: Number(elements.editorial.overlapImageOpacity?.value || 0.82),
    overlapBrightness: Number(elements.editorial.overlapBrightness?.value || -0.1),
    overlapPriority: Number(elements.editorial.overlapPriority?.value || 0.7),
    heroStyle: elements.editorial.heroStyle?.value || "fill",
    textStyle: elements.editorial.textStyle?.value || "fill",
    outlineThickness: Number(elements.editorial.outlineThickness?.value || 2),
    shadowOpacity: Number(elements.editorial.shadowOpacity?.value || 0.2),
    duplicateOffsetX: Number(elements.editorial.duplicateOffsetX?.value || 16),
    duplicateOffsetY: Number(elements.editorial.duplicateOffsetY?.value || 10),
    brandOrbitTexts: parseEditorialBlocks(elements.editorial.brandOrbitTexts?.value || "", []),
    offsets: createDefaultEditorialOffsets(),
    backdropOffset: [0, 0, 0]
  },
  systemEditorialOverlay: {
    enabled: false
  },
  handMode: elements.hand.mode?.value || "system",
  export: {
    ratio: elements.controls.exportRatio.value,
    size: Number(elements.controls.exportSize.value),
    frames: Number(elements.controls.exportFrames.value),
    duration: Number(elements.controls.exportDuration.value),
    quality: Number(elements.controls.exportQuality.value),
    fps: Number(elements.controls.exportFps.value)
  }
};

sanitizeLegacyEditorialDefaults(state.editorial);
const DEFAULT_STATE = JSON.parse(JSON.stringify(state));

let studio = null;
let handControl = null;

let rebuildTimer = 0;
let persistTimer = 0;
let isSyncingLetterPanel = false;
let selectedPanelTab = "system";
let presetLibrary = [];
let activePresetDraft = null;
let animationPlaybackFrame = 0;
let animationPlaybackStartedAt = 0;
let animationPlaybackBaseTime = 0;
let animationSourceTab = "system";
let animationAutoKeySignature = "";
let animationKeyframeDrag = null;
let animationSuppressTrackClickUntil = 0;
let previousStepModeBeforeHand = "none";
let previousStepModeBeforeCinematic = "none";
let handVariationBaseIntensity = state.variation.intensity;
let compositionHistory = [];
let restoredSessionPayload = null;
let persistedAssets = {
  pointImages: [],
  brandMainImages: [],
  brandOrbitImages: [],
  uploadedFonts: []
};

function parseEditorialBlocks(value, fallback = []) {
  if (typeof value !== "string") {
    return Array.isArray(fallback) ? fallback : [];
  }

  const normalized = value.replace(/\\n/g, "\n");

  return normalized
    .split(/\n\s*---+\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinEditorialBlocks(blocks, fallback = "") {
  if (!Array.isArray(blocks)) {
    return fallback;
  }

  return blocks.filter(Boolean).join("\n---\n");
}

function createDefaultEditorialInfoBlockSetting(editorial = {}, index = 0) {
  return {
    fontSize: Number(editorial?.infoFontSize ?? 38),
    tracking: Number(editorial?.infoTracking ?? 0),
    lineHeight: Number(editorial?.infoLineHeight ?? 1),
    width: Number(editorial?.infoWidth ?? 1.9),
    height: Number(editorial?.infoHeight ?? 0.92),
    padding: Number(editorial?.infoPadding ?? 30),
    align: editorial?.infoAlign || "left",
    x: Number(editorial?.infoX ?? 1.25),
    y: Number((editorial?.infoY ?? -0.52) - index * ((editorial?.infoHeight ?? 0.92) + 0.22)),
    z: Number(editorial?.infoZ ?? 0.42),
    layer: editorial?.infoLayer || "front",
    border: Boolean(editorial?.infoBorder ?? true)
  };
}

function normalizeEditorialInfoBlockSettings(editorial, targetLength = null) {
  const fallbackEditorial = editorial || {};
  const normalizedTexts = Number.isFinite(targetLength)
    ? new Array(Math.max(0, targetLength)).fill("")
    : parseEditorialBlocks(
        fallbackEditorial.infoText || "",
        Array.isArray(fallbackEditorial.infoTexts) ? fallbackEditorial.infoTexts : []
      );
  const length = Number.isFinite(targetLength) ? Math.max(0, targetLength) : normalizedTexts.length;
  const existing = Array.isArray(fallbackEditorial.infoBlockSettings) ? fallbackEditorial.infoBlockSettings : [];
  const next = [];

  for (let index = 0; index < length; index += 1) {
    const defaults = createDefaultEditorialInfoBlockSetting(fallbackEditorial, index);
    const current = existing[index] && typeof existing[index] === "object" ? existing[index] : {};
    next.push({
      fontSize: Number(current.fontSize ?? defaults.fontSize),
      tracking: Number(current.tracking ?? defaults.tracking),
      lineHeight: Number(current.lineHeight ?? defaults.lineHeight),
      width: Number(current.width ?? defaults.width),
      height: Number(current.height ?? defaults.height),
      padding: Number(current.padding ?? defaults.padding),
      align: current.align || defaults.align,
      x: Number(current.x ?? defaults.x),
      y: Number(current.y ?? defaults.y),
      z: Number(current.z ?? defaults.z),
      layer: current.layer || defaults.layer,
      border: Boolean(current.border ?? defaults.border)
    });
  }

  return next;
}

function updateEditorialInfoBlockSetting(index, patch, options = {}) {
  if (!Number.isInteger(index) || index < 0) {
    return;
  }

  state.editorial.infoBlockSettings = normalizeEditorialInfoBlockSettings(
    state.editorial,
    state.editorial.infoTexts?.length || 0
  );

  const current = state.editorial.infoBlockSettings[index]
    || createDefaultEditorialInfoBlockSetting(state.editorial, index);

  state.editorial.infoBlockSettings[index] = {
    ...current,
    ...patch
  };

  updateOutputs();

  if (selectedPanelTab === "editorial") {
    applyState();
  } else {
    scheduleSessionPersist();
  }

  if (options.render !== false) {
    renderEditorialBlockEditors();
  }
}

const EDITORIAL_BLOCK_GROUPS = {
  hero: {
    containerKey: "heroBlockList",
    textareaKey: "heroText",
    offsetKey: "heroBlocks",
    title: "Hero",
    placeholder: "Type hero text..."
  },
  info: {
    containerKey: "infoBlockList",
    textareaKey: "infoText",
    offsetKey: "infoBlocks",
    title: "Text Block",
    placeholder: "Type text block..."
  },
  secondary: {
    containerKey: "secondaryBlockList",
    textareaKey: "secondaryText",
    offsetKey: "secondaryBlocks",
    title: "Secondary",
    placeholder: "Type secondary text..."
  },
  label: {
    containerKey: "labelBlockList",
    textareaKey: "labelBoxes",
    offsetKey: "labelBlocks",
    title: "Label",
    placeholder: "Type label text..."
  }
};

function getEditorialBlockGroup(type) {
  return EDITORIAL_BLOCK_GROUPS[type] || null;
}

function applyEditorialBlockTextareaChange(type, blocks, options = {}) {
  const config = getEditorialBlockGroup(type);

  if (!config) {
    return;
  }

  const textarea = elements.editorial?.[config.textareaKey];

  if (!textarea) {
    return;
  }

  const nextBlocks = Array.isArray(blocks) ? blocks.map((item) => String(item || "").trim()).filter(Boolean) : [];
  textarea.value = joinEditorialBlocks(nextBlocks, "");

  if (config.offsetKey && state.editorial?.offsets?.[config.offsetKey]) {
    state.editorial.offsets[config.offsetKey] = state.editorial.offsets[config.offsetKey].slice(0, nextBlocks.length);
  }

  if (type === "info") {
    state.editorial.infoBlockSettings = normalizeEditorialInfoBlockSettings(state.editorial, nextBlocks.length);
  }

  if (type === "hero" && !nextBlocks.length) {
    state.editorial.offsets.hero = [0, 0, 0];
  }

  updateVisualState();
  updateOutputs();

  if (selectedPanelTab === "editorial") {
    applyState();
  } else {
    scheduleSessionPersist();
  }

  if (options.render !== false) {
    renderEditorialBlockEditors();
  }
}

function renderEditorialBlockEditors() {
  for (const [type, config] of Object.entries(EDITORIAL_BLOCK_GROUPS)) {
    const container = elements.editorial?.[config.containerKey];
    const textarea = elements.editorial?.[config.textareaKey];

    if (!container || !textarea) {
      continue;
    }

    const blocks = parseEditorialBlocks(textarea.value || "", []);
    container.textContent = "";

    if (!blocks.length) {
      const empty = document.createElement("div");
      empty.className = "editorial-block-empty";
      empty.textContent = "No blocks yet. Add one with the + button above.";
      container.append(empty);
      continue;
    }

    blocks.forEach((block, index) => {
      const card = document.createElement("div");
      card.className = "editorial-block-card";

      const header = document.createElement("div");
      header.className = "editorial-block-card-header";

      const title = document.createElement("div");
      title.className = "editorial-block-card-title";
      title.textContent = `${config.title} ${index + 1}`;

      const actions = document.createElement("div");
      actions.className = "editorial-block-card-actions";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button button--subtle";
      remove.textContent = "−";
      remove.dataset.editorialBlockAction = "remove";
      remove.dataset.editorialBlockType = type;
      remove.dataset.editorialBlockIndex = String(index);

      actions.append(remove);
      header.append(title, actions);

      const field = document.createElement("textarea");
      field.rows = Math.max(3, String(block).split("\n").length + 1);
      field.spellcheck = false;
      field.placeholder = config.placeholder;
      field.value = block;
      field.dataset.editorialBlockType = type;
      field.dataset.editorialBlockIndex = String(index);

      field.addEventListener("input", () => {
        const currentBlocks = parseEditorialBlocks(textarea.value || "", []);
        currentBlocks[index] = field.value;
        applyEditorialBlockTextareaChange(type, currentBlocks, { render: false });
      });

      card.append(header, field);

      if (type === "info") {
        state.editorial.infoBlockSettings = normalizeEditorialInfoBlockSettings(state.editorial, blocks.length);
        const blockSettings = state.editorial.infoBlockSettings[index]
          || createDefaultEditorialInfoBlockSetting(state.editorial, index);
        const settingsGrid = document.createElement("div");
        settingsGrid.className = "editorial-block-card-grid";

        const appendControl = (labelText, control) => {
          const label = document.createElement("label");
          label.className = "field";
          const title = document.createElement("span");
          title.textContent = labelText;
          label.append(title, control);
          settingsGrid.append(label);
        };

        const makeRange = (value, min, max, step, onInput) => {
          const input = document.createElement("input");
          input.type = "range";
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(value);
          input.addEventListener("input", () => onInput(Number(input.value)));
          return input;
        };

        const makeSelect = (value, options, onInput) => {
          const select = document.createElement("select");
          for (const optionConfig of options) {
            const option = document.createElement("option");
            option.value = optionConfig.value;
            option.textContent = optionConfig.label;
            select.append(option);
          }
          select.value = value;
          select.addEventListener("input", () => onInput(select.value));
          return select;
        };

        const makeToggle = (value, onInput) => {
          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = Boolean(value);
          input.addEventListener("input", () => onInput(input.checked));
          return input;
        };

        appendControl("Text Size", makeRange(blockSettings.fontSize, 12, 160, 1, (value) => {
          updateEditorialInfoBlockSetting(index, { fontSize: value }, { render: false });
        }));
        appendControl("Tracking", makeRange(blockSettings.tracking, -20, 60, 1, (value) => {
          updateEditorialInfoBlockSetting(index, { tracking: value }, { render: false });
        }));
        appendControl("Line Height", makeRange(blockSettings.lineHeight, 0.7, 2, 0.01, (value) => {
          updateEditorialInfoBlockSetting(index, { lineHeight: value }, { render: false });
        }));
        appendControl("Box Width", makeRange(blockSettings.width, 0.8, 4, 0.01, (value) => {
          updateEditorialInfoBlockSetting(index, { width: value }, { render: false });
        }));
        appendControl("Box Height", makeRange(blockSettings.height, 0.4, 2.4, 0.01, (value) => {
          updateEditorialInfoBlockSetting(index, { height: value }, { render: false });
        }));
        appendControl("Padding", makeRange(blockSettings.padding, 8, 80, 1, (value) => {
          updateEditorialInfoBlockSetting(index, { padding: value }, { render: false });
        }));
        appendControl("Alignment", makeSelect(
          blockSettings.align,
          [
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" }
          ],
          (value) => updateEditorialInfoBlockSetting(index, { align: value }, { render: false })
        ));
        appendControl("Position X", makeRange(blockSettings.x, -2.4, 2.4, 0.01, (value) => {
          updateEditorialInfoBlockSetting(index, { x: value }, { render: false });
        }));
        appendControl("Position Y", makeRange(blockSettings.y, -2.4, 2.4, 0.01, (value) => {
          updateEditorialInfoBlockSetting(index, { y: value }, { render: false });
        }));
        appendControl("Depth", makeRange(blockSettings.z, -2, 2, 0.01, (value) => {
          updateEditorialInfoBlockSetting(index, { z: value }, { render: false });
        }));
        appendControl("Layer", makeSelect(
          blockSettings.layer,
          [
            { value: "front", label: "In Front of Image" },
            { value: "behind-image", label: "Behind Hero Image" }
          ],
          (value) => updateEditorialInfoBlockSetting(index, { layer: value }, { render: false })
        ));
        appendControl("Border", makeToggle(blockSettings.border, (value) => {
          updateEditorialInfoBlockSetting(index, { border: value }, { render: false });
        }));

        card.append(settingsGrid);
      }

      container.append(card);
    });
  }
}

function createDefaultEditorialOffsets() {
  return {
    hero: [0, 0, 0],
    heroBlocks: [],
    labels: [0, 0, 0],
    info: [0, 0, 0],
    secondary: [0, 0, 0],
    infoBlocks: [],
    secondaryBlocks: [],
    labelBlocks: []
  };
}

function sanitizeLegacyEditorialDefaults(editorial) {
  if (!editorial || typeof editorial !== "object") {
    return editorial;
  }

  const labelsText = Array.isArray(editorial.labelsText) ? editorial.labelsText.filter(Boolean) : [];
  const infoTexts = Array.isArray(editorial.infoTexts) ? editorial.infoTexts.filter(Boolean) : [];
  const secondaryTexts = Array.isArray(editorial.secondaryTexts) ? editorial.secondaryTexts.filter(Boolean) : [];
  const labelTexts = Array.isArray(editorial.labelTexts) ? editorial.labelTexts.filter(Boolean) : [];
  const brandOrbitTexts = Array.isArray(editorial.brandOrbitTexts) ? editorial.brandOrbitTexts.filter(Boolean) : [];

  if (editorial.heroText === "YULIAWAVE") {
    editorial.heroText = "";
  }
  if (JSON.stringify(labelsText) === JSON.stringify(["BRAND", "EDITION", "PARIS", "2026"])) {
    editorial.labelsText = [];
  }
  if (JSON.stringify(infoTexts) === JSON.stringify(["-20%\nNIZHNY NOVGOROD\nUL. MIRA, 15"])) {
    editorial.infoText = "";
    editorial.infoTexts = [];
  }
  if (JSON.stringify(secondaryTexts) === JSON.stringify(["LIMITED EDITION / YEAR"])) {
    editorial.secondaryText = "";
    editorial.secondaryTexts = [];
  }
  if (JSON.stringify(labelTexts) === JSON.stringify(["LIMITED DROP", "SEASON 26", "ARCHIVE"])) {
    editorial.labelTexts = [];
  }
  if (JSON.stringify(brandOrbitTexts) === JSON.stringify(["SLOGAN", "CATEGORY", "KEYWORD"])) {
    editorial.brandOrbitTexts = [];
  }

  editorial.infoBlockSettings = normalizeEditorialInfoBlockSettings(
    editorial,
    Array.isArray(editorial.infoTexts) ? editorial.infoTexts.length : 0
  );

  return editorial;
}

function createKeyframeId() {
  return globalThis.crypto?.randomUUID?.() || `keyframe-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

function sortAnimationKeyframes(keyframes = []) {
  return [...keyframes].sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
}

function getAnimationDurationSeconds() {
  return Math.max(0.1, Number(state.animationWorkbench.duration || 5));
}

function getAnimationCurrentTimeSeconds() {
  return THREE.MathUtils.clamp(Number(state.animationWorkbench.currentTime || 0), 0, getAnimationDurationSeconds());
}

function getAnimationPlaybackBounds() {
  const keyframes = sortAnimationKeyframes(state.animationWorkbench.keyframes);

  if (!keyframes.length) {
    return {
      firstTime: 0,
      lastTime: getAnimationDurationSeconds(),
      spanSeconds: getAnimationDurationSeconds()
    };
  }

  const firstTime = Math.max(0, Number(keyframes[0]?.time || 0));
  const lastTime = Math.max(firstTime + 0.01, Number(keyframes[keyframes.length - 1]?.time || getAnimationDurationSeconds()));

  return {
    firstTime,
    lastTime,
    spanSeconds: Math.max(0.01, lastTime - firstTime)
  };
}

function syncAnimationTimelineRange() {
  if (!elements.animationTab.currentTime) {
    return;
  }

  const duration = getAnimationDurationSeconds();
  elements.animationTab.currentTime.max = String(duration);
  elements.animationTab.currentTime.min = "0";
  elements.animationTab.currentTime.step = "0.01";
  elements.animationTab.currentTime.value = String(THREE.MathUtils.clamp(
    Number(elements.animationTab.currentTime.value || 0),
    0,
    duration
  ));
}

function getAnimationKeyframeById(id) {
  return (state.animationWorkbench.keyframes || []).find((item) => item.id === id) || null;
}

function getNearestAnimationKeyframe(time, threshold = 0.15) {
  const keyframes = sortAnimationKeyframes(state.animationWorkbench.keyframes);
  let nearest = null;
  let nearestDistance = Infinity;

  for (const keyframe of keyframes) {
    const distance = Math.abs((keyframe.time ?? 0) - time);
    if (distance < nearestDistance) {
      nearest = keyframe;
      nearestDistance = distance;
    }
  }

  return nearestDistance <= threshold ? nearest : null;
}

function buildAnimationAutoKeySignature(pose, sourceState) {
  return JSON.stringify({
    pose: pose
      ? {
          position: {
            x: Number(pose.position.x.toFixed(4)),
            y: Number(pose.position.y.toFixed(4)),
            z: Number(pose.position.z.toFixed(4))
          },
          target: {
            x: Number(pose.target.x.toFixed(4)),
            y: Number(pose.target.y.toFixed(4)),
            z: Number(pose.target.z.toFixed(4))
          },
          fov: Number((pose.fov ?? 0).toFixed(4))
        }
      : null,
    sourceState
  });
}

function applyAnimationEasing(t, easing = state.animationWorkbench.easing, intensity = state.animationWorkbench.flightIntensity) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  const k = THREE.MathUtils.clamp(intensity ?? 0.65, 0, 1);

  switch (easing) {
    case "ease-in":
      return THREE.MathUtils.lerp(x, x * x * x, 0.45 + k * 0.4);
    case "ease-out": {
      const eased = 1 - Math.pow(1 - x, 3);
      return THREE.MathUtils.lerp(x, eased, 0.45 + k * 0.4);
    }
    case "smooth":
      return THREE.MathUtils.smoothstep(x, 0, 1);
    case "cinematic": {
      const base = THREE.MathUtils.smoothstep(x, 0, 1);
      const shaped = x < 0.5
        ? 0.5 * Math.pow(x * 2, 1.5 + k * 1.5)
        : 1 - 0.5 * Math.pow((1 - x) * 2, 1.5 + k * 1.5);
      return THREE.MathUtils.lerp(base, shaped, 0.55 + k * 0.35);
    }
    case "ease-in-out":
    default:
      return x * x * (3 - 2 * x);
  }
}

function applyFlightProfile(t, profile = state.animationWorkbench.flightProfile, intensity = state.animationWorkbench.flightIntensity) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  const k = THREE.MathUtils.clamp(intensity ?? 0.65, 0, 1);

  switch (profile) {
    case "gentle":
      return THREE.MathUtils.lerp(x, x * x * (3 - 2 * x), 0.25 + k * 0.25);
    case "slow-fast":
      return Math.pow(x, 1.2 + k * 1.8);
    case "fast-slow":
      return 1 - Math.pow(1 - x, 1.2 + k * 1.8);
    case "dramatic": {
      if (x < 0.6) {
        return 0.6 * Math.pow(x / 0.6, 2.2 + k * 2.2);
      }
      return 0.6 + 0.4 * Math.pow((x - 0.6) / 0.4, 0.7);
    }
    case "even":
    default:
      return x;
  }
}

function interpolateCameraPose(a, b, t) {
  if (!a) {
    return b || null;
  }
  if (!b) {
    return a;
  }

  const mix = THREE.MathUtils.clamp(t, 0, 1);
  return {
    position: {
      x: THREE.MathUtils.lerp(a.position.x, b.position.x, mix),
      y: THREE.MathUtils.lerp(a.position.y, b.position.y, mix),
      z: THREE.MathUtils.lerp(a.position.z, b.position.z, mix)
    },
    target: {
      x: THREE.MathUtils.lerp(a.target.x, b.target.x, mix),
      y: THREE.MathUtils.lerp(a.target.y, b.target.y, mix),
      z: THREE.MathUtils.lerp(a.target.z, b.target.z, mix)
    },
    fov: THREE.MathUtils.lerp(a.fov ?? state.camera.fov, b.fov ?? state.camera.fov, mix)
  };
}

function getCameraPoseAtTime(timeSeconds) {
  const keyframes = sortAnimationKeyframes(state.animationWorkbench.keyframes);

  if (!keyframes.length) {
    return null;
  }

  const clampedTime = THREE.MathUtils.clamp(timeSeconds, 0, getAnimationDurationSeconds());
  let previous = keyframes[0];
  let next = keyframes[keyframes.length - 1];

  for (let index = 0; index < keyframes.length; index += 1) {
    if (keyframes[index].time <= clampedTime) {
      previous = keyframes[index];
    }
    if (keyframes[index].time >= clampedTime) {
      next = keyframes[index];
      break;
    }
  }

  if (previous.id === next.id) {
    return previous.pose;
  }

  const span = Math.max(0.0001, next.time - previous.time);
  const localT = (clampedTime - previous.time) / span;
  const easedT = applyAnimationEasing(
    applyFlightProfile(localT, state.animationWorkbench.flightProfile, state.animationWorkbench.flightIntensity),
    state.animationWorkbench.easing,
    state.animationWorkbench.flightIntensity
  );
  return interpolateCameraPose(previous.pose, next.pose, easedT);
}

function normalizeEditorialOffsets(offsets) {
  const source = offsets && typeof offsets === "object" ? offsets : {};
  const normalizeVec = (value) => Array.isArray(value)
    ? [
        Number(value[0] || 0),
        Number(value[1] || 0),
        Number(value[2] || 0)
      ]
    : [0, 0, 0];
  const normalizePool = (pool) => Array.isArray(pool)
    ? pool.map((value) => normalizeVec(value))
    : [];

  return {
    hero: normalizeVec(source.hero),
    heroBlocks: normalizePool(source.heroBlocks),
    labels: normalizeVec(source.labels),
    info: normalizeVec(source.info),
    secondary: normalizeVec(source.secondary),
    infoBlocks: normalizePool(source.infoBlocks),
    secondaryBlocks: normalizePool(source.secondaryBlocks),
    labelBlocks: normalizePool(source.labelBlocks)
  };
}

function normalizeEditorialBackdropOffset(value) {
  return Array.isArray(value)
    ? [
        Number(value[0] || 0),
        Number(value[1] || 0),
        Number(value[2] || 0)
      ]
    : [0, 0, 0];
}

function ensureSelectOption(select, value, label) {
  if (!select || !value) {
    return;
  }

  const existing = [...select.options].find((option) => option.value === value);

  if (existing) {
    if (label) {
      existing.textContent = label;
    }
    return;
  }

  const option = document.createElement("option");
  option.value = value;
  option.textContent = label || value;
  select.append(option);
}

async function persistUploadedFont(file, target, family, label) {
  const [source] = await readFilesAsDataUrls([file]);

  if (!source) {
    return;
  }

  persistedAssets.uploadedFonts = [
    ...(persistedAssets.uploadedFonts || []).filter((item) => !(item.target === target && item.family === family)),
    { source, target, family, label }
  ];
}

async function applyPersistedFontsToUi() {
  const uploadedFonts = Array.isArray(persistedAssets.uploadedFonts) ? persistedAssets.uploadedFonts : [];

  for (const item of uploadedFonts) {
    if (!item?.source || !item?.family) {
      continue;
    }

    try {
      const { family, label } = await loadFontFromSource(item.source, item.family, item.label || item.family);
      const optionLabel = `${label} (Upload)`;

      if (item.target === "typography") {
        ensureSelectOption(elements.fontSelect, family, optionLabel);
      } else if (item.target === "system-content") {
        ensureSelectOption(elements.controls.pointTextFont, family, optionLabel);
      } else if (item.target === "editorial-hero") {
        ensureSelectOption(elements.editorial.heroFont, family, optionLabel);
      } else if (item.target === "editorial-text") {
        ensureSelectOption(elements.editorial.textFont, family, optionLabel);
      }
    } catch (error) {
      console.warn(`Unable to restore uploaded font ${item.label || item.family}.`, error);
    }
  }
}

function setStatus(message) {
  elements.status.textContent = message;
  if (elements.hand.exportStatus) {
    elements.hand.exportStatus.textContent = message;
  }
  if (elements.animationTab.status) {
    elements.animationTab.status.textContent = message;
  }
  if (elements.brand.status) {
    elements.brand.status.textContent = message;
  }
  if (elements.editorial.status) {
    elements.editorial.status.textContent = message;
  }
  if (elements.editorial.exportStatus) {
    elements.editorial.exportStatus.textContent = message;
  }
  if (elements.cinematic.status) {
    elements.cinematic.status.textContent = message;
  }
  if (elements.presets.status) {
    elements.presets.status.textContent = message;
  }
  if (elements.presetModal.status && !elements.presetModal.root?.hidden) {
    elements.presetModal.status.textContent = message;
  }
}

function syncSystemEditorialStatus() {
  if (!elements.systemEditorial.status) {
    return;
  }

  const overlay = state.systemEditorialOverlay || {};
  const hasOverlay = Boolean(Object.keys(overlay).length > 1 || overlay.heroText);

  if (!hasOverlay) {
    elements.systemEditorial.status.textContent = "No editorial overlay saved for System.";
    return;
  }

  elements.systemEditorial.status.textContent = overlay.enabled
    ? "Editorial overlay is active in System."
    : "Editorial overlay is saved for System but hidden.";
}

function setHandStatus(message) {
  elements.hand.status.textContent = message;
}

function setEditorialSectionExpanded(sectionName, expanded) {
  if (!sectionName) {
    return;
  }

  const sectionLabels = {
    hero: "Hero",
    "top-labels": "Top Labels",
    info: "Text Blocks",
    secondary: "Secondary Text",
    labels: "Labels"
  };

  for (const content of elements.editorial.sectionContents || []) {
    if (content.dataset.editorialSectionContent === sectionName) {
      content.hidden = !expanded;
    }
  }

  for (const button of elements.editorial.sectionToggles || []) {
    if (button.dataset.editorialSection === sectionName) {
      const label = sectionLabels[sectionName]
        || button.textContent.replace(/^[▾▸]\s*/, "").replace(/^Toggle\s*/i, "").trim()
        || sectionName;
      button.textContent = `${expanded ? "▾" : "▸"} ${label}`;
      button.setAttribute("aria-expanded", expanded ? "true" : "false");
    }
  }
}

function syncBrandExportControlsFromMain() {
  if (!elements.brand.exportRatio) {
    return;
  }

  elements.brand.backgroundColor.value = elements.controls.backgroundColor.value;
  elements.brand.transparentBackground.checked = elements.controls.transparentBackground.checked;
  elements.brand.exportRatio.value = elements.controls.exportRatio.value;
  elements.brand.exportSize.value = elements.controls.exportSize.value;
  elements.brand.exportFrames.value = elements.controls.exportFrames.value;
  elements.brand.exportDuration.value = elements.controls.exportDuration.value;
  elements.brand.exportQuality.value = elements.controls.exportQuality.value;
  elements.brand.exportFps.value = elements.controls.exportFps.value;
}

function syncHandExportControlsFromMain() {
  if (!elements.hand.exportRatio) {
    return;
  }

  elements.hand.exportRatio.value = elements.controls.exportRatio.value;
  elements.hand.exportSize.value = elements.controls.exportSize.value;
  elements.hand.exportFrames.value = elements.controls.exportFrames.value;
  elements.hand.exportDuration.value = elements.controls.exportDuration.value;
  elements.hand.exportQuality.value = elements.controls.exportQuality.value;
  elements.hand.exportFps.value = elements.controls.exportFps.value;
}

function syncCinematicExportControlsFromMain() {
  if (!elements.cinematic.exportRatio) {
    return;
  }

  elements.cinematic.backgroundColor.value = elements.controls.backgroundColor.value;
  elements.cinematic.transparentBackground.checked = elements.controls.transparentBackground.checked;
  elements.cinematic.exportRatio.value = elements.controls.exportRatio.value;
  elements.cinematic.exportSize.value = elements.controls.exportSize.value;
  elements.cinematic.exportFrames.value = elements.controls.exportFrames.value;
  elements.cinematic.exportDuration.value = elements.controls.exportDuration.value;
  elements.cinematic.exportQuality.value = elements.controls.exportQuality.value;
  elements.cinematic.exportFps.value = elements.controls.exportFps.value;
}

function syncAnimationExportControlsFromMain() {
  if (!elements.animationTab.exportQuality) {
    return;
  }

  elements.animationTab.exportQuality.value = elements.controls.exportQuality.value;
  elements.animationTab.exportFps.value = elements.controls.exportFps.value;
}

function syncMainExportControlsFromAnimation() {
  if (!elements.animationTab.exportQuality) {
    return;
  }

  elements.controls.exportQuality.value = elements.animationTab.exportQuality.value;
  elements.controls.exportFps.value = elements.animationTab.exportFps.value;
}

function renderAnimationKeyframeList() {
  if (!elements.animationTab.keyframeList) {
    return;
  }

  const keyframes = sortAnimationKeyframes(state.animationWorkbench.keyframes);

  if (!keyframes.length) {
    elements.animationTab.keyframeList.innerHTML = "<p class=\"status\">No keyframes yet. Move the preview camera and add your first one.</p>";
    return;
  }

  elements.animationTab.keyframeList.innerHTML = keyframes.map((item, index) => `
    <article class="saved-item" data-keyframe-id="${item.id}">
      <div class="saved-item__meta">
        <strong>${index + 1}. ${Number(item.time || 0).toFixed(2)}s</strong>
        <span>${Math.round(((item.time || 0) / getAnimationDurationSeconds()) * 100)}% · FOV ${Number(item.pose?.fov || state.camera.fov).toFixed(1)}${item.sourceState ? " · layout" : ""}</span>
      </div>
      <div class="saved-item__actions">
        <button type="button" data-keyframe-action="seek">Go</button>
        <button type="button" data-keyframe-action="select">${state.animationWorkbench.selectedKeyframeId === item.id ? "Selected" : "Select"}</button>
        <button type="button" data-keyframe-action="delete">Delete</button>
      </div>
    </article>
  `).join("");
  renderAnimationTracks();
}

function renderAnimationTracks() {
  if (!elements.animationTab.trackList) {
    return;
  }

  const keyframes = sortAnimationKeyframes(state.animationWorkbench.keyframes);
  const tracks = [
    {
      id: "camera",
      label: "Camera",
      count: keyframes.length,
      items: keyframes
    },
    {
      id: "composition",
      label: "Composition",
      count: keyframes.filter((item) => item.sourceState).length,
      items: keyframes.filter((item) => item.sourceState)
    }
  ];

  elements.animationTab.trackList.innerHTML = tracks.map((track) => {
    const playheadLeft = (getAnimationCurrentTimeSeconds() / getAnimationDurationSeconds()) * 100;
    return `
      <article class="timeline-track" data-animation-track="${track.id}">
        <div class="timeline-track__header">
          <strong>${track.label}</strong>
          <span>${track.count} keys</span>
        </div>
        <div class="timeline-track__bar">
          <div class="timeline-track__playhead" style="left: ${playheadLeft}%;"></div>
          ${track.items.map((item) => `
            <button
              type="button"
              class="timeline-track__key ${state.animationWorkbench.selectedKeyframeId === item.id ? "is-selected" : ""}"
              data-keyframe-action="seek"
              data-keyframe-track="${track.id}"
              data-keyframe-id="${item.id}"
              style="left: ${(THREE.MathUtils.clamp(item.time || 0, 0, getAnimationDurationSeconds()) / getAnimationDurationSeconds()) * 100}%"
              title="${track.label} · ${Number(item.time || 0).toFixed(2)}s"
            ></button>
          `).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function getAnimationTimeFromTrackPointer(event, trackBar) {
  if (!trackBar) {
    return getAnimationCurrentTimeSeconds();
  }

  const rect = trackBar.getBoundingClientRect();
  const duration = getAnimationDurationSeconds();
  const x = THREE.MathUtils.clamp(event.clientX - rect.left, 0, rect.width || 1);
  const t = rect.width > 0 ? x / rect.width : 0;
  return THREE.MathUtils.clamp(t * duration, 0, duration);
}

function moveAnimationKeyframeTime(keyframeId, time, options = {}) {
  const keyframe = getAnimationKeyframeById(keyframeId);

  if (!keyframe) {
    return;
  }

  const clampedTime = THREE.MathUtils.clamp(time, 0, getAnimationDurationSeconds());
  keyframe.time = clampedTime;
  state.animationWorkbench.keyframes = sortAnimationKeyframes(state.animationWorkbench.keyframes);
  state.animationWorkbench.selectedKeyframeId = keyframe.id;

  if (options.seek !== false) {
    applyAnimationTimeToStudio(clampedTime, {
      syncControls: options.syncControls ?? true
    });
  } else {
    renderAnimationKeyframeList();
  }

  if (options.persist !== false) {
    scheduleSessionPersist();
  }
}

function syncAnimationAdvancedUi() {
  if (elements.animationTab.advancedContent) {
    elements.animationTab.advancedContent.hidden = !state.animationWorkbench.advancedExpanded;
  }
  if (elements.animationTab.advancedToggle) {
    elements.animationTab.advancedToggle.textContent = `${state.animationWorkbench.advancedExpanded ? "▾" : "▸"} Advanced Tracks`;
  }
  if (elements.animationTab.captureComposition) {
    elements.animationTab.captureComposition.checked = Boolean(state.animationWorkbench.captureComposition);
  }
  if (elements.animationTab.autoKey) {
    elements.animationTab.autoKey.checked = Boolean(state.animationWorkbench.autoKey);
  }
  if (elements.animationTab.easing) {
    elements.animationTab.easing.value = state.animationWorkbench.easing;
  }
  if (elements.animationTab.flightProfile) {
    elements.animationTab.flightProfile.value = state.animationWorkbench.flightProfile;
  }
  if (elements.animationTab.flightIntensity) {
    elements.animationTab.flightIntensity.value = String(state.animationWorkbench.flightIntensity);
  }
  if (elements.animationTab.sourceModeStatus) {
    const sourceLabel = ({
      system: "System",
      brand: "Brand Mode",
      editorial: "Editorial",
      cinematic: "Cinematic"
    })[animationSourceTab] || "System";
    elements.animationTab.sourceModeStatus.textContent = `Source mode: ${sourceLabel}. Auto Key updates the selected key when you move the preview. Enable composition capture only when keyframes should remember layout changes too.`;
  }
  renderAnimationTracks();
}

function syncAutoMotionToggle() {
  if (!elements.autoMotionToggle) {
    return;
  }

  const paused = Boolean(state.autoMotionPaused);
  elements.autoMotionToggle.textContent = paused ? "Resume Motion" : "Pause Motion";
  elements.autoMotionToggle.classList.toggle("is-active", paused);
  elements.autoMotionToggle.setAttribute("aria-pressed", paused ? "true" : "false");
}

function createRandomizer(seed = `${Date.now()}-${Math.random()}`) {
  let value = 2166136261;
  const source = String(seed);

  for (let index = 0; index < source.length; index += 1) {
    value ^= source.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }

  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomChoice(random, items) {
  return items[Math.floor(random() * items.length)] || items[0];
}

function randomRange(random, min, max, step = null) {
  const value = min + (max - min) * random();

  if (!step) {
    return value;
  }

  return Math.round(value / step) * step;
}

function setSystemRandomState(random) {
  const renderMode = randomChoice(random, ["points", "mesh", "hybrid"]);
  state.renderMode = renderMode;
  state.variation.enabled = random() > 0.42;
  state.variation.rows = Math.round(randomRange(random, 1, 5, 1));
  state.variation.cols = Math.round(randomRange(random, 1, 5, 1));
  state.variation.seed = String(Math.round(randomRange(random, 1000, 999999, 1)));
  state.variation.intensity = randomRange(random, 0.04, 1.35, 0.01);
  state.distortion.bend = randomRange(random, 0.02, 0.58, 0.01);
  state.distortion.twist = randomRange(random, 0.02, 0.62, 0.01);
  state.distortion.wave = randomRange(random, 0.02, 0.7, 0.01);
  state.distortion.noise = randomRange(random, 0, 0.38, 0.01);
  state.pointAppearance.size = randomRange(random, 0.4, 3.6, 0.01);
  state.pointAppearance.opacity = randomRange(random, 0.35, 1, 0.01);
  state.pointAppearance.colorMode = randomChoice(random, ["solid", "gradient", "random"]);
  state.glow.enabled = random() > 0.18;
  state.glow.basePointsOnly = random() > 0.28;
  state.glow.intensity = randomRange(random, 0.18, 2.3, 0.01);
  state.content.density = randomRange(random, 0, 1, 0.01);
  state.content.fillPoints = randomRange(random, 0, 1, 0.01);
  state.content.hoverScale = Math.round(randomRange(random, 160, 2200, 1));
  state.content.layoutMode = randomChoice(random, ["field", "grid", "perspective", "arc"]);
  state.content.imageRatio = randomRange(random, 0, 1, 0.01);
  state.content.textRatio = randomRange(random, 0, 1 - state.content.imageRatio, 0.01);
  state.content.emptyRatio = Math.max(0, 1 - state.content.imageRatio - state.content.textRatio);
  state.expansionRandomness = randomRange(random, 0, 1, 0.01);
  state.camera.preset = randomChoice(random, ["front", "perspective", "top", "editorial"]);
  state.camera.fov = randomRange(random, 20, 62, 0.1);
  state.camera.distance = randomRange(random, 2.6, 18, 0.1);
}

function ensureEditorialSeedContent() {
  if (!String(state.editorial.heroText || "").trim()) {
    state.editorial.heroText = String(state.typography.text || "EDITORIAL").trim() || "EDITORIAL";
  }
  if (!Array.isArray(state.editorial.labelsText) || !state.editorial.labelsText.length) {
    state.editorial.labelsText = ["BRAND", "EDITION", "PARIS", "2026"];
  }
  if (!Array.isArray(state.editorial.infoTexts) || !state.editorial.infoTexts.length) {
    state.editorial.infoTexts = ["SHOWROOM\nBY APPOINTMENT"];
    state.editorial.infoText = state.editorial.infoTexts.join("\n---\n");
  }
  if (!Array.isArray(state.editorial.secondaryTexts) || !state.editorial.secondaryTexts.length) {
    state.editorial.secondaryTexts = ["LIMITED EDITION"];
    state.editorial.secondaryText = state.editorial.secondaryTexts.join("\n---\n");
  }
}

function setEditorialRandomState(random) {
  ensureEditorialSeedContent();
  state.editorial.layoutPreset = randomChoice(random, ["hero-center", "offset-hero", "frame-editorial", "image-overlay"]);
  state.editorial.templatePreset = randomChoice(random, [
    "luxury-campaign",
    "sale-poster",
    "gallery-announcement",
    "fashion-brand-card",
    "minimalist-editorial"
  ]);
  state.editorial.heroFontSize = Math.round(randomRange(random, 160, 360, 1));
  state.editorial.heroTracking = Math.round(randomRange(random, -20, 24, 1));
  state.editorial.heroOpacity = randomRange(random, 0.4, 1, 0.01);
  state.editorial.heroX = randomRange(random, -0.9, 0.9, 0.01);
  state.editorial.heroY = randomRange(random, -0.8, 0.8, 0.01);
  state.editorial.heroMaxWidth = randomRange(random, 2.6, 8.2, 0.01);
  state.editorial.heroBackground = random() > 0.55;
  state.editorial.heroBackgroundOpacity = randomRange(random, 0.08, 0.65, 0.01);
  state.editorial.heroPaddingX = Math.round(randomRange(random, 10, 100, 1));
  state.editorial.heroPaddingY = Math.round(randomRange(random, 6, 72, 1));
  state.editorial.labelsSize = Math.round(randomRange(random, 12, 34, 1));
  state.editorial.labelsTracking = Math.round(randomRange(random, 4, 30, 1));
  state.editorial.labelsSpacing = randomRange(random, 0.2, 1.2, 0.01);
  state.editorial.infoWidth = randomRange(random, 1.1, 3.4, 0.01);
  state.editorial.infoHeight = randomRange(random, 0.55, 1.5, 0.01);
  state.editorial.infoX = randomRange(random, -1.8, 1.8, 0.01);
  state.editorial.infoY = randomRange(random, -1.6, 1.6, 0.01);
  state.editorial.secondaryX = randomRange(random, -1.8, 1.8, 0.01);
  state.editorial.secondaryY = randomRange(random, -1.8, 1.8, 0.01);
  state.editorial.mediaOpacity = randomRange(random, 0.2, 1, 0.01);
  state.editorial.mediaScale = randomRange(random, 0.6, 1.7, 0.01);
  state.editorial.animationPreset = randomChoice(random, [
    "none",
    "letter-drift",
    "kerning-bloom",
    "word-slide-fracture",
    "mask-reveal",
    "metadata-flicker",
    "staggered-serif",
    "depth-push"
  ]);
  state.editorial.animationSpeed = randomRange(random, 0.1, 1.1, 0.01);
  state.editorial.animationIntensity = randomRange(random, 0.05, 0.9, 0.01);
}

function setBrandRandomState(random) {
  state.brand.preset = randomChoice(random, [
    "hero-orbit",
    "split-orbit",
    "tunnel-brand",
    "wall-brand",
    "cluster-brand",
    "asymmetric-editorial",
    "runway-brand",
    "explosion-focus",
    "minimal-luxury",
    "data-axis-brand"
  ]);
  state.brand.mainScale = randomRange(random, -2.5, 4.5, 0.01);
  state.brand.mainRotateX = randomRange(random, -24, 24, 0.1);
  state.brand.mainRotateY = randomRange(random, -34, 34, 0.1);
  state.brand.mainRotateZ = randomRange(random, -18, 18, 0.1);
  state.brand.mainDepth = randomRange(random, -1.2, 1.4, 0.01);
  state.brand.activeDepthOffset = randomRange(random, -0.55, 1, 0.01);
  state.brand.mainTilt = randomRange(random, -1, 1, 0.01);
  state.brand.heroSkew = randomRange(random, -0.8, 0.8, 0.01);
  state.brand.heroOpacity = randomRange(random, 0.45, 1, 0.01);
  state.brand.heroDominance = randomRange(random, 1, 4.2, 0.01);
  state.brand.showPoints = random() > 0.12;
  state.brand.showImages = true;
  state.brand.showText = random() > 0.28;
  state.brand.pointDensity = randomRange(random, 0.08, 1, 0.01);
  state.brand.pointSize = randomRange(random, 0.4, 3, 0.01);
  state.brand.pointOpacity = randomRange(random, 0.04, 0.8, 0.01);
  state.brand.orbitSpeed = randomRange(random, 0.08, 1.8, 0.01);
  state.brand.orbitRadius = randomRange(random, 0.8, 4.2, 0.01);
  state.brand.numberOfRings = Math.round(randomRange(random, 1, 5, 1));
  state.brand.orbitSpacing = randomRange(random, 0.12, 1.1, 0.01);
  state.brand.orbitRandomness = randomRange(random, 0, 1, 0.01);
  state.brand.orbitJitter = randomRange(random, 0, 0.8, 0.01);
  state.brand.orbitMinScale = randomRange(random, 0.3, 1.4, 0.01);
  state.brand.orbitMaxScale = randomRange(random, state.brand.orbitMinScale, 10, 0.01);
  state.brand.orbitDistance = randomRange(random, 0.7, 4.4, 0.01);
  state.brand.orbitDepthSpread = randomRange(random, 0.2, 4, 0.01);
  state.brand.clusterStrength = randomRange(random, 0, 1, 0.01);
  state.brand.attractionToHero = randomRange(random, 0, 1.3, 0.01);
  state.brand.repulsionFromHero = randomRange(random, 0, 1, 0.01);
  state.brand.orbitRandomRotation = random() > 0.45;
  state.brand.transitionStyle = randomChoice(random, ["slide", "dissolve", "zoomThrough", "pushPullDepth", "orbitReplace", "glitchSwitch", "fadeThroughPoints"]);
  state.brand.transitionDuration = randomRange(random, 0.35, 1.8, 0.01);
  state.brand.cameraPreset = randomChoice(random, ["closeUp", "medium", "wideOrbit", "lowAngle", "topAngle", "editorialOblique"]);
  state.brand.slowCameraDrift = randomRange(random, 0, 0.8, 0.01);
  state.brand.parallaxStrength = randomRange(random, 0, 0.8, 0.01);
  state.brand.outputPreset = randomChoice(random, ["poster", "squarePost", "story", "heroBanner"]);
  state.brand.moodPreset = randomChoice(random, ["luxury", "chaos", "tech", "campaign"]);
  state.brand.auraStrength = randomRange(random, 0, 1.5, 0.01);
  state.brand.auraRadius = randomRange(random, 0.4, 2.8, 0.01);
  state.brand.auraOpacity = randomRange(random, 0, 0.9, 0.01);
}

function setCinematicRandomState(random) {
  state.cinematic.layoutPreset = randomChoice(random, ["depth-field", "tunnel", "media-walls", "floating-cards"]);
  state.cinematic.showPoints = random() > 0.18;
  state.cinematic.expansionRandomness = randomRange(random, 0, 1, 0.01);
  state.cinematic.hoverProximityStrength = randomRange(random, 0.1, 2.2, 0.01);
  state.cinematic.depthSpeed = randomRange(random, 0.08, 1.8, 0.01);
  state.cinematic.direction = randomChoice(random, ["forward", "backward"]);
  state.glow.enabled = true;
  state.glow.intensity = randomRange(random, 0.45, 2.8, 0.01);
}

function randomizeCurrentComposition() {
  const effectiveTab = selectedPanelTab === "animation"
    ? animationSourceTab
    : selectedPanelTab === "hand"
      ? ((elements.hand.mode?.value || "system") === "brand" ? "brand" : "system")
      : selectedPanelTab;
  const random = createRandomizer(`${effectiveTab}-${Date.now()}-${Math.random()}`);

  switch (effectiveTab) {
    case "brand":
      setBrandRandomState(random);
      break;
    case "editorial":
      setEditorialRandomState(random);
      break;
    case "cinematic":
      setCinematicRandomState(random);
      break;
    case "system":
    default:
      setSystemRandomState(random);
      break;
  }

  syncControlsFromStateSnapshot(state);
  syncBrandExportControlsFromMain();
  syncHandExportControlsFromMain();
  syncCinematicExportControlsFromMain();
  syncAnimationExportControlsFromMain();
  updateOutputs();
  applyPreviewAspectRatio();
  applyState();
  setStatus(`Random composition generated for ${effectiveTab}.`);
}

function hexToRgb(hex) {
  const normalized = String(hex || "").trim().replace("#", "");

  if (normalized.length !== 6) {
    return null;
  }

  const value = Number.parseInt(normalized, 16);

  if (!Number.isFinite(value)) {
    return null;
  }

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function getHexLuminance(hex) {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return 0;
  }

  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

function invertCurrentCompositionPalette() {
  const useLightTheme = getHexLuminance(state.backgroundColor) < 0.5;
  const palette = useLightTheme
    ? {
        background: "#ffffff",
        foreground: "#050505",
        foregroundSoft: "#1a1a1a",
        panel: "#050505",
        glow: "#050505"
      }
    : {
        background: "#050505",
        foreground: "#ffffff",
        foregroundSoft: "#d9d9d9",
        panel: "#000000",
        glow: "#ffffff"
      };

  state.backgroundColor = palette.background;
  state.pointAppearance.colorA = palette.foreground;
  state.pointAppearance.colorB = palette.foregroundSoft;
  state.glow.color = palette.glow;

  state.brand.backgroundColor = palette.background;
  state.brand.textColor = palette.foreground;
  state.brand.pointColorA = palette.foreground;
  state.brand.pointColorB = palette.foregroundSoft;

  state.editorial.heroColor = palette.foreground;
  state.editorial.heroBackgroundColor = palette.panel;
  state.editorial.heroBackground = true;
  state.editorial.labelBoxOpacity = Math.max(state.editorial.labelBoxOpacity || 0, 0.88);

  state.cinematic.backgroundColor = palette.background;

  syncControlsFromStateSnapshot(state);
  syncBrandExportControlsFromMain();
  syncHandExportControlsFromMain();
  syncCinematicExportControlsFromMain();
  updateOutputs();
  applyState({ rebuildBackground: true });
  setStatus(useLightTheme ? "Composition inverted to light mode." : "Composition inverted to dark mode.");
}

function captureAnimationSourceState() {
  switch (animationSourceTab) {
    case "brand":
      return {
        brand: cloneSerializable({
          mainScale: state.brand.mainScale,
          mainRotateX: state.brand.mainRotateX,
          mainRotateY: state.brand.mainRotateY,
          mainRotateZ: state.brand.mainRotateZ,
          mainDepth: state.brand.mainDepth,
          activeDepthOffset: state.brand.activeDepthOffset,
          mainTilt: state.brand.mainTilt,
          heroSkew: state.brand.heroSkew,
          heroOpacity: state.brand.heroOpacity,
          heroDominance: state.brand.heroDominance,
          orbitRadius: state.brand.orbitRadius,
          orbitSpacing: state.brand.orbitSpacing,
          orbitSpeed: state.brand.orbitSpeed,
          orbitRandomness: state.brand.orbitRandomness,
          orbitJitter: state.brand.orbitJitter,
          orbitDistance: state.brand.orbitDistance,
          orbitDepthSpread: state.brand.orbitDepthSpread,
          secondaryEmphasis: state.brand.secondaryEmphasis,
          backgroundSuppression: state.brand.backgroundSuppression,
          auraStrength: state.brand.auraStrength,
          auraRadius: state.brand.auraRadius,
          auraOpacity: state.brand.auraOpacity,
          pointSize: state.brand.pointSize,
          pointOpacity: state.brand.pointOpacity,
          showPoints: state.brand.showPoints,
          showImages: state.brand.showImages,
          showText: state.brand.showText
        })
      };
    case "editorial":
      return {
        editorial: cloneSerializable({
          heroX: state.editorial.heroX,
          heroY: state.editorial.heroY,
          heroFontSize: state.editorial.heroFontSize,
          heroOpacity: state.editorial.heroOpacity,
          heroMaxWidth: state.editorial.heroMaxWidth,
          heroTracking: state.editorial.heroTracking,
          heroLineHeight: state.editorial.heroLineHeight,
          heroPaddingX: state.editorial.heroPaddingX,
          heroPaddingY: state.editorial.heroPaddingY,
          labelsSpacing: state.editorial.labelsSpacing,
          labelsSize: state.editorial.labelsSize,
          labelsTracking: state.editorial.labelsTracking,
          infoX: state.editorial.infoX,
          infoY: state.editorial.infoY,
          infoWidth: state.editorial.infoWidth,
          infoHeight: state.editorial.infoHeight,
          infoBlockSettings: cloneSerializable(state.editorial.infoBlockSettings),
          secondaryX: state.editorial.secondaryX,
          secondaryY: state.editorial.secondaryY,
          secondaryOpacity: state.editorial.secondaryOpacity,
          mediaOpacity: state.editorial.mediaOpacity,
          mediaScale: state.editorial.mediaScale,
          overlapTextOpacity: state.editorial.overlapTextOpacity,
          overlapImageOpacity: state.editorial.overlapImageOpacity,
          overlapBrightness: state.editorial.overlapBrightness,
          overlapPriority: state.editorial.overlapPriority,
          offsets: cloneSerializable(state.editorial.offsets)
        })
      };
    case "cinematic":
      return {
        cinematic: cloneSerializable({
          layoutPreset: state.cinematic.layoutPreset,
          showPoints: state.cinematic.showPoints,
          expansionRandomness: state.cinematic.expansionRandomness,
          hoverProximityStrength: state.cinematic.hoverProximityStrength,
          depthSpeed: state.cinematic.depthSpeed,
          direction: state.cinematic.direction
        })
      };
    case "system":
    default:
      return {
        distortion: cloneSerializable(state.distortion),
        variation: cloneSerializable({
          intensity: state.variation.intensity,
          enabled: state.variation.enabled,
          rows: state.variation.rows,
          cols: state.variation.cols
        }),
        pointAppearance: cloneSerializable(state.pointAppearance),
        glow: cloneSerializable(state.glow),
        content: cloneSerializable({
          density: state.content.density,
          fillPoints: state.content.fillPoints,
          hoverScale: state.content.hoverScale,
          imageRatio: state.content.imageRatio,
          textRatio: state.content.textRatio,
          emptyRatio: state.content.emptyRatio
        }),
        expansionRandomness: state.expansionRandomness
      };
  }
}

function interpolateAnimationValue(a, b, t) {
  if (typeof a === "number" && typeof b === "number") {
    return THREE.MathUtils.lerp(a, b, t);
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return t < 0.5 ? cloneSerializable(a) : cloneSerializable(b);
    }
    return a.map((value, index) => interpolateAnimationValue(value, b[index], t));
  }

  if (a && b && typeof a === "object" && typeof b === "object") {
    const next = {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (!(key in a)) {
        next[key] = cloneSerializable(b[key]);
        continue;
      }
      if (!(key in b)) {
        next[key] = cloneSerializable(a[key]);
        continue;
      }
      next[key] = interpolateAnimationValue(a[key], b[key], t);
    }
    return next;
  }

  return t < 0.5 ? cloneSerializable(a) : cloneSerializable(b);
}

function getAnimationSourceStateAtTime(timeSeconds) {
  const keyframes = sortAnimationKeyframes(state.animationWorkbench.keyframes)
    .filter((item) => item.sourceState);

  if (!keyframes.length) {
    return null;
  }

  const clampedTime = THREE.MathUtils.clamp(timeSeconds, 0, getAnimationDurationSeconds());
  let previous = keyframes[0];
  let next = keyframes[keyframes.length - 1];

  for (let index = 0; index < keyframes.length; index += 1) {
    if (keyframes[index].time <= clampedTime) {
      previous = keyframes[index];
    }
    if (keyframes[index].time >= clampedTime) {
      next = keyframes[index];
      break;
    }
  }

  if (previous.id === next.id) {
    return cloneSerializable(previous.sourceState);
  }

  const span = Math.max(0.0001, next.time - previous.time);
  const localT = (clampedTime - previous.time) / span;
  const easedT = applyAnimationEasing(
    applyFlightProfile(localT, state.animationWorkbench.flightProfile, state.animationWorkbench.flightIntensity),
    state.animationWorkbench.easing,
    state.animationWorkbench.flightIntensity
  );
  return interpolateAnimationValue(previous.sourceState, next.sourceState, easedT);
}

function maybeAutoUpdateAnimationKeyframe() {
  if (!studio || selectedPanelTab !== "animation" || state.animationWorkbench.playing || !state.animationWorkbench.autoKey) {
    return;
  }

  const currentTime = THREE.MathUtils.clamp(Number(elements.animationTab.currentTime?.value || 0), 0, getAnimationDurationSeconds());
  const selected = state.animationWorkbench.selectedKeyframeId
    ? getAnimationKeyframeById(state.animationWorkbench.selectedKeyframeId)
    : getNearestAnimationKeyframe(currentTime);

  if (!selected) {
    return;
  }

  const pose = studio.getCameraPose?.();
  if (!pose) {
    return;
  }

  const sourceState = state.animationWorkbench.captureComposition ? captureAnimationSourceState() : selected.sourceState || null;
  const signature = buildAnimationAutoKeySignature(pose, sourceState);

  if (signature === animationAutoKeySignature) {
    return;
  }

  animationAutoKeySignature = signature;
  selected.pose = pose;
  selected.time = currentTime;
  selected.sourceTab = animationSourceTab;
  selected.sourceState = sourceState;
  state.animationWorkbench.selectedKeyframeId = selected.id;
  state.animationWorkbench.keyframes = sortAnimationKeyframes(state.animationWorkbench.keyframes);
  renderAnimationKeyframeList();
  scheduleSessionPersist();
}

function stopAnimationPlayback({ resetSelection = false } = {}) {
  if (animationPlaybackFrame) {
    window.cancelAnimationFrame(animationPlaybackFrame);
    animationPlaybackFrame = 0;
  }

  state.animationWorkbench.playing = false;
  if (resetSelection) {
    state.animationWorkbench.selectedKeyframeId = null;
  }

  if (elements.animationTab.playToggle) {
    elements.animationTab.playToggle.textContent = "Play";
  }
}

function applyAnimationTimeToStudio(time, options = {}) {
  const timeSeconds = THREE.MathUtils.clamp(time, 0, getAnimationDurationSeconds());
  state.animationWorkbench.currentTime = timeSeconds;
  const nearest = getNearestAnimationKeyframe(timeSeconds);
  state.animationWorkbench.selectedKeyframeId = nearest?.id || null;

  if (elements.animationTab.currentTime && options.updateSlider !== false) {
    elements.animationTab.currentTime.value = String(timeSeconds);
  }

  const sourceState = getAnimationSourceStateAtTime(timeSeconds);
  if (sourceState && studio) {
    mergeIntoState(state, sourceState);
    if (options.syncControls) {
      syncControlsFromStateSnapshot(state);
    }
    studio.applyConfig?.(state, { persist: false, forceFitCamera: false, clearUserCameraOverride: false });
  }

  const pose = getCameraPoseAtTime(timeSeconds);
  if (pose && studio) {
    studio.setCameraPose?.(pose, { markUserOverride: false });
    if (options.render !== false) {
      studio.renderFrame?.();
    }
  }

  updateOutputs();
  renderAnimationKeyframeList();
}

function startAnimationPlayback({ reset = false, loop = state.animationWorkbench.loop, forExport = false } = {}) {
  const keyframes = sortAnimationKeyframes(state.animationWorkbench.keyframes);
  if (keyframes.length < 2 || !studio) {
    setStatus("Add at least two keyframes to play the animation.");
    return false;
  }

  stopAnimationPlayback();

  const { firstTime, lastTime, spanSeconds } = getAnimationPlaybackBounds();

  if (reset) {
    state.animationWorkbench.currentTime = firstTime;
    if (elements.animationTab.currentTime) {
      elements.animationTab.currentTime.value = String(firstTime);
    }
  }

  state.animationWorkbench.playing = true;
  animationPlaybackStartedAt = performance.now();
  animationPlaybackBaseTime = state.animationWorkbench.currentTime;
  const durationMs = Math.max(100, spanSeconds * 1000);

  const tick = (now) => {
    if (!state.animationWorkbench.playing) {
      return;
    }

    const elapsed = now - animationPlaybackStartedAt;
    let nextTime = animationPlaybackBaseTime + (elapsed / durationMs) * spanSeconds;

    if (nextTime >= lastTime) {
      if (loop) {
        nextTime = firstTime;
        animationPlaybackStartedAt = now;
        animationPlaybackBaseTime = firstTime;
      } else {
        nextTime = lastTime;
        applyAnimationTimeToStudio(nextTime, { syncControls: !forExport });
        stopAnimationPlayback();
        if (!forExport) {
          setStatus("Animation playback finished.");
        }
        return;
      }
    }

    applyAnimationTimeToStudio(nextTime, { syncControls: false });
    animationPlaybackFrame = window.requestAnimationFrame(tick);
  };

  if (elements.animationTab.playToggle) {
    elements.animationTab.playToggle.textContent = "Pause";
  }

  animationPlaybackFrame = window.requestAnimationFrame(tick);
  return true;
}

function captureAnimationKeyframe({ updateExisting = false } = {}) {
  if (!studio?.getCameraPose) {
    setStatus("Scene is still loading.");
    return;
  }

  const pose = studio.getCameraPose();
  const sourceState = state.animationWorkbench.captureComposition ? captureAnimationSourceState() : null;
  const time = THREE.MathUtils.clamp(Number(elements.animationTab.currentTime?.value || 0), 0, getAnimationDurationSeconds());
  const nextKeyframes = sortAnimationKeyframes(state.animationWorkbench.keyframes);
  let keyframe = null;

  if (updateExisting && state.animationWorkbench.selectedKeyframeId) {
    keyframe = nextKeyframes.find((item) => item.id === state.animationWorkbench.selectedKeyframeId) || null;
  } else if (updateExisting) {
    keyframe = nextKeyframes.find((item) => Math.abs(item.time - time) <= 0.01) || null;
  }

  if (keyframe) {
    keyframe.time = time;
    keyframe.pose = pose;
    keyframe.sourceTab = animationSourceTab;
    keyframe.sourceState = sourceState;
    state.animationWorkbench.selectedKeyframeId = keyframe.id;
  } else {
    keyframe = {
      id: createKeyframeId(),
      time,
      pose,
      sourceTab: animationSourceTab,
      sourceState
    };
    nextKeyframes.push(keyframe);
    state.animationWorkbench.selectedKeyframeId = keyframe.id;
  }

  state.animationWorkbench.keyframes = sortAnimationKeyframes(nextKeyframes);
  state.animationWorkbench.currentTime = time;
  animationAutoKeySignature = buildAnimationAutoKeySignature(pose, sourceState);
  renderAnimationKeyframeList();
  scheduleSessionPersist();
  setStatus(updateExisting ? "Keyframe updated." : "Keyframe added.");
}

function openPresetModal(sourceTab = selectedPanelTab) {
  if (!elements.presetModal.root) {
    return;
  }

  activePresetDraft = { sourceTab };
  elements.presetModal.sourceTab.value = sourceTab;
  elements.presetModal.name.value = `${sourceTab[0].toUpperCase()}${sourceTab.slice(1)} Preset`;
  elements.presetModal.category.value = sourceTab === "brand" || sourceTab === "editorial" ? "posters" : sourceTab === "cinematic" ? "stories" : "telegram-posts";
  elements.presetModal.status.textContent = "Save the current composition into the preset library.";
  elements.presetModal.root.setAttribute("aria-hidden", "false");
  elements.presetModal.root.hidden = false;
}

function closePresetModal() {
  if (!elements.presetModal.root) {
    return;
  }

  elements.presetModal.root.setAttribute("aria-hidden", "true");
  elements.presetModal.root.hidden = true;
  activePresetDraft = null;
}

function renderPresetLibrary() {
  if (!elements.presets.list) {
    return;
  }

  const filter = elements.presets.categoryFilter?.value || "all";
  const allPresets = [...BUILT_IN_PRESETS, ...presetLibrary]
    .filter((item) => filter === "all" ? true : item.category === filter)
    .sort((a, b) => {
      if (a.category === b.category) {
        return String(a.name).localeCompare(String(b.name));
      }
      return String(a.category).localeCompare(String(b.category));
    });

  if (!allPresets.length) {
    elements.presets.list.innerHTML = "<p class=\"status\">No presets in this category yet.</p>";
    return;
  }

  elements.presets.list.innerHTML = allPresets.map((item) => `
    <article class="saved-item" data-preset-id="${item.id}" data-preset-builtin="${item.builtin ? "true" : "false"}">
      <div class="saved-item__meta">
        <strong>${item.name}</strong>
        <span>${item.category} · ${item.sourceTab}</span>
      </div>
      <div class="saved-item__actions">
        <button type="button" data-preset-action="load">Load</button>
        ${item.builtin ? "" : "<button type=\"button\" data-preset-action=\"delete\">Delete</button>"}
      </div>
    </article>
  `).join("");
}

for (const button of elements.editorial.sectionToggles || []) {
  const sectionName = button.dataset.editorialSection;
  if (!sectionName) {
    continue;
  }

  const content = (elements.editorial.sectionContents || []).find(
    (item) => item.dataset.editorialSectionContent === sectionName
  );
  const expanded = !content?.hidden;
  setEditorialSectionExpanded(sectionName, expanded);
  button.addEventListener("click", () => {
    const targetContent = (elements.editorial.sectionContents || []).find(
      (item) => item.dataset.editorialSectionContent === sectionName
    );
    setEditorialSectionExpanded(sectionName, Boolean(targetContent?.hidden));
  });
}

function syncMainExportControlsFromBrand() {
  if (!elements.brand.exportRatio) {
    return;
  }

  elements.controls.backgroundColor.value = elements.brand.backgroundColor.value;
  elements.controls.transparentBackground.checked = elements.brand.transparentBackground.checked;
  elements.controls.exportRatio.value = elements.brand.exportRatio.value;
  elements.controls.exportSize.value = elements.brand.exportSize.value;
  elements.controls.exportFrames.value = elements.brand.exportFrames.value;
  elements.controls.exportDuration.value = elements.brand.exportDuration.value;
  elements.controls.exportQuality.value = elements.brand.exportQuality.value;
  elements.controls.exportFps.value = elements.brand.exportFps.value;
}

function syncMainExportControlsFromHand() {
  if (!elements.hand.exportRatio) {
    return;
  }

  elements.controls.exportRatio.value = elements.hand.exportRatio.value;
  elements.controls.exportSize.value = elements.hand.exportSize.value;
  elements.controls.exportFrames.value = elements.hand.exportFrames.value;
  elements.controls.exportDuration.value = elements.hand.exportDuration.value;
  elements.controls.exportQuality.value = elements.hand.exportQuality.value;
  elements.controls.exportFps.value = elements.hand.exportFps.value;
}

function syncMainExportControlsFromCinematic() {
  if (!elements.cinematic.exportRatio) {
    return;
  }

  elements.controls.backgroundColor.value = elements.cinematic.backgroundColor.value;
  elements.controls.transparentBackground.checked = elements.cinematic.transparentBackground.checked;
  elements.controls.exportRatio.value = elements.cinematic.exportRatio.value;
  elements.controls.exportSize.value = elements.cinematic.exportSize.value;
  elements.controls.exportFrames.value = elements.cinematic.exportFrames.value;
  elements.controls.exportDuration.value = elements.cinematic.exportDuration.value;
  elements.controls.exportQuality.value = elements.cinematic.exportQuality.value;
  elements.controls.exportFps.value = elements.cinematic.exportFps.value;
}

function applyPreviewAspectRatio() {
  const ratio = elements.controls.exportRatio.value;
  const stage = elements.stage;

  if (!stage) {
    return;
  }

  if (ratio === "current") {
    stage.classList.remove("is-framed-preview");
    stage.style.aspectRatio = "";
    stage.style.width = "";
    stage.style.maxWidth = "";
    stage.style.height = "";
    stage.style.maxHeight = "";
  } else {
    const [widthValue, heightValue] = ratio.split(":").map(Number);
    const safeWidth = Number.isFinite(widthValue) ? widthValue : 1;
    const safeHeight = Number.isFinite(heightValue) ? heightValue : 1;
    const ratioValue = safeWidth / Math.max(safeHeight, 1);
    stage.classList.add("is-framed-preview");
    stage.style.aspectRatio = `${safeWidth} / ${safeHeight}`;
    stage.style.width = `min(100%, calc((100vh - 44px) * ${ratioValue}))`;
    stage.style.maxWidth = "100%";
    stage.style.height = "auto";
    stage.style.maxHeight = "calc(100vh - 44px)";
  }

  requestAnimationFrame(() => {
    studio?.resize?.();
  });
}

function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

async function readFilesAsDataUrls(files) {
  return Promise.all(
    [...(files || [])].map(
      (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
        reader.readAsDataURL(file);
      })
    )
  );
}

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Unable to read storage key ${key}.`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Unable to write storage key ${key}.`, error);
    setStatus("Unable to save this composition locally.");
    return false;
  }
}

function openPersistenceDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(PERSISTENCE_DB_NAME, PERSISTENCE_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("savedCompositions")) {
        database.createObjectStore("savedCompositions", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("presetLibrary")) {
        database.createObjectStore("presetLibrary", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open persistent storage."));
  });
}

async function idbGetAll(storeName) {
  try {
    const database = await openPersistenceDb();
    if (!database) {
      return [];
    }

    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error(`Unable to read ${storeName}.`));
    });
  } catch (error) {
    console.warn(`Unable to read ${storeName} from IndexedDB.`, error);
    return [];
  }
}

async function idbPut(storeName, value) {
  try {
    const database = await openPersistenceDb();
    if (!database) {
      return false;
    }

    await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error(`Unable to save to ${storeName}.`));
    });
    return true;
  } catch (error) {
    console.warn(`Unable to write ${storeName} to IndexedDB.`, error);
    return false;
  }
}

async function idbDelete(storeName, key) {
  try {
    const database = await openPersistenceDb();
    if (!database) {
      return false;
    }

    await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error(`Unable to delete from ${storeName}.`));
    });
    return true;
  } catch (error) {
    console.warn(`Unable to delete ${storeName} item from IndexedDB.`, error);
    return false;
  }
}

const BUILT_IN_PRESETS = [
  {
    id: "builtin-telegram-grid",
    name: "Telegram Grid Note",
    category: "telegram-posts",
    sourceTab: "system",
    builtin: true,
    payload: {
      export: { ratio: "1:1", size: 1080 },
      variation: { enabled: false, intensity: 0.36 },
      renderMode: "outline",
      glow: { enabled: false },
      pointAppearance: { size: 0.8, opacity: 0.82, colorMode: "solid", colorA: "#ffffff", colorB: "#ffffff" }
    }
  },
  {
    id: "builtin-telegram-brand-card",
    name: "Telegram Brand Card",
    category: "telegram-posts",
    sourceTab: "brand",
    builtin: true,
    payload: {
      backgroundColor: "#050505",
      export: { ratio: "1:1", size: 1080 },
      brand: { preset: "minimal-luxury", heroDominance: 2.6, orbitRadius: 1.5, showPoints: true, showImages: true, showText: false }
    }
  },
  {
    id: "builtin-telegram-editorial-note",
    name: "Telegram Editorial Note",
    category: "telegram-posts",
    sourceTab: "editorial",
    builtin: true,
    payload: {
      export: { ratio: "1:1", size: 1080 },
      editorial: { layoutPreset: "offset-hero", templatePreset: "minimalist-editorial", heroFontSize: 220, mediaOpacity: 0.55 }
    }
  },
  {
    id: "builtin-telegram-outline-burst",
    name: "Telegram Outline Burst",
    category: "telegram-posts",
    sourceTab: "system",
    builtin: true,
    payload: {
      export: { ratio: "1:1", size: 1080 },
      renderMode: "outline",
      glow: { enabled: true, intensity: 0.4 },
      variation: { enabled: true, rows: 2, cols: 2, intensity: 0.52 }
    }
  },
  {
    id: "builtin-story-tunnel",
    name: "Story Tunnel",
    category: "stories",
    sourceTab: "cinematic",
    builtin: true,
    payload: {
      export: { ratio: "9:16", size: 1920 },
      cinematic: { layoutPreset: "tunnel", showPoints: true, depthSpeed: 0.75, expansionRandomness: 0.42 }
    }
  },
  {
    id: "builtin-story-brand",
    name: "Story Brand Focus",
    category: "stories",
    sourceTab: "brand",
    builtin: true,
    payload: {
      export: { ratio: "9:16", size: 1920 },
      brand: { preset: "hero-orbit", heroDominance: 2.8, orbitRadius: 1.35, orbitDepthSpread: 2.1, showText: true }
    }
  },
  {
    id: "builtin-story-editorial",
    name: "Story Editorial Overlay",
    category: "stories",
    sourceTab: "editorial",
    builtin: true,
    payload: {
      export: { ratio: "9:16", size: 1920 },
      editorial: { layoutPreset: "image-overlay", templatePreset: "sale-poster", heroFontSize: 260, heroY: 0.24 }
    }
  },
  {
    id: "builtin-story-runway",
    name: "Story Runway Brand",
    category: "stories",
    sourceTab: "brand",
    builtin: true,
    payload: {
      export: { ratio: "9:16", size: 1920 },
      brand: { preset: "runway-brand", orbitRadius: 1.8, orbitSpacing: 0.26, orbitDepthSpread: 2.5, showPoints: true }
    }
  },
  {
    id: "builtin-poster-editorial",
    name: "Poster Editorial",
    category: "posters",
    sourceTab: "editorial",
    builtin: true,
    payload: {
      export: { ratio: "4:5", size: 2160 },
      editorial: { layoutPreset: "frame-editorial", templatePreset: "luxury-campaign", heroFontSize: 320, mediaOpacity: 0.82 }
    }
  },
  {
    id: "builtin-poster-brand",
    name: "Poster Brand Aura",
    category: "posters",
    sourceTab: "brand",
    builtin: true,
    payload: {
      export: { ratio: "4:5", size: 2160 },
      brand: { preset: "wall-brand", auraStrength: 0.88, auraRadius: 1.45, orbitRadius: 2.2, numberOfRings: 3 }
    }
  },
  {
    id: "builtin-poster-data-axis",
    name: "Poster Data Axis",
    category: "posters",
    sourceTab: "system",
    builtin: true,
    payload: {
      export: { ratio: "4:5", size: 2160 },
      axisStep: { enabled: true, guides: true },
      content: { layoutMode: "axis", density: 0.22 },
      renderMode: "hybrid"
    }
  },
  {
    id: "builtin-poster-minimal-brand",
    name: "Poster Minimal Brand",
    category: "posters",
    sourceTab: "brand",
    builtin: true,
    payload: {
      export: { ratio: "4:5", size: 2160 },
      brand: { preset: "minimal-luxury", showPoints: false, showText: true, orbitRadius: 1.25, secondaryEmphasis: 0.65 }
    }
  }
];

function mergeIntoState(target, source) {
  if (!source || typeof source !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      target[key] = cloneSerializable(value);
      continue;
    }

    if (value && typeof value === "object") {
      if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
        target[key] = {};
      }
      mergeIntoState(target[key], value);
      continue;
    }

    target[key] = value;
  }
}

function restoreSelectValue(select, value) {
  if (!select || value == null) {
    return;
  }

  if ([...select.options].some((option) => option.value === String(value))) {
    select.value = String(value);
  }
}

function setInputValue(input, value) {
  if (!input || value == null) {
    return;
  }

  input.value = String(value);
}

function setCheckedValue(input, value) {
  if (!input || value == null) {
    return;
  }

  input.checked = Boolean(value);
}

function getActiveToggleValue(group, datasetKey, fallback = "") {
  if (!group) {
    return fallback;
  }

  const activeButton = group.querySelector(`button.is-active[data-${datasetKey}]`);
  return activeButton?.dataset?.[datasetKey] || fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function syncControlsFromStateSnapshot(snapshotState) {
  if (!snapshotState) {
    return;
  }

  if (elements.fontUpload) {
    elements.fontUpload.value = "";
  }
  if (elements.controls.pointImageUpload) {
    elements.controls.pointImageUpload.value = "";
  }
  if (elements.controls.pointTextFontUpload) {
    elements.controls.pointTextFontUpload.value = "";
  }
  if (elements.brand.mainImageUpload) {
    elements.brand.mainImageUpload.value = "";
  }
  if (elements.brand.orbitImageUpload) {
    elements.brand.orbitImageUpload.value = "";
  }

  setInputValue(elements.textInput, snapshotState.typography?.text);
  restoreSelectValue(elements.fontSelect, snapshotState.typography?.fontFamily);
  if (snapshotState.renderMode) {
    setActiveToggle(elements.renderModeToggle, "renderMode", snapshotState.renderMode);
  }
  setInputValue(elements.controls.fontSize, snapshotState.typography?.fontSize);
  setInputValue(elements.controls.tracking, snapshotState.typography?.tracking);
  setInputValue(elements.controls.lineHeight, snapshotState.typography?.lineHeight);
  setInputValue(elements.controls.strokeWidth, snapshotState.strokeWidth);
  setInputValue(elements.controls.pointSize, snapshotState.pointAppearance?.size);
  setInputValue(elements.controls.pointOpacity, snapshotState.pointAppearance?.opacity);
  restoreSelectValue(elements.controls.pointColorMode, snapshotState.pointAppearance?.colorMode);
  setInputValue(elements.controls.pointColorA, snapshotState.pointAppearance?.colorA);
  setInputValue(elements.controls.pointColorB, snapshotState.pointAppearance?.colorB);
  setInputValue(elements.controls.backgroundColor, snapshotState.backgroundColor);
  setCheckedValue(elements.controls.transparentBackground, snapshotState.transparentBackground);
  setCheckedValue(elements.controls.glowEnabled, snapshotState.glow?.enabled);
  setCheckedValue(elements.controls.glowBasePointsOnly, snapshotState.glow?.basePointsOnly ?? true);
  setInputValue(elements.controls.glowColor, snapshotState.glow?.color);
  setInputValue(elements.controls.glowIntensity, snapshotState.glow?.intensity);
  setInputValue(elements.controls.bend, snapshotState.distortion?.bend);
  setInputValue(elements.controls.twist, snapshotState.distortion?.twist);
  setInputValue(elements.controls.wave, snapshotState.distortion?.wave);
  setInputValue(elements.controls.noise, snapshotState.distortion?.noise);
  setCheckedValue(elements.controls.gridEnabled, snapshotState.variation?.enabled);
  setInputValue(elements.controls.gridRows, snapshotState.variation?.rows);
  setInputValue(elements.controls.gridCols, snapshotState.variation?.cols);
  setInputValue(elements.controls.seedInput, snapshotState.variation?.seed);
  setInputValue(elements.controls.variationIntensity, snapshotState.variation?.intensity);
  setInputValue(elements.controls.cameraFov, snapshotState.camera?.fov);
  setInputValue(elements.controls.cameraDistance, snapshotState.camera?.distance);
  restoreSelectValue(elements.controls.animationPreset, snapshotState.animation?.preset);
  setInputValue(elements.controls.contentDensity, snapshotState.content?.density);
  setInputValue(elements.controls.contentFillPoints, snapshotState.content?.fillPoints);
  setInputValue(elements.controls.contentHoverScale, snapshotState.content?.hoverScale);
  restoreSelectValue(elements.controls.pointTextFont, snapshotState.content?.textFontFamily);
  setCheckedValue(elements.controls.pointTextUppercase, snapshotState.content?.textUppercase);
  setCheckedValue(elements.controls.pointTextBackground, snapshotState.content?.textBackground);
  setInputValue(elements.controls.pointTextColor, snapshotState.content?.textColor);
  setInputValue(elements.controls.pointTextBackgroundColor, snapshotState.content?.textBackgroundColor);
  setInputValue(elements.controls.imageRatio, snapshotState.content?.imageRatio);
  setInputValue(elements.controls.textRatio, snapshotState.content?.textRatio);
  setInputValue(elements.controls.emptyRatio, snapshotState.content?.emptyRatio);
  restoreSelectValue(elements.controls.contentLayoutMode, snapshotState.content?.layoutMode);
  setCheckedValue(elements.controls.contentOnlyMode, snapshotState.content?.onlyMode);
  restoreSelectValue(elements.controls.contentOnlyType, snapshotState.content?.onlyType);
  setInputValue(elements.controls.pointTextInput, snapshotState.content?.texts?.join(", "));
  setInputValue(elements.controls.expansionRandomness, snapshotState.expansionRandomness);
  setCheckedValue(elements.controls.axisStepEnabled, snapshotState.axisStep?.enabled);
  setCheckedValue(elements.controls.axisGuidesEnabled, snapshotState.axisStep?.guides);
  restoreSelectValue(elements.controls.filterKind, snapshotState.stepSettings?.filterKind);
  restoreSelectValue(elements.controls.boundaryShape, snapshotState.stepSettings?.boundaryShape);
  restoreSelectValue(elements.controls.fieldShape, snapshotState.stepSettings?.fieldShape);
  setInputValue(elements.controls.trailLength, snapshotState.stepSettings?.trailLength);
  restoreSelectValue(elements.controls.mediaSpacePreset, snapshotState.stepSettings?.mediaSpacePreset);
  setInputValue(elements.controls.hoverProximityStrength, snapshotState.stepSettings?.hoverProximityStrength);
  setInputValue(elements.controls.cinematicDepthSpeed, snapshotState.stepSettings?.cinematicDepthSpeed);
  restoreSelectValue(elements.controls.cinematicDirection, snapshotState.stepSettings?.cinematicDirection);
  restoreSelectValue(elements.controls.exportRatio, snapshotState.export?.ratio);
  restoreSelectValue(elements.controls.exportSize, snapshotState.export?.size);
  setInputValue(elements.controls.exportFrames, snapshotState.export?.frames);
  setInputValue(elements.controls.exportDuration, snapshotState.export?.duration);
  setInputValue(elements.controls.exportQuality, snapshotState.export?.quality);
  setInputValue(elements.controls.exportFps, snapshotState.export?.fps);
  setInputValue(elements.animationTab.exportQuality, snapshotState.export?.quality);
  setInputValue(elements.animationTab.exportFps, snapshotState.export?.fps);
  setInputValue(elements.animationTab.duration, snapshotState.animationWorkbench?.duration);
  syncAnimationTimelineRange();
  setInputValue(elements.animationTab.currentTime, snapshotState.animationWorkbench?.currentTime ?? 0);
  setCheckedValue(elements.animationTab.loop, snapshotState.animationWorkbench?.loop);
  setCheckedValue(elements.animationTab.autoKey, snapshotState.animationWorkbench?.autoKey);
  restoreSelectValue(elements.animationTab.easing, snapshotState.animationWorkbench?.easing);
  restoreSelectValue(elements.animationTab.flightProfile, snapshotState.animationWorkbench?.flightProfile);
  setInputValue(elements.animationTab.flightIntensity, snapshotState.animationWorkbench?.flightIntensity);
  setCheckedValue(elements.animationTab.captureComposition, snapshotState.animationWorkbench?.captureComposition);
  state.animationWorkbench.advancedExpanded = Boolean(snapshotState.animationWorkbench?.advancedExpanded);
  syncAnimationAdvancedUi();
  setCheckedValue(elements.systemEditorial.enabled, snapshotState.systemEditorialOverlay?.enabled);

  restoreSelectValue(elements.cinematic.layoutPreset, snapshotState.cinematic?.layoutPreset);
  setCheckedValue(elements.cinematic.showPoints, snapshotState.cinematic?.showPoints);
  setInputValue(elements.cinematic.expansionRandomness, snapshotState.cinematic?.expansionRandomness);
  setInputValue(elements.cinematic.hoverProximityStrength, snapshotState.cinematic?.hoverProximityStrength);
  setInputValue(elements.cinematic.depthSpeed, snapshotState.cinematic?.depthSpeed);
  restoreSelectValue(elements.cinematic.direction, snapshotState.cinematic?.direction);

  restoreSelectValue(elements.hand.mode, snapshotState.handMode);
  state.autoMotionPaused = Boolean(snapshotState.autoMotionPaused);
  syncAutoMotionToggle();

  restoreSelectValue(elements.brand.preset, snapshotState.brand?.preset);
  restoreSelectValue(elements.brand.mainKind, snapshotState.brand?.mainKind);
  setInputValue(elements.brand.mainText, snapshotState.brand?.mainText);
  setInputValue(elements.brand.orbitTexts, snapshotState.brand?.orbitTexts?.join("\n"));
  setInputValue(elements.brand.titleText, snapshotState.brand?.titleText);
  setInputValue(elements.brand.subtitleText, snapshotState.brand?.subtitleText);
  setInputValue(elements.brand.tagText, snapshotState.brand?.tagText);
  setInputValue(elements.brand.backgroundWord, snapshotState.brand?.backgroundWord);
  setInputValue(elements.brand.textFontSize, snapshotState.brand?.textFontSize);
  restoreSelectValue(elements.brand.textAlign, snapshotState.brand?.textAlign);
  setInputValue(elements.brand.textColor, snapshotState.brand?.textColor);
  setInputValue(elements.brand.textLineHeight, snapshotState.brand?.textLineHeight);
  setInputValue(elements.brand.textLetterSpacing, snapshotState.brand?.textLetterSpacing);
  setInputValue(elements.brand.textOpacity, snapshotState.brand?.textOpacity);
  setInputValue(elements.brand.mainScale, snapshotState.brand?.mainScale);
  setInputValue(elements.brand.mainRotateX, snapshotState.brand?.mainRotateX);
  setInputValue(elements.brand.mainRotateY, snapshotState.brand?.mainRotateY);
  setInputValue(elements.brand.mainRotateZ, snapshotState.brand?.mainRotateZ);
  setInputValue(elements.brand.mainDepth, snapshotState.brand?.mainDepth);
  setInputValue(elements.brand.activeDepthOffset, snapshotState.brand?.activeDepthOffset);
  setInputValue(elements.brand.mainTilt, snapshotState.brand?.mainTilt);
  setInputValue(elements.brand.heroSkew, snapshotState.brand?.heroSkew);
  setInputValue(elements.brand.heroOpacity, snapshotState.brand?.heroOpacity);
  setInputValue(elements.brand.heroDominance, snapshotState.brand?.heroDominance);
  setCheckedValue(elements.brand.showPoints, snapshotState.brand?.showPoints);
  setCheckedValue(elements.brand.showImages, snapshotState.brand?.showImages);
  setCheckedValue(elements.brand.showText, snapshotState.brand?.showText);
  setInputValue(elements.brand.pointDensity, snapshotState.brand?.pointDensity);
  setInputValue(elements.brand.pointSize, snapshotState.brand?.pointSize);
  setInputValue(elements.brand.pointOpacity, snapshotState.brand?.pointOpacity);
  restoreSelectValue(elements.brand.pointColorMode, snapshotState.brand?.pointColorMode);
  setInputValue(elements.brand.pointColorA, snapshotState.brand?.pointColorA);
  setInputValue(elements.brand.pointColorB, snapshotState.brand?.pointColorB);
  setInputValue(elements.brand.orbitSpeed, snapshotState.brand?.orbitSpeed);
  setInputValue(elements.brand.orbitRadius, snapshotState.brand?.orbitRadius);
  setInputValue(elements.brand.numberOfRings, snapshotState.brand?.numberOfRings);
  setInputValue(elements.brand.orbitSpacing, snapshotState.brand?.orbitSpacing);
  setInputValue(elements.brand.orbitRandomness, snapshotState.brand?.orbitRandomness);
  setInputValue(elements.brand.orbitJitter, snapshotState.brand?.orbitJitter);
  setInputValue(elements.brand.orbitMinScale, snapshotState.brand?.orbitMinScale);
  setInputValue(elements.brand.orbitMaxScale, snapshotState.brand?.orbitMaxScale);
  setInputValue(elements.brand.orbitDistance, snapshotState.brand?.orbitDistance);
  setInputValue(elements.brand.orbitDepthSpread, snapshotState.brand?.orbitDepthSpread);
  setInputValue(elements.brand.clusterStrength, snapshotState.brand?.clusterStrength);
  setInputValue(elements.brand.attractionToHero, snapshotState.brand?.attractionToHero);
  setInputValue(elements.brand.repulsionFromHero, snapshotState.brand?.repulsionFromHero);
  setCheckedValue(elements.brand.orbitRandomRotation, snapshotState.brand?.orbitRandomRotation);
  setInputValue(elements.brand.secondaryEmphasis, snapshotState.brand?.secondaryEmphasis);
  setInputValue(elements.brand.backgroundSuppression, snapshotState.brand?.backgroundSuppression);
  setInputValue(elements.brand.opacityFalloffDepth, snapshotState.brand?.opacityFalloffByDepth);
  setInputValue(elements.brand.scaleFalloffDistance, snapshotState.brand?.scaleFalloffByDistance);
  setInputValue(elements.brand.blurFalloffDepth, snapshotState.brand?.blurFalloffByDepth);
  restoreSelectValue(elements.brand.transitionStyle, snapshotState.brand?.transitionStyle);
  setInputValue(elements.brand.transitionDuration, snapshotState.brand?.transitionDuration);
  restoreSelectValue(elements.brand.transitionEasing, snapshotState.brand?.transitionEasing);
  restoreSelectValue(elements.brand.cameraPreset, snapshotState.brand?.cameraPreset);
  setInputValue(elements.brand.slowCameraDrift, snapshotState.brand?.slowCameraDrift);
  setInputValue(elements.brand.parallaxStrength, snapshotState.brand?.parallaxStrength);
  restoreSelectValue(elements.brand.outputPreset, snapshotState.brand?.outputPreset);
  setCheckedValue(elements.brand.glowEnabled, snapshotState.brand?.glowEnabled);
  restoreSelectValue(elements.brand.moodPreset, snapshotState.brand?.moodPreset);
  setInputValue(elements.brand.backgroundColor, snapshotState.backgroundColor);
  setCheckedValue(elements.brand.transparentBackground, snapshotState.transparentBackground);
  setInputValue(elements.brand.auraStrength, snapshotState.brand?.auraStrength);
  setInputValue(elements.brand.auraRadius, snapshotState.brand?.auraRadius);
  setInputValue(elements.brand.auraOpacity, snapshotState.brand?.auraOpacity);
  setInputValue(elements.brand.memoryDuration, snapshotState.brand?.memoryDuration);
  setInputValue(elements.brand.memoryOpacity, snapshotState.brand?.memoryOpacity);
  setInputValue(elements.brand.memoryOffset, snapshotState.brand?.memoryOffset);
  setInputValue(elements.brand.brandWeight, snapshotState.brand?.brandWeight);
  setCheckedValue(elements.brand.dualHeroEnabled, snapshotState.brand?.dualHeroEnabled);
  setInputValue(elements.brand.dualHeroDistance, snapshotState.brand?.dualHeroDistance);
  setInputValue(elements.brand.dualHeroBalance, snapshotState.brand?.dualHeroBalance);

  if (elements.editorial.contextToggle) {
    setActiveToggle(elements.editorial.contextToggle, "editorialContext", snapshotState.editorial?.context || "standalone");
  }
  setCheckedValue(elements.editorial.glowEnabled, snapshotState.editorial?.glowEnabled);
  restoreSelectValue(elements.editorial.layoutPreset, snapshotState.editorial?.layoutPreset);
  restoreSelectValue(elements.editorial.templatePreset, snapshotState.editorial?.templatePreset);
  setInputValue(elements.editorial.heroText, joinEditorialBlocks(snapshotState.editorial?.heroTexts, snapshotState.editorial?.heroText));
  restoreSelectValue(elements.editorial.heroFont, snapshotState.editorial?.heroFontFamily);
  setInputValue(elements.editorial.heroSize, snapshotState.editorial?.heroFontSize);
  setInputValue(elements.editorial.heroTracking, snapshotState.editorial?.heroTracking);
  setInputValue(elements.editorial.heroLineHeight, snapshotState.editorial?.heroLineHeight);
  setInputValue(elements.editorial.heroOpacity, snapshotState.editorial?.heroOpacity);
  setInputValue(elements.editorial.heroColor, snapshotState.editorial?.heroColor);
  restoreSelectValue(elements.editorial.heroLayer, snapshotState.editorial?.heroLayer);
  setInputValue(elements.editorial.heroX, snapshotState.editorial?.heroX);
  setInputValue(elements.editorial.heroY, snapshotState.editorial?.heroY);
  setInputValue(elements.editorial.heroZ, snapshotState.editorial?.heroZ);
  setInputValue(elements.editorial.heroMaxWidth, snapshotState.editorial?.heroMaxWidth);
  setCheckedValue(elements.editorial.heroBackground, snapshotState.editorial?.heroBackground);
  setInputValue(elements.editorial.heroBackgroundOpacity, snapshotState.editorial?.heroBackgroundOpacity);
  setInputValue(elements.editorial.heroBackgroundColor, snapshotState.editorial?.heroBackgroundColor);
  setInputValue(elements.editorial.heroPaddingX, snapshotState.editorial?.heroPaddingX);
  setInputValue(elements.editorial.heroPaddingY, snapshotState.editorial?.heroPaddingY);
  setCheckedValue(elements.editorial.heroMaskEnabled, snapshotState.editorial?.heroMaskEnabled);
  restoreSelectValue(elements.editorial.heroMaskType, snapshotState.editorial?.heroMaskType);
  setInputValue(elements.editorial.heroMaskWidth, snapshotState.editorial?.heroMaskWidth);
  setInputValue(elements.editorial.heroMaskHeight, snapshotState.editorial?.heroMaskHeight);
  setInputValue(elements.editorial.heroMaskX, snapshotState.editorial?.heroMaskX);
  setInputValue(elements.editorial.heroMaskY, snapshotState.editorial?.heroMaskY);
  setInputValue(elements.editorial.opticalSizeBias, snapshotState.editorial?.opticalSizeBias);
  setInputValue(elements.editorial.heroContrast, snapshotState.editorial?.heroContrast);
  setInputValue(elements.editorial.microContrast, snapshotState.editorial?.microContrast);
  setInputValue(elements.editorial.whitespaceBalance, snapshotState.editorial?.whitespaceBalance);
  setInputValue(elements.editorial.textDensity, snapshotState.editorial?.textDensity);
  restoreSelectValue(elements.editorial.gridPreset, snapshotState.editorial?.gridPreset);
  setInputValue(elements.editorial.gridSnap, snapshotState.editorial?.gridSnap);
  setInputValue(elements.editorial.gridMargin, snapshotState.editorial?.gridMargin);
  setInputValue(elements.editorial.gridGutter, snapshotState.editorial?.gridGutter);
  restoreSelectValue(elements.editorial.frameLogic, snapshotState.editorial?.frameLogic);
  setCheckedValue(elements.editorial.imageFollowHero, snapshotState.editorial?.imageFollowHero);
  setInputValue(elements.editorial.imageScaleBias, snapshotState.editorial?.imageScaleBias);
  restoreSelectValue(elements.editorial.animationPreset, snapshotState.editorial?.animationPreset);
  setInputValue(elements.editorial.animationSpeed, snapshotState.editorial?.animationSpeed);
  setInputValue(elements.editorial.animationIntensity, snapshotState.editorial?.animationIntensity);
  setInputValue(elements.editorial.labelsText, snapshotState.editorial?.labelsText?.join(", "));
  setInputValue(elements.editorial.labelsSize, snapshotState.editorial?.labelsSize);
  setInputValue(elements.editorial.labelsTracking, snapshotState.editorial?.labelsTracking);
  setInputValue(elements.editorial.labelsSpacing, snapshotState.editorial?.labelsSpacing);
  restoreSelectValue(elements.editorial.labelsAlign, snapshotState.editorial?.labelsAlign);
  setInputValue(elements.editorial.labelsZ, snapshotState.editorial?.labelsZ);
  restoreSelectValue(elements.editorial.labelsLayer, snapshotState.editorial?.labelsLayer);
  restoreSelectValue(elements.editorial.textFont, snapshotState.editorial?.textFontFamily);
  restoreSelectValue(elements.editorial.metadataFont, snapshotState.editorial?.metadataFontFamily);
  restoreSelectValue(elements.editorial.labelFont, snapshotState.editorial?.labelFontFamily);
  setInputValue(elements.editorial.infoText, joinEditorialBlocks(snapshotState.editorial?.infoTexts, snapshotState.editorial?.infoText));
  setInputValue(elements.editorial.infoFontSize, snapshotState.editorial?.infoFontSize);
  setInputValue(elements.editorial.infoTracking, snapshotState.editorial?.infoTracking);
  setInputValue(elements.editorial.infoLineHeight, snapshotState.editorial?.infoLineHeight);
  setInputValue(elements.editorial.infoWidth, snapshotState.editorial?.infoWidth);
  setInputValue(elements.editorial.infoHeight, snapshotState.editorial?.infoHeight);
  setInputValue(elements.editorial.infoPadding, snapshotState.editorial?.infoPadding);
  restoreSelectValue(elements.editorial.infoAlign, snapshotState.editorial?.infoAlign);
  setInputValue(elements.editorial.infoX, snapshotState.editorial?.infoX);
  setInputValue(elements.editorial.infoY, snapshotState.editorial?.infoY);
  setInputValue(elements.editorial.infoZ, snapshotState.editorial?.infoZ);
  restoreSelectValue(elements.editorial.infoLayer, snapshotState.editorial?.infoLayer);
  setCheckedValue(elements.editorial.infoBorder, snapshotState.editorial?.infoBorder);
  state.editorial.infoBlockSettings = normalizeEditorialInfoBlockSettings(
    snapshotState.editorial,
    snapshotState.editorial?.infoTexts?.length
  );
  setInputValue(elements.editorial.secondaryText, joinEditorialBlocks(snapshotState.editorial?.secondaryTexts, snapshotState.editorial?.secondaryText));
  setInputValue(elements.editorial.secondarySize, snapshotState.editorial?.secondarySize);
  setInputValue(elements.editorial.secondaryTracking, snapshotState.editorial?.secondaryTracking);
  setInputValue(elements.editorial.secondaryLineHeight, snapshotState.editorial?.secondaryLineHeight);
  setInputValue(elements.editorial.secondaryOpacity, snapshotState.editorial?.secondaryOpacity);
  setInputValue(elements.editorial.secondaryX, snapshotState.editorial?.secondaryX);
  setInputValue(elements.editorial.secondaryY, snapshotState.editorial?.secondaryY);
  setInputValue(elements.editorial.secondaryZ, snapshotState.editorial?.secondaryZ);
  restoreSelectValue(elements.editorial.secondaryLayer, snapshotState.editorial?.secondaryLayer);
  setCheckedValue(elements.editorial.showGuides, snapshotState.editorial?.showGuides);
  setInputValue(elements.editorial.mediaOpacity, snapshotState.editorial?.mediaOpacity);
  setInputValue(elements.editorial.mediaScale, snapshotState.editorial?.mediaScale);
  setInputValue(elements.editorial.labelBoxes, joinEditorialBlocks(snapshotState.editorial?.labelTexts));
  restoreSelectValue(elements.editorial.labelStyle, snapshotState.editorial?.labelStyle);
  setInputValue(elements.editorial.labelBoxSize, snapshotState.editorial?.labelBoxSize);
  setInputValue(elements.editorial.labelTracking, snapshotState.editorial?.labelTracking);
  setInputValue(elements.editorial.labelLineHeight, snapshotState.editorial?.labelLineHeight);
  setInputValue(elements.editorial.labelBoxOpacity, snapshotState.editorial?.labelBoxOpacity);
  setInputValue(elements.editorial.labelZ, snapshotState.editorial?.labelZ);
  restoreSelectValue(elements.editorial.labelLayer, snapshotState.editorial?.labelLayer);
  setInputValue(elements.editorial.overlapTextOpacity, snapshotState.editorial?.overlapTextOpacity);
  setInputValue(elements.editorial.overlapImageOpacity, snapshotState.editorial?.overlapImageOpacity);
  setInputValue(elements.editorial.overlapBrightness, snapshotState.editorial?.overlapBrightness);
  setInputValue(elements.editorial.overlapPriority, snapshotState.editorial?.overlapPriority);
  restoreSelectValue(elements.editorial.heroStyle, snapshotState.editorial?.heroStyle);
  restoreSelectValue(elements.editorial.textStyle, snapshotState.editorial?.textStyle);
  setInputValue(elements.editorial.outlineThickness, snapshotState.editorial?.outlineThickness);
  setInputValue(elements.editorial.shadowOpacity, snapshotState.editorial?.shadowOpacity);
  setInputValue(elements.editorial.duplicateOffsetX, snapshotState.editorial?.duplicateOffsetX);
  setInputValue(elements.editorial.duplicateOffsetY, snapshotState.editorial?.duplicateOffsetY);
  setInputValue(elements.editorial.brandOrbitTexts, joinEditorialBlocks(snapshotState.editorial?.brandOrbitTexts));
  renderEditorialBlockEditors();
}

function buildPersistencePayload(name = "") {
  updateVisualState();
  return {
    version: 1,
    id: globalThis.crypto?.randomUUID?.() || `composition-${Date.now()}`,
    name: name || elements.saved.nameInput?.value?.trim() || "My Composition",
    savedAt: new Date().toISOString(),
    selectedPanelTab,
    animationSourceTab,
    state: cloneSerializable(state),
    assets: cloneSerializable(persistedAssets)
  };
}

function buildPresetPayload(name, category, sourceTab) {
  updateVisualState();
  return {
    id: globalThis.crypto?.randomUUID?.() || `preset-${Date.now()}`,
    name,
    category,
    sourceTab,
    builtin: false,
    savedAt: new Date().toISOString(),
    payload: {
      selectedPanelTab: sourceTab,
      state: cloneSerializable(state),
      assets: cloneSerializable(persistedAssets)
    }
  };
}

async function applyPresetItem(preset) {
  if (!preset) {
    return;
  }

  if (preset.payload?.state) {
    await applySavedComposition({
      name: preset.name,
      selectedPanelTab: preset.payload.selectedPanelTab || preset.sourceTab,
      state: preset.payload.state,
      assets: preset.payload.assets || persistedAssets
    });
    return;
  }

  mergeIntoState(state, preset.payload || {});
  syncControlsFromStateSnapshot(state);
  updateOutputs();
  setPanelTab(preset.sourceTab || "system");
  if (studio) {
    await rebuildTypography();
    applyState({ persist: false, forceFitCamera: true, clearUserCameraOverride: true });
  }
  setStatus(`Loaded preset: ${preset.name}.`);
}

function renderSavedCompositionList() {
  if (!elements.saved.list) {
    return;
  }

  if (!compositionHistory.length) {
    elements.saved.list.innerHTML = "<p class=\"status\">No saved compositions yet.</p>";
    return;
  }

  elements.saved.list.innerHTML = compositionHistory.map((item) => {
    const date = new Date(item.savedAt || Date.now());
    const label = Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
    const tab = item.selectedPanelTab || "system";
    return `
      <article class="saved-item" data-saved-id="${item.id}">
        <div class="saved-item__meta">
          <strong>${escapeHtml(item.name || "Untitled Composition")}</strong>
          <span>${escapeHtml(tab)} · ${escapeHtml(label)}</span>
        </div>
        <div class="saved-item__actions">
          <button type="button" data-saved-action="load">Load</button>
          <button type="button" data-saved-action="delete">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

async function loadCompositionHistory() {
  const indexed = await idbGetAll("savedCompositions");
  const fallback = readStorage(COMPOSITION_HISTORY_STORAGE_KEY, []);
  compositionHistory = (Array.isArray(indexed) && indexed.length ? indexed : fallback)
    .sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime());
  renderSavedCompositionList();
}

function saveCompositionHistory() {
  compositionHistory = compositionHistory.slice(0, MAX_COMPOSITION_HISTORY);
  writeStorage(COMPOSITION_HISTORY_STORAGE_KEY, compositionHistory);
  renderSavedCompositionList();
}

async function persistSavedComposition(payload) {
  compositionHistory = [payload, ...compositionHistory.filter((item) => item.id !== payload.id)]
    .slice(0, MAX_COMPOSITION_HISTORY);
  await idbPut("savedCompositions", payload);
  saveCompositionHistory();
}

async function removeSavedComposition(id) {
  compositionHistory = compositionHistory.filter((item) => item.id !== id);
  await idbDelete("savedCompositions", id);
  saveCompositionHistory();
}

async function loadPresetLibrary() {
  const indexed = await idbGetAll("presetLibrary");
  const fallback = readStorage(PRESET_LIBRARY_STORAGE_KEY, []);
  presetLibrary = Array.isArray(indexed) && indexed.length ? indexed : (Array.isArray(fallback) ? fallback : []);
  renderPresetLibrary();
}

async function persistPresetLibraryItem(item) {
  await idbPut("presetLibrary", item);
  presetLibrary = [item, ...presetLibrary.filter((preset) => preset.id !== item.id)].slice(0, MAX_PRESET_HISTORY);
  writeStorage(PRESET_LIBRARY_STORAGE_KEY, presetLibrary);
  renderPresetLibrary();
}

async function removePresetLibraryItem(id) {
  await idbDelete("presetLibrary", id);
  presetLibrary = presetLibrary.filter((item) => item.id !== id);
  writeStorage(PRESET_LIBRARY_STORAGE_KEY, presetLibrary);
  renderPresetLibrary();
}

function saveSessionState() {
  writeStorage(SESSION_STORAGE_KEY, buildPersistencePayload("Auto Save"));
}

function scheduleSessionPersist() {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    saveSessionState();
  }, 240);
}

function clearSessionState() {
  window.clearTimeout(persistTimer);
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

async function resetAllToDefaults() {
  stopAnimationPlayback();
  cancelActiveExport("Recording stopped because the scene was reset.");

  persistedAssets = {
    pointImages: [],
    brandMainImages: [],
    brandOrbitImages: [],
    uploadedFonts: []
  };

  mergeIntoState(state, cloneSerializable(DEFAULT_STATE));
  sanitizeLegacyEditorialDefaults(state.editorial);
  syncControlsFromStateSnapshot(state);
  syncBrandExportControlsFromMain();
  updateOutputs();

  if (studio) {
    await applyPersistedAssetsToStudio();
  }

  animationSourceTab = "system";
  setPanelTab("system");
  applyPreviewAspectRatio();
  applyState({
    rebuildLayout: true,
    rebuildBackground: true,
    forceFitCamera: true,
    clearUserCameraOverride: true
  });
  scheduleSessionPersist();
  setStatus("All settings reset to defaults.");
}

function capturePersistedAssetsFromPayload(payload) {
  persistedAssets = {
    pointImages: [...(payload?.assets?.pointImages || [])],
    brandMainImages: [...(payload?.assets?.brandMainImages || [])],
    brandOrbitImages: [...(payload?.assets?.brandOrbitImages || [])],
    uploadedFonts: [...(payload?.assets?.uploadedFonts || [])]
  };
}

async function applyPersistedAssetsToStudio() {
  if (!studio) {
    return;
  }

  await studio.setPointImagesFromSources?.(persistedAssets.pointImages || []);
  await studio.setBrandMainImagesFromSources?.(persistedAssets.brandMainImages || []);
  await studio.setBrandOrbitImagesFromSources?.(persistedAssets.brandOrbitImages || []);
}

async function applySavedComposition(payload, options = {}) {
  if (!payload?.state) {
    return;
  }

  const restoredTab = payload.selectedPanelTab === "hand" ? "system" : (payload.selectedPanelTab || "system");
  animationSourceTab = payload.animationSourceTab || animationSourceTab || "system";
  mergeIntoState(state, payload.state);
  sanitizeLegacyEditorialDefaults(state.editorial);
  capturePersistedAssetsFromPayload(payload);
  await applyPersistedFontsToUi();
  syncControlsFromStateSnapshot(state);
  syncBrandExportControlsFromMain();
  applyPreviewAspectRatio();
  updateOutputs();
  renderAnimationKeyframeList();
  setPanelTab(restoredTab);

  if (!studio) {
    return;
  }

  await applyPersistedAssetsToStudio();
  await rebuildTypography();
  applyState({ persist: false });

  if (!options.silent) {
    setStatus(`Loaded composition: ${payload.name || "Untitled Composition"}.`);
  }
}

async function saveCurrentComposition() {
  const payload = buildPersistencePayload();
  await persistSavedComposition(payload);
  saveSessionState();
  setStatus(`Saved composition: ${payload.name}.`);
}

function setHelpText(element, helpText) {
  if (!element) {
    return;
  }

  if (helpText) {
    element.dataset.helpRu = helpText;
  } else {
    delete element.dataset.helpRu;
  }
}

function setSimpleText(selector, text, helpText) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  element.textContent = text;
  setHelpText(element, helpText);
}

function setFieldLabel(selector, text, helpText) {
  const control = document.querySelector(selector);
  const span = control?.closest(".field")?.querySelector("span");

  if (!span) {
    return;
  }

  const outputs = [...span.querySelectorAll("output")];
  span.textContent = text;
  setHelpText(span, helpText);

  for (const output of outputs) {
    span.append(" ", output);
  }
}

function setButtonText(selector, text, helpText) {
  const button = document.querySelector(selector);

  if (!button) {
    return;
  }

  button.textContent = text;
  setHelpText(button, helpText);
}

function setOptionTexts(selector, optionLabels = {}) {
  const select = document.querySelector(selector);

  if (!select) {
    return;
  }

  for (const option of select.querySelectorAll("option")) {
    if (optionLabels[option.value]) {
      option.textContent = optionLabels[option.value];
    }
  }
}

const COLLAPSIBLE_GROUP_META = {
  system: {
    "Step 1. Type": ["Текст и шрифт", "Основной текст, шрифт, размер и межбуквенное расстояние."],
    "Step 2. Render": ["Вид объекта", "Как показывать форму: контур, меш, точки или смешанный режим."],
    "Step 3. Glow": ["Свечение", "Включение bloom, цвет свечения и его сила."],
    Background: ["Фон", "Цвет фона, прозрачность и общий режим задника сцены."],
    "Step 4. Distort": ["Искажения", "Глобальные bend, twist, wave и noise для всей формы."],
    "Step 5. Variations": ["Вариации", "Сетка, seed и сила отклонений между экземплярами."],
    "Step X. Axis System": ["Система координат", "Осевая раскладка, направляющие и структурирование композиции."],
    "Brand Points": ["Контент в точках", "Изображения, тексты и плотность контента внутри точечного поля."],
    "Step 6. Camera": ["Камера", "Ракурс, поле зрения, дистанция и ручной сброс камеры."],
    Animation: ["Общая анимация", "Базовый пресет движения системы до таймлайна."],
    "Step 8. Export": ["Экспорт", "Формат кадра, размер, качество и частота кадров для вывода."],
    "Editorial Overlay": ["Оверлей типографики", "Подключение и показ редакционной типографики поверх System."],
    "Saved Compositions": ["Сохранения", "Локальная история композиций, автосейв и сохранение в пресеты."]
  },
  deform: {
    "Letter Control": ["Положение буквы", "Сдвиг и масштаб выбранной буквы по осям."],
    "Letter Deformation": ["Деформация буквы", "Локальный bend, twist и noise только для выбранной буквы."]
  },
  hand: {
    "Hand Control": ["Управление руками", "Режим hand tracking, live-preview камеры и экспорт из жестового режима."]
  },
  brand: {
    "Режим Бренда": ["Бренд-композиция", "Главный пресет бренда, hero-контент и orbit-источники."],
    "Текст Бренда": ["Тексты бренда", "Заголовок, подзаголовок, теги и фоновое слово."],
    "Герой": ["Главный объект", "Масштаб, глубина, наклон и доминирование центрального hero."],
    "Орбита": ["Окружение", "Кольца, радиусы, скорость, разброс и глубина orbit-элементов."],
    "Контент": ["Слои контента", "Видимость точек, изображений, текстов и внешний вид точечного слоя."],
    "Иерархия": ["Иерархия", "Приоритет hero и подавление второстепенных элементов."],
    "Переход": ["Смена бренда", "Стиль, длительность и характер перехода между активными брендами."],
    "Камера": ["Камера бренда", "Пресеты ракурса, drift, parallax и ручной сброс камеры."],
    "Вывод": ["Формат композиции", "Выходные рамки и композиционные пресеты под носитель."],
    "Настроение": ["Настроение", "Готовые mood-пресеты: luxury, chaos, tech, campaign."],
    "Дополнительно": ["Дополнительно", "Аура, след памяти, вес бренда и dual hero."],
    "Экспорт": ["Экспорт бренда", "Размер, пропорции, качество и форматы для Brand Mode."]
  },
  editorial: {
    "Editorial Typography": ["Редакционная типографика", "Главный режим для сборки типографического макета и оверлеев."],
    "Top Labels": ["Верхние подписи", "Микро-лейблы, разбивка по верхней линии и их ритм."],
    "Text Blocks": ["Текстовые блоки", "Основные информационные блоки, которые можно добавлять и двигать."],
    "Secondary Text": ["Вторичный текст", "Дополнительные подписи, метаданные и акцентные строки."],
    "Layout & Guides": ["Макет и направляющие", "Структура раскладки, гайды и поведение media-слоя."],
    Masks: ["Маски", "Подрезка hero и текста прямоугольными или мягкими масками."],
    Optical: ["Оптический баланс", "Контраст ролей текста, плотность и работа с негативным пространством."],
    Grid: ["Сетка", "Колонки, поля, gutter и snapping для более строгой вёрстки."],
    "Frame Logic": ["Логика кадра", "Как изображение подчиняется hero-тексту и общей типографической рамке."],
    Animation: ["Анимация текста", "Пресеты движения для editorial-текстов и скорость их проявления."],
    Fonts: ["Шрифтовые роли", "Hero serif, metadata mono и отдельные шрифты для разных ролей."],
    Labels: ["Лейблы и стикеры", "Малые маркировки, плашки и служебные подписи."],
    Overlap: ["Перекрытия", "Как текст и изображение влияют друг на друга в зоне пересечения."],
    "Text Styles": ["Стиль текста", "Fill, outline, duplicate и прочие способы рендера текста."],
    "Brand Orbit Text": ["Текст для орбиты бренда", "Слова и карточки, которые можно отправить в Brand Mode."],
    Export: ["Экспорт типографики", "Форматы и параметры вывода для editorial-макета."]
  },
  cinematic: {
    "Cinematic Mode": ["Кинематографичный режим", "Глубинная медиа-композиция для motion, GIF и видео."]
  },
  animation: {
    "Animation Timeline": ["Таймлайн", "Ключи камеры и композиции, playhead, playback и запись движения."],
    Tracks: ["Дорожки", "Наглядное расположение ключей камеры и композиции по времени."]
  },
  presets: {
    "Preset Library": ["Библиотека пресетов", "Встроенные шаблоны и ваши сохранённые пресеты по категориям."]
  }
};

function enhanceCollapsibleGroups() {
  const groups = [...document.querySelectorAll(".panel-pane .group")];

  for (const group of groups) {
    if (group.dataset.collapsibleReady === "true") {
      continue;
    }

    const heading = group.querySelector(":scope > h2");
    if (!heading) {
      continue;
    }

    const paneName = group.closest("[data-panel-pane]")?.dataset.panelPane || "";
    const originalTitle = heading.textContent.trim();
    const meta = COLLAPSIBLE_GROUP_META[paneName]?.[originalTitle];

    const content = document.createElement("div");
    content.className = "group__content";

    while (heading.nextSibling) {
      content.appendChild(heading.nextSibling);
    }

    group.appendChild(content);
    heading.classList.add("group__heading");
    heading.setAttribute("role", "button");
    heading.setAttribute("tabindex", "0");
    heading.setAttribute("aria-expanded", "false");

    if (meta) {
      heading.innerHTML = `
        <span class="group__heading-main">
          <span class="group__heading-title">${escapeHtml(meta[0])}</span>
          <span class="group__heading-description">${escapeHtml(meta[1])}</span>
        </span>
      `;
    }

    const toggle = () => {
      const collapsed = !group.classList.contains("is-collapsed");
      group.classList.toggle("is-collapsed", collapsed);
      content.hidden = collapsed;
      heading.setAttribute("aria-expanded", collapsed ? "false" : "true");
    };

    heading.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("button, input, select, textarea, label, a")) {
        return;
      }
      toggle();
    });

    heading.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });

    group.classList.add("is-collapsed");
    content.hidden = true;
    group.dataset.collapsibleReady = "true";
  }
}

function applyUiLanguageAndHelp() {
  const simpleText = [
    ["button[data-panel-tab='system']", "System", "Основная рабочая вкладка со всеми общими настройками типографики, сцены, камеры и экспорта."],
    ["button[data-panel-tab='deform']", "Letter Deform", "Ручная деформация отдельных букв прямо в сцене."],
    ["button[data-panel-tab='editorial']", "Editorial", "Постерный редакционный режим с hero-словом, микро-лейблами и инфоблоками."],
    ["button[data-panel-tab='brand']", "Brand Mode", "Композиционный режим с главным брендом в центре и окружением вокруг него."],
    ["button[data-panel-tab='cinematic']", "Cinematic", "Режим для глубинных медиа-композиций и анимированного вывода."],
    ["button[data-panel-tab='animation']", "Animation", "Покадровый таймлайн для записи ключей камеры и сборки собственной анимации как в motion-редакторе."],
    ["button[data-panel-tab='presets']", "Presets", "Библиотека встроенных и пользовательских пресетов для быстрого старта макета."],
    ["button[data-panel-tab='hand']", "Hand Control", "Управление системой жестами через веб-камеру."],
    ["[data-panel-pane='brand'] .group:nth-of-type(1) h2", "Brand Mode", "Главные настройки композиции бренда: пресет, главный контент и контент орбиты."],
    ["[data-panel-pane='brand'] .group:nth-of-type(2) h2", "Brand Text", "Текстовые параметры для блоков бренда, подписей и фонового слова."],
    ["[data-panel-pane='brand'] .group:nth-of-type(3) h2", "Hero", "Параметры центрального hero-элемента бренда: масштаб, поворот, глубина и доминирование."],
    ["[data-panel-pane='brand'] .group:nth-of-type(4) h2", "Orbit", "Настройки окружения вокруг hero: радиусы, скорость, разброс, кольца и масштаб элементов."],
    ["[data-panel-pane='brand'] .group:nth-of-type(5) h2", "Content", "Показывает или скрывает слои контента бренда и настраивает внешний вид точек и текстов."],
    ["[data-panel-pane='brand'] .group:nth-of-type(6) h2", "Hierarchy", "Ослабляет или усиливает второстепенные элементы, чтобы композиция оставалась читаемой."],
    ["[data-panel-pane='brand'] .group:nth-of-type(7) h2", "Transition", "Параметры анимации при переключении активного бренда."],
    ["[data-panel-pane='brand'] .group:nth-of-type(8) h2", "Camera", "Камерные пресеты и лёгкое движение камеры только для Brand Mode."],
    ["[data-panel-pane='brand'] .group:nth-of-type(9) h2", "Output", "Рамки и композиционные пресеты под разные форматы кампаний."],
    ["[data-panel-pane='brand'] .group:nth-of-type(10) h2", "Mood", "Поведенческие и визуальные пресеты настроения композиции бренда."],
    ["[data-panel-pane='brand'] .group:nth-of-type(11) h2", "Advanced", "Дополнительные акценты: аура, след памяти, вес бренда и dual hero."],
    ["[data-panel-pane='brand'] .group:nth-of-type(12) h2", "Export", "Экспорт Brand Mode в нужный формат, размер и пропорцию кадра."],
    ["#reset-camera-button", "Reset Camera", "Возвращает камеру к автоматическому кадрированию по текущему пресету."],
    ["#brand-reset-camera-button", "Reset Camera", "Сбрасывает ручное движение камеры и возвращает бренд-композицию в автокадрирование."],
    ["#brand-clear-orbit", "Clear Orbit", "Удаляет текущий orbit-контент, оставляя только центральный hero."],
    ["#brand-randomize-orbit", "Randomize Orbit", "Перестраивает расположение orbit-элементов с новым случайным seed."],
    ["#brand-reset-main", "Reset Hero", "Возвращает hero и brand-настройки к базовому состоянию."],
    ["[data-panel-pane='hand'] .group:nth-of-type(1) h2", "Hand Control", "Настройки режима жестов, предпросмотр камеры и live-export из hand mode."],
    ["[data-panel-pane='cinematic'] .group:nth-of-type(1) h2", "Cinematic Mode", "Глубинная медиа-композиция с параметрами для motion-экспорта."],
    ["[data-panel-pane='animation'] .group:nth-of-type(1) h2", "Animation Timeline", "Таймлайн с ключами камеры: ставите playhead, двигаете preview и сохраняете нужные состояния."],
    ["[data-panel-pane='presets'] .group:nth-of-type(1) h2", "Preset Library", "Готовые шаблоны и ваши собственные пресеты, которые можно подгрузить и продолжить редактировать."],
    ["[data-panel-pane='deform'] .group:nth-of-type(1) h2", "Letter Control", "Позиция и масштаб выбранной буквы."],
    ["[data-panel-pane='deform'] .group:nth-of-type(2) h2", "Letter Deformation", "Локальные bend, twist и noise для выбранной буквы."],
    ["[data-panel-pane='system'] .group:nth-of-type(10) h2", "Saved Compositions", "Локальная история сохранённых пресетов и автосейв текущего состояния редактора."]
  ];

  const fieldLabels = [
    ["#text-input", "Text", "Основной текст, который превращается в 3D-типографику."],
    ["#font-select", "Font", "Выбор шрифта для генерации базовой формы."],
    ["#font-upload", "Upload Font", "Загружает собственный TTF или OTF шрифт."],
    ["#font-size", "Size", "Размер базовой типографики перед любыми деформациями."],
    ["#tracking", "Tracking", "Расстояние между символами."],
    ["#line-height", "Line Height", "Высота строки для многострочного текста."],
    ["#stroke-width", "Stroke Width", "Толщина линий в outline-режиме."],
    ["#point-size", "Point Size", "Базовый размер точек в point cloud, mesh-points и hybrid."],
    ["#point-opacity", "Point Opacity", "Прозрачность точечного слоя."],
    ["#point-color-mode", "Point Color Mode", "Способ окраски точек: один цвет, градиент или случайная палитра."],
    ["#point-color-a", "Point Color A", "Первый цвет точки или начало градиента."],
    ["#point-color-b", "Point Color B", "Второй цвет точки или конец градиента."],
    ["#glow-enabled", "Glow", "Включает или выключает glow/bloom слой."],
    ["#glow-base-points-only", "Glow White Points Only", "Оставляет glow только на обычных белых точках, без свечения фото и текстовых content-элементов."],
    ["#glow-color", "Glow Color", "Цвет свечения вокруг формы."],
    ["#glow-intensity", "Glow Intensity", "Сила bloom и общего свечения."],
    ["#background-color", "Background Color", "Цвет фона сцены и экспорта без прозрачности."],
    ["#transparent-background", "Transparent Background", "Если включено, PNG и подходящие export-path используют прозрачный фон."],
    ["#bend", "Bend", "Глобальный изгиб формы."],
    ["#twist", "Twist", "Глобальное скручивание формы."],
    ["#wave", "Wave", "Волновое искажение по нескольким осям."],
    ["#noise", "Noise", "Случайное нарушение формы и поверхности."],
    ["#grid-enabled", "Grid Mode", "Включает раскладку вариаций в сетку вместо одного объекта."],
    ["#grid-rows", "Rows", "Количество строк в variation-grid."],
    ["#grid-cols", "Cols", "Количество колонок в variation-grid."],
    ["#seed-input", "Seed", "Seed для повторяемой генерации вариантов."],
    ["#variation-intensity", "Variation Intensity", "Общая сила вариаций и отклонений между экземплярами."],
    ["#axis-step-enabled", "Axis Step", "Переключает координатную раскладку по осям."],
    ["#axis-guides-enabled", "Axis Guides", "Показывает направляющие оси и сетку для axis-layout."],
    ["#point-image-upload", "Upload Images", "Загружает изображения для image-content и брендовых точек."],
    ["#point-text-input", "Content Texts", "Список слов и фраз, которые могут появляться как text-content."],
    ["#point-text-font", "Content Text Font", "Отдельный шрифт для вторичных text-content слов внутри System."],
    ["#point-text-font-upload", "Upload Content Text Font", "Загружает отдельный шрифт только для вторичных text-content слов в System."],
    ["#point-text-uppercase", "Uppercase Text", "Принудительно переводит secondary text-content в капс. Выключите, чтобы сохранить обычный регистр."],
    ["#point-text-background", "Text Background", "Показывает или скрывает плашку под secondary text-content."],
    ["#point-text-color", "Text Color", "Отдельный цвет самого secondary text-content."],
    ["#point-text-background-color", "Background Color", "Отдельный цвет плашки у secondary text-content."],
    ["#content-density", "Content Density", "Доля точек, заменённых на image или text content."],
    ["#content-fill-points", "Fill All Points", "Насколько плотно форма текста заполняется загруженными изображениями вместо обычных точек."],
    ["#content-hover-scale", "Hover Scale", "Целевой размер image/text content при наведении, в пикселях."],
    ["#image-ratio", "Image %", "Процент image-content внутри content-layer."],
    ["#text-ratio", "Text %", "Процент text-content внутри content-layer."],
    ["#empty-ratio", "Empty %", "Процент пустых точек без контента."],
    ["#content-layout-mode", "Composition", "Базовая раскладка content-layer: field, grid, perspective, arc и другие."],
    ["#media-space-preset", "Media Space Preset", "Пресет пространственной раскладки медиа-панелей."],
    ["#expansion-randomness", "Expansion Randomness", "Насколько expansion уходит только по глубине или разлетается по XYZ."],
    ["#hover-proximity-strength", "Hover Proximity", "Насколько сильно элемент выталкивается к камере при наведении."],
    ["#cinematic-depth-speed", "Depth Speed", "Скорость движения контента по глубине."],
    ["#cinematic-direction", "Direction", "Направление движения по глубине: вперёд или назад."],
    ["#content-only-mode", "Content Only", "Оставляет только content-layer без базового шумового поля."],
    ["#content-only-type", "Content Layer", "Выбирает, какие типы контента оставлять: image, text или mixed."],
    ["#filter-kind", "Filter", "Фильтрация контента по категории или типу."],
    ["#boundary-shape", "Boundary", "Граница пространства для шага boundary system."],
    ["#field-shape", "Field Shape", "Форма поля распределения: plane, sphere, spiral, ribbon."],
    ["#trail-length", "Trail Length", "Длина следа у trail-step."],
    ["#camera-fov", "FOV", "Угол обзора камеры."],
    ["#camera-distance", "Distance", "Базовая дистанция камеры до сцены."],
    ["#animation-preset", "Preset", "Анимационный пресет для системы."],
    ["#export-ratio", "Format Ratio", "Пропорция кадра для preview и экспорта."],
    ["#export-size", "Base Size", "Базовая ширина или высота export-кадра."],
    ["#export-frames", "Frames", "Количество кадров для GIF и некоторых capture-path."],
    ["#export-duration", "Duration", "Длительность записи в секундах."],
    ["#export-quality", "Quality", "Качество кодирования изображения или видео."],
    ["#export-fps", "FPS", "Частота кадров при записи видео или GIF."],
    ["#hand-export-ratio", "Format Ratio", "Пропорция кадра для экспорта из Hand Control."],
    ["#hand-export-size", "Base Size", "Базовый размер кадра для Hand Control export."],
    ["#hand-export-frames", "Frames", "Количество кадров для GIF при записи из Hand Control."],
    ["#hand-export-duration", "Duration", "Длительность записи из Hand Control в секундах."],
    ["#hand-export-quality", "Quality", "Качество кодирования GIF/MP4 из Hand Control."],
    ["#hand-export-fps", "FPS", "Частота кадров при записи Hand Control export."],
    ["#cinematic-background-color", "Background Color", "Цвет фона для Cinematic export."],
    ["#cinematic-transparent-background", "Transparent Background", "Сохраняет PNG из Cinematic с прозрачным фоном."],
    ["#cinematic-export-ratio", "Format Ratio", "Пропорция кадра для Cinematic export."],
    ["#cinematic-export-size", "Base Size", "Базовый размер кадра для Cinematic export."],
    ["#cinematic-export-frames", "Frames", "Количество кадров для GIF при записи из Cinematic."],
    ["#cinematic-export-duration", "Duration", "Длительность записи из Cinematic в секундах."],
    ["#cinematic-export-quality", "Quality", "Качество кодирования GIF/MP4 из Cinematic."],
    ["#cinematic-export-fps", "FPS", "Частота кадров при записи Cinematic export."],
    ["#letter-move-x", "Move X", "Сдвиг выбранной буквы по оси X."],
    ["#letter-move-y", "Move Y", "Сдвиг выбранной буквы по оси Y."],
    ["#letter-move-z", "Move Z", "Сдвиг выбранной буквы по глубине."],
    ["#letter-scale-x", "Scale X", "Растяжение буквы по оси X."],
    ["#letter-scale-y", "Scale Y", "Растяжение буквы по оси Y."],
    ["#letter-scale-z", "Scale Z", "Растяжение буквы по оси Z."],
    ["#letter-bend-x", "Bend X", "Изгиб выбранной буквы по оси X."],
    ["#letter-bend-y", "Bend Y", "Изгиб выбранной буквы по оси Y."],
    ["#letter-bend-z", "Bend Z", "Изгиб выбранной буквы по оси Z."],
    ["#letter-twist-x", "Twist X", "Скручивание выбранной буквы по оси X."],
    ["#letter-twist-y", "Twist Y", "Скручивание выбранной буквы по оси Y."],
    ["#letter-twist-z", "Twist Z", "Скручивание выбранной буквы по оси Z."],
    ["#letter-noise", "Noise", "Локальный шум выбранной буквы."],
    ["#hand-mode", "Hand Mode", "Выбирает, жесты управляют общей системой или Brand Mode."],
    ["#brand-preset", "Composition Preset", "Готовая структура композиции бренда: orbit, tunnel, wall, runway и другие."],
    ["#brand-main-kind", "Main Content", "Выбирает тип hero-контента: image, text или auto."],
    ["#brand-main-image-upload", "Main Image", "Главное изображение для hero-элемента."],
    ["#brand-main-text", "Main Text", "Текст, который может использоваться как hero вместо изображения."],
    ["#brand-orbit-image-upload", "Orbit Images", "Набор изображений для orbit-системы вокруг hero."],
    ["#brand-orbit-texts", "Orbit Texts", "Список слов и текстовых элементов для orbit-контента."],
    ["#brand-text-font-size", "Font Size", "Размер брендовых текстовых блоков."],
    ["#brand-text-align", "Text Align", "Выравнивание текстовых блоков."],
    ["#brand-text-color", "Text Color", "Цвет брендовых текстов."],
    ["#brand-main-scale", "Hero Scale", "Независимый масштаб центрального hero."],
    ["#brand-main-rotate-x", "Rotate X", "Поворот hero по оси X."],
    ["#brand-main-rotate-y", "Rotate Y", "Поворот hero по оси Y."],
    ["#brand-main-rotate-z", "Rotate Z", "Поворот hero по оси Z."],
    ["#brand-main-depth", "Hero Depth", "Дополнительное смещение hero по глубине."],
    ["#brand-active-depth-offset", "Active Brand Depth", "Насколько активный бренд находится ближе к камере или глубже в сцене."],
    ["#brand-main-tilt", "Hero Tilt", "Лёгкий редакционный наклон hero."],
    ["#brand-hero-skew", "Hero Skew", "Небольшой скос или псевдо-перспектива hero."],
    ["#brand-hero-opacity", "Hero Opacity", "Прозрачность центрального hero."],
    ["#brand-hero-dominance", "Hero Dominance", "Сила визуального доминирования hero над окружением."],
    ["#brand-show-points", "Show Points", "Показывает или скрывает точечный слой в Brand Mode."],
    ["#brand-show-images", "Show Images", "Показывает или скрывает image-plane элементы в Brand Mode."],
    ["#brand-show-text", "Show Text", "Показывает или скрывает текстовые элементы в Brand Mode."],
    ["#brand-orbit-speed", "Orbit Speed", "Скорость вращения окружения вокруг hero."],
    ["#brand-orbit-radius", "Orbit Radius", "Базовый радиус орбит вокруг центрального бренда."],
    ["#brand-number-of-rings", "Rings", "Количество кольцевых слоёв в orbit-системе."],
    ["#brand-orbit-spacing", "Orbit Spacing", "Расстояние между кольцами орбиты."],
    ["#brand-orbit-randomness", "Orbit Randomness", "Степень отклонения orbit-элементов от строгой структуры."],
    ["#brand-orbit-jitter", "Orbit Jitter", "Небольшое живое дрожание orbit-элементов."],
    ["#brand-orbit-min-scale", "Orbit Min Scale", "Минимальный размер orbit-элементов."],
    ["#brand-orbit-max-scale", "Orbit Max Scale", "Максимальный размер orbit-элементов."],
    ["#brand-orbit-distance", "Orbit Distance", "Дистанция orbit-контента от центра."],
    ["#brand-orbit-depth-spread", "Depth Spread", "Разброс orbit-элементов по оси Z."],
    ["#brand-cluster-strength", "Cluster Strength", "Насколько сильно orbit-элементы собираются в локальные группы."],
    ["#brand-attraction-to-hero", "Attraction to Hero", "Сила притяжения orbit-контента к hero."],
    ["#brand-repulsion-from-hero", "Repulsion from Hero", "Сила отталкивания orbit-контента от hero."],
    ["#brand-orbit-random-rotation", "Random Orbit Rotation", "Разрешает случайный поворот orbit-элементов."],
    ["#brand-point-density", "Point Count", "Сколько точек показывать в Brand Mode относительно полной плотности."],
    ["#brand-point-size", "Point Size", "Размер точек внутри Brand Mode."],
    ["#brand-point-opacity", "Point Opacity", "Прозрачность точечного слоя внутри Brand Mode."],
    ["#brand-point-color-mode", "Point Color Mode", "Режим цвета точек только для Brand Mode."],
    ["#brand-point-color-a", "Point Color A", "Первый цвет брендовых точек."],
    ["#brand-point-color-b", "Point Color B", "Второй цвет брендовых точек."],
    ["#brand-title-text", "Title", "Крупный заголовок композиции бренда."],
    ["#brand-subtitle-text", "Subtitle", "Второй текстовый уровень: сезон, город, год и т.п."],
    ["#brand-tag-text", "Tag / Label", "Короткая метка или акцентный текст."],
    ["#brand-background-word", "Background Word", "Большое фоновое слово позади hero."],
    ["#brand-text-line-height", "Text Line Height", "Интерлиньяж брендовых текстов."],
    ["#brand-text-letter-spacing", "Text Tracking", "Межбуквенное расстояние в брендовых текстах."],
    ["#brand-text-opacity", "Text Opacity", "Прозрачность текстовых plane-элементов."],
    ["#brand-secondary-emphasis", "Secondary Emphasis", "Насколько заметны второстепенные элементы."],
    ["#brand-background-suppression", "Background Suppression", "Насколько приглушаются дальние и фоновые элементы."],
    ["#brand-opacity-falloff-depth", "Opacity Falloff", "Как быстро падает прозрачность с глубиной."],
    ["#brand-scale-falloff-distance", "Scale Falloff", "Как быстро уменьшается размер с расстоянием от hero."],
    ["#brand-blur-falloff-depth", "Blur Falloff", "Дополнительное ослабление дальних элементов."],
    ["#brand-transition-style", "Transition Style", "Стиль перехода при смене активного бренда."],
    ["#brand-transition-duration", "Transition Duration", "Длительность переключения бренда."],
    ["#brand-transition-easing", "Transition Easing", "Характер ускорения и замедления перехода."],
    ["#brand-camera-preset", "Brand Camera", "Камерный пресет, действующий только в Brand Mode."],
    ["#brand-slow-camera-drift", "Slow Camera Drift", "Медленное автоматическое движение камеры вокруг композиции."],
    ["#brand-parallax-strength", "Parallax Strength", "Сила отклика камеры на движение курсора."],
    ["#brand-output-preset", "Output Preset", "Композиционный пресет под конкретный формат кампании."],
    ["#brand-mood-preset", "Mood Preset", "Предустановка настроения: luxury, chaos, tech, campaign."],
    ["#brand-aura-strength", "Aura Strength", "Сила визуального поля вокруг hero."],
    ["#brand-aura-radius", "Aura Radius", "Радиус ауры вокруг активного бренда."],
    ["#brand-aura-opacity", "Aura Opacity", "Прозрачность ауры."],
    ["#brand-memory-duration", "Memory Duration", "Длина следа предыдущего бренда при переключении."],
    ["#brand-memory-opacity", "Memory Opacity", "Прозрачность memory-trace."],
    ["#brand-memory-offset", "Memory Offset", "Насколько далеко след уходит от текущего hero."],
    ["#brand-weight", "Brand Weight", "Масса бренда, влияющая на устойчивость орбиты и dominance."],
    ["#brand-dual-hero-enabled", "Dual Hero", "Включает режим двух центральных hero-элементов."],
    ["#brand-dual-hero-distance", "Dual Hero Distance", "Расстояние между двумя hero при dual-режиме."],
    ["#brand-dual-hero-balance", "Dual Hero Balance", "Баланс доминирования между двумя hero."],
    ["#brand-background-color", "Background Color", "Цвет фона для Brand Mode preview и export."],
    ["#brand-transparent-background", "Transparent Background", "Использовать прозрачный фон в Brand Mode export."],
    ["#brand-export-ratio", "Format Ratio", "Формат кадра для Brand Mode export."],
    ["#brand-export-size", "Base Size", "Базовый размер кадра Brand Mode export."],
    ["#brand-export-frames", "Frames", "Количество кадров для GIF и motion export."],
    ["#brand-export-duration", "Duration", "Длительность записи Brand Mode export."],
    ["#brand-export-quality", "Quality", "Качество кодирования Brand Mode export."],
    ["#brand-export-fps", "FPS", "Частота кадров Brand Mode export."],
    ["#saved-composition-name", "Preset Name", "Имя, под которым текущая композиция сохранится в истории браузера."],
    ["#animation-duration", "Duration", "Общая длительность таймлайна анимации."],
    ["#animation-current-time", "Timeline", "Текущее время таймлайна в секундах. В эту точку ставится ключ или применяется интерполяция."],
    ["#animation-loop", "Loop Playback", "Зацикливает проигрывание таймлайна."],
    ["#animation-capture-composition", "Record Composition State", "Если включено, ключи будут запоминать ещё и параметры макета текущего режима, а не только камеру."],
    ["#animation-easing", "Easing", "Смягчает переходы между ключами: slow in, slow out и более кинематографичные варианты."],
    ["#animation-flight-profile", "Flight Speed Curve", "Профиль скорости движения между ключами: равномерно, медленный старт, быстрый финиш и т.д."],
    ["#animation-flight-intensity", "Flight Intensity", "Насколько сильно влияет выбранный easing/скоростной профиль на пролёт камеры."],
    ["#preset-category-filter", "Category", "Фильтрует библиотеку пресетов по типу макета."],
    ["#preset-modal-name", "Preset Name", "Имя нового пресета в библиотеке."],
    ["#preset-modal-category", "Category", "Категория, куда будет сохранён новый пресет."],
    ["#preset-modal-source-tab", "Source Mode", "Режим, с которым этот пресет будет открываться по умолчанию."],
    ["#cinematic-layout-preset", "Layout Preset", "Пресет глубинной cinematic-раскладки."],
    ["#cinematic-show-points", "Show Points", "Показывать подложку из точек в Cinematic Mode."],
    ["#cinematic-expansion-randomness", "Expansion Randomness", "Насколько cinematic-элементы разлетаются по XY и Z при expansion."],
    ["#cinematic-hover-proximity-strength", "Hover Proximity", "Насколько сильно элемент выдвигается вперёд при hover."],
    ["#cinematic-depth-speed-tab", "Depth Speed", "Скорость глубинного движения в cinematic."],
    ["#cinematic-direction-tab", "Direction", "Направление движения cinematic-композиции."]
  ];

  const buttonText = [
    ["button[data-render-mode='outline']", "Outline", "Контурный режим без сплошной заливки."],
    ["button[data-render-mode='mesh']", "Mesh", "Полутвёрдая поверхностная форма."],
    ["button[data-render-mode='points']", "Point Cloud", "Точечное облако наподобие скана."],
    ["button[data-render-mode='hybrid']", "Hybrid", "Комбинирует несколько способов отображения."],
    ["button[data-background-mode='single']", "Single Background", "Один сплошной фон за композицией."],
    ["button[data-background-mode='blocks']", "Color Blocks", "Фон из цветовых блоков в редакционном стиле."],
    ["button[data-interaction-mode='none']", "None", "Отключает interaction-layer."],
    ["button[data-interaction-mode='activation']", "Activation", "Наведение активирует отдельные элементы."],
    ["button[data-interaction-mode='scan']", "Scan", "Курсор работает как сканер, проявляя объекты рядом."],
    ["button[data-interaction-mode='connection']", "Connection", "Показывает связи между точками и узлами."],
    ["button[data-interaction-mode='chaos']", "Chaos", "Разбрасывает систему и собирает её обратно."],
    ["button[data-interaction-mode='cluster']", "Cluster", "Собирает элементы в кластеры."],
    ["button[data-step-mode='none']", "No Step", "Обычное поведение без специального step-слоя."],
    ["button[data-step-mode='force-field']", "Force Field", "Силовое поле притягивает и отталкивает элементы."],
    ["button[data-step-mode='relation']", "Relation", "Показывает смысловые связи и отношения."],
    ["button[data-step-mode='curation']", "Curation", "Ручное закрепление якорей и организация системы."],
    ["button[data-step-mode='snapshot']", "Snapshot", "Замораживает текущее состояние для итогового кадра."],
    ["button[data-step-mode='camera-drama']", "Camera Drama", "Камерный акцент на выбранных элементах."],
    ["button[data-step-mode='filter']", "Filter", "Оставляет в фокусе только выбранный тип контента."],
    ["button[data-step-mode='material-state']", "Material State", "Плавно переводит точки между dot, image, text и fragment."],
    ["button[data-step-mode='boundary']", "Boundary", "Ограничивает систему заданной пространственной границей."],
    ["button[data-step-mode='trail']", "Trail", "Оставляет след движения у элементов."],
    ["button[data-step-mode='field-shape']", "Field Shape", "Меняет общую форму поля распределения."],
    ["button[data-step-mode='media-space']", "Media Space", "Превращает контент в пространственную композицию плоскостей."],
    ["button[data-step-mode='cinematic-export']", "Cinematic Export", "Подготавливает motion-композицию под глубинный экспорт."],
    ["button[data-step-mode='direct-manipulation']", "Direct Manip", "Ручное редактирование букв и форм в viewport."],
    ["button[data-step-mode='axis-visualization']", "Axis Viz", "Показывает оси и локальные координаты в сцене."],
    ["button[data-camera='front']", "Front", "Фронтальный вид на композицию."],
    ["button[data-camera='perspective']", "Perspective", "Перспективный ракурс по умолчанию."],
    ["button[data-camera='top']", "Top", "Вид сверху."],
    ["button[data-camera='editorial']", "Editorial", "Наклонённый редакционный ракурс."],
    ["#randomize-composition-button", "Random", "Генерирует новую композицию для текущего режима, не удаляя сохранённые композиции и пресеты."],
    ["#invert-composition-button", "Invert", "Переключает текущую композицию между тёмной и светлой палитрой: фон, точки, текст и плашки меняются местами, но фотографии не трогаются."],
    ["#auto-motion-toggle", "Pause Motion", "Ставит на паузу автоматические orbit, drift, pulse и другие фоновые движения во всех режимах, не отключая ручное управление камерой."],
    ["#letter-reset-selected", "Reset Selected", "Сбрасывает только выбранную букву."],
    ["#letter-reset-all", "Reset All", "Сбрасывает все ручные правки букв."],
    ["[data-panel-pane='hand'] button[data-export='gif']", "GIF", "Экспорт live-preview из Hand Control в GIF."],
    ["[data-panel-pane='hand'] button[data-export='mp4']", "MP4", "Экспорт live-preview из Hand Control в видео."],
    ["[data-panel-pane='brand'] button[data-export='png']", "PNG", "Экспорт статичного кадра с альфой при необходимости."],
    ["[data-panel-pane='brand'] button[data-export='jpg']", "JPG", "Экспорт статичного кадра без прозрачности."],
    ["[data-panel-pane='brand'] button[data-export='gif']", "GIF", "Запись preview Brand Mode в GIF."],
    ["[data-panel-pane='brand'] button[data-export='mp4']", "MP4", "Запись preview Brand Mode в видео."],
    ["[data-panel-pane='brand'] button[data-export='svg']", "SVG", "Векторный экспорт доступного контурного представления."],
    ["[data-panel-pane='brand'] button[data-export='gltf']", "GLTF", "Экспорт 3D-сцены в GLTF."],
    ["[data-panel-pane='brand'] button[data-export='obj']", "OBJ", "Экспорт 3D-сцены в OBJ."],
    ["[data-panel-pane='cinematic'] button[data-export='gif']", "GIF", "Запись live-preview Cinematic Mode в GIF."],
    ["[data-panel-pane='cinematic'] button[data-export='mp4']", "MP4", "Запись live-preview Cinematic Mode в видео."],
    ["#animation-add-keyframe", "Add Keyframe", "Записывает новый ключ камеры в текущую позицию таймлайна."],
    ["#animation-update-keyframe", "Update Keyframe", "Обновляет выбранный ключ текущим положением камеры."],
    ["#animation-delete-keyframe", "Delete Keyframe", "Удаляет выбранный ключ из таймлайна."],
    ["#animation-prev-keyframe", "Prev Key", "Переходит к предыдущему ключу на таймлайне."],
    ["#animation-next-keyframe", "Next Key", "Переходит к следующему ключу на таймлайне."],
    ["#animation-save-current-view", "Save Current View", "Сохраняет текущее положение preview в ближайший ключ на этом времени или создаёт новый ключ в этой секунде."],
    ["#animation-play-toggle", "Play", "Запускает или ставит на паузу проигрывание анимации по ключам."],
    ["#animation-stop", "Stop", "Останавливает воспроизведение и возвращает таймлайн в начало."],
    ["#animation-save-preset", "Save as Preset", "Сохраняет текущий таймлайн и связанные настройки как пресет."],
    ["#animation-advanced-toggle", "Advanced Tracks", "Открывает скрытые дополнительные треки, чтобы ключи могли запоминать не только камеру, но и саму композицию."],
    ["[data-panel-pane='animation'] button[data-export='gif']", "GIF", "Экспорт анимации из вкладки Animation в GIF."],
    ["[data-panel-pane='animation'] button[data-export='mp4']", "MP4", "Экспорт анимации из вкладки Animation в видео."],
    ["#save-preset-button", "Save as Preset", "Сохраняет текущую System-композицию в библиотеку пресетов."],
    ["#brand-save-preset", "Save as Preset", "Сохраняет текущий Brand Mode макет в библиотеку пресетов."],
    ["#editorial-save-preset", "Save as Preset", "Сохраняет текущий Editorial макет в библиотеку пресетов."],
    ["#cinematic-save-preset", "Save as Preset", "Сохраняет текущий Cinematic макет в библиотеку пресетов."],
    ["#preset-modal-confirm", "Save", "Подтверждает сохранение нового пресета."],
    ["#preset-modal-cancel", "Cancel", "Закрывает окно без сохранения пресета."],
    ["#save-composition-button", "Save Current", "Сохраняет текущие настройки, активную вкладку и загруженные изображения в историю локально в браузере."],
    ["#clear-session-button", "Clear Auto Save", "Удаляет только автоматическое восстановление после refresh, не трогая историю сохранённых композиций."]
  ];

  const selectOptions = [
    ["#brand-preset", {
      "hero-orbit": "Hero Orbit",
      "split-orbit": "Split Orbit",
      "tunnel-brand": "Tunnel Brand",
      "wall-brand": "Wall Brand",
      "cluster-brand": "Cluster Brand",
      "asymmetric-editorial": "Asymmetric Editorial",
      "runway-brand": "Runway Brand",
      "explosion-focus": "Explosion Focus",
      "minimal-luxury": "Minimal Luxury",
      "data-axis-brand": "Data Axis Brand"
    }],
    ["#brand-main-kind", {
      auto: "Auto",
      image: "Image",
      text: "Text"
    }],
    ["#brand-text-align", {
      left: "Left",
      center: "Center",
      right: "Right"
    }],
    ["#brand-point-color-mode", {
      solid: "Solid",
      gradient: "Gradient",
      random: "Random"
    }],
    ["#brand-transition-style", {
      slide: "Slide",
      dissolve: "Dissolve",
      "zoom-through": "Zoom Through",
      "push-pull-depth": "Push / Pull Depth",
      "orbit-replace": "Orbit Replace",
      "glitch-switch": "Glitch Switch",
      "fade-through-points": "Fade Through Points"
    }],
    ["#brand-transition-easing", {
      "ease-in-out": "Ease In Out",
      linear: "Linear",
      "ease-out": "Ease Out"
    }],
    ["#brand-camera-preset", {
      medium: "Medium",
      "close-up": "Close Up",
      "wide-orbit": "Wide Orbit",
      "low-angle": "Low Angle",
      "top-angle": "Top Angle",
      "editorial-oblique": "Editorial Oblique"
    }],
    ["#brand-output-preset", {
      poster: "Poster",
      "square-post": "Square Post",
      story: "Story",
      "hero-banner": "Hero Banner"
    }],
    ["#brand-mood-preset", {
      luxury: "Luxury",
      chaos: "Chaos",
      tech: "Tech",
      campaign: "Campaign"
    }],
    ["#hand-mode", {
      system: "System Control",
      brand: "Brand Control"
    }]
  ];

  for (const [selector, text, helpText] of simpleText) {
    setSimpleText(selector, text, helpText);
  }

  for (const [selector, text, helpText] of fieldLabels) {
    setFieldLabel(selector, text, helpText);
  }

  for (const [selector, text, helpText] of buttonText) {
    setButtonText(selector, text, helpText);
  }

  for (const [selector, labels] of selectOptions) {
    setOptionTexts(selector, labels);
  }

  setHelpText(document.querySelector("#camera-preset-toggle"), "Быстрые ракурсы для общей камеры сцены.");
  setHelpText(document.querySelector("#render-mode-toggle"), "Выбор визуального режима рендера общей системы.");
  setHelpText(document.querySelector("#background-mode-toggle"), "Переключение между одним фоном и блоковой фоновой композицией.");
  setHelpText(document.querySelector("#interaction-mode-toggle"), "Выбирает интерактивный режим поведения точек и контента.");
  setHelpText(document.querySelector("#step-mode-toggle"), "Независимые step-системы поведения, композиции или взаимодействия.");
}

function updateOutputs() {
  const formatters = {
    "font-size": (value) => `${value}px`,
    tracking: (value) => `${value}px`,
    "line-height": (value) => Number(value).toFixed(2),
    "stroke-width": (value) => `${Number(value).toFixed(1)}px`,
    "point-size": (value) => Number(value).toFixed(2),
    "point-opacity": (value) => Number(value).toFixed(2),
    "glow-intensity": (value) => Number(value).toFixed(2),
    bend: (value) => Number(value).toFixed(2),
    twist: (value) => Number(value).toFixed(2),
    wave: (value) => Number(value).toFixed(2),
    noise: (value) => Number(value).toFixed(2),
    "grid-rows": (value) => value,
    "grid-cols": (value) => value,
    "variation-intensity": (value) => Number(value).toFixed(2),
    "cinematic-expansion-randomness": (value) => Number(value).toFixed(2),
    "cinematic-hover-proximity-strength": (value) => Number(value).toFixed(2),
    "cinematic-depth-speed-tab": (value) => Number(value).toFixed(2),
    "brand-orbit-speed": (value) => Number(value).toFixed(2),
    "brand-orbit-radius": (value) => Number(value).toFixed(2),
    "brand-orbit-randomness": (value) => Number(value).toFixed(2),
    "brand-text-font-size": (value) => `${value}px`,
    "brand-text-line-height": (value) => Number(value).toFixed(2),
    "brand-text-letter-spacing": (value) => `${value}px`,
    "brand-text-opacity": (value) => Number(value).toFixed(2),
    "brand-main-scale": (value) => Number(value).toFixed(2),
    "brand-main-rotate-x": (value) => Number(value).toFixed(2),
    "brand-main-rotate-y": (value) => Number(value).toFixed(2),
    "brand-main-rotate-z": (value) => Number(value).toFixed(2),
    "brand-main-depth": (value) => Number(value).toFixed(2),
    "brand-active-depth-offset": (value) => Number(value).toFixed(2),
    "brand-main-tilt": (value) => Number(value).toFixed(2),
    "brand-hero-skew": (value) => Number(value).toFixed(2),
    "brand-hero-opacity": (value) => Number(value).toFixed(2),
    "brand-hero-dominance": (value) => Number(value).toFixed(2),
    "brand-point-density": (value) => `${Math.round(Number(value) * 100)}%`,
    "brand-point-size": (value) => Number(value).toFixed(2),
    "brand-point-opacity": (value) => Number(value).toFixed(2),
    "brand-orbit-min-scale": (value) => Number(value).toFixed(2),
    "brand-orbit-max-scale": (value) => Number(value).toFixed(2),
    "brand-orbit-distance": (value) => Number(value).toFixed(2),
    "brand-orbit-depth-spread": (value) => Number(value).toFixed(2),
    "brand-number-of-rings": (value) => value,
    "brand-orbit-spacing": (value) => Number(value).toFixed(2),
    "expansion-randomness": (value) => Number(value).toFixed(2),
    "brand-orbit-jitter": (value) => Number(value).toFixed(2),
    "brand-cluster-strength": (value) => Number(value).toFixed(2),
    "brand-attraction-to-hero": (value) => Number(value).toFixed(2),
    "brand-repulsion-from-hero": (value) => Number(value).toFixed(2),
    "brand-secondary-emphasis": (value) => Number(value).toFixed(2),
    "brand-background-suppression": (value) => Number(value).toFixed(2),
    "brand-opacity-falloff-depth": (value) => Number(value).toFixed(2),
    "brand-scale-falloff-distance": (value) => Number(value).toFixed(2),
    "brand-blur-falloff-depth": (value) => Number(value).toFixed(2),
    "brand-transition-duration": (value) => `${Number(value).toFixed(2)}s`,
    "brand-slow-camera-drift": (value) => Number(value).toFixed(2),
    "brand-parallax-strength": (value) => Number(value).toFixed(2),
    "brand-aura-strength": (value) => Number(value).toFixed(2),
    "brand-aura-radius": (value) => Number(value).toFixed(2),
    "brand-aura-opacity": (value) => Number(value).toFixed(2),
    "brand-memory-duration": (value) => `${Number(value).toFixed(2)}s`,
    "brand-memory-opacity": (value) => Number(value).toFixed(2),
    "brand-memory-offset": (value) => Number(value).toFixed(2),
    "brand-weight": (value) => Number(value).toFixed(2),
    "brand-dual-hero-distance": (value) => Number(value).toFixed(2),
    "brand-dual-hero-balance": (value) => Number(value).toFixed(2),
    "hover-proximity-strength": (value) => Number(value).toFixed(2),
    "cinematic-depth-speed": (value) => Number(value).toFixed(2),
    "camera-fov": (value) => `${value}deg`,
    "camera-distance": (value) => Number(value).toFixed(1),
    "animation-duration": (value) => `${Number(value).toFixed(1)}s`,
    "animation-current-time": (value) => `${Number(value).toFixed(2)}s`,
    "animation-flight-intensity": (value) => Number(value).toFixed(2),
    "animation-export-quality": (value) => `${Math.round(Number(value) * 100)}%`,
    "animation-export-fps": (value) => `${Math.round(Number(value))}`,
    "content-density": (value) => `${Math.round(Number(value) * 100)}%`,
    "content-fill-points": (value) => `${Math.round(Number(value) * 100)}%`,
    "content-hover-scale": (value) => `${Math.round(Number(value))}px`,
    "image-ratio": (value) => `${value}%`,
    "text-ratio": (value) => `${value}%`,
    "empty-ratio": (value) => `${value}%`,
    "trail-length": (value) => `${value}`,
    "export-frames": (value) => `${value}`,
    "export-duration": (value) => `${Number(value).toFixed(1)}s`,
    "export-quality": (value) => `${Math.round(Number(value) * 100)}%`,
    "export-fps": (value) => `${value}`,
    "brand-export-frames": (value) => `${value}`,
    "brand-export-duration": (value) => `${Number(value).toFixed(1)}s`,
    "brand-export-quality": (value) => `${Math.round(Number(value) * 100)}%`,
    "brand-export-fps": (value) => `${value}`,
    "cinematic-export-frames": (value) => `${value}`,
    "cinematic-export-duration": (value) => `${Number(value).toFixed(1)}s`,
    "cinematic-export-quality": (value) => `${Math.round(Number(value) * 100)}%`,
    "cinematic-export-fps": (value) => `${value}`,
    "editorial-hero-size": (value) => `${value}px`,
    "editorial-hero-tracking": (value) => `${value}px`,
    "editorial-hero-line-height": (value) => Number(value).toFixed(2),
    "editorial-hero-opacity": (value) => Number(value).toFixed(2),
    "editorial-hero-x": (value) => Number(value).toFixed(2),
    "editorial-hero-y": (value) => Number(value).toFixed(2),
    "editorial-hero-z": (value) => Number(value).toFixed(2),
    "editorial-hero-max-width": (value) => Number(value).toFixed(2),
    "editorial-hero-bg-opacity": (value) => Number(value).toFixed(2),
    "editorial-hero-padding-x": (value) => `${value}px`,
    "editorial-hero-padding-y": (value) => `${value}px`,
    "editorial-hero-mask-width": (value) => Number(value).toFixed(2),
    "editorial-hero-mask-height": (value) => Number(value).toFixed(2),
    "editorial-hero-mask-x": (value) => Number(value).toFixed(2),
    "editorial-hero-mask-y": (value) => Number(value).toFixed(2),
    "editorial-optical-size-bias": (value) => Number(value).toFixed(2),
    "editorial-hero-contrast": (value) => Number(value).toFixed(2),
    "editorial-micro-contrast": (value) => Number(value).toFixed(2),
    "editorial-whitespace-balance": (value) => Number(value).toFixed(2),
    "editorial-text-density": (value) => Number(value).toFixed(2),
    "editorial-grid-snap": (value) => Number(value).toFixed(2),
    "editorial-grid-margin": (value) => Number(value).toFixed(2),
    "editorial-grid-gutter": (value) => Number(value).toFixed(2),
    "editorial-image-scale-bias": (value) => Number(value).toFixed(2),
    "editorial-animation-speed": (value) => Number(value).toFixed(2),
    "editorial-animation-intensity": (value) => Number(value).toFixed(2),
    "editorial-labels-size": (value) => `${value}px`,
    "editorial-labels-tracking": (value) => `${value}px`,
    "editorial-labels-spacing": (value) => Number(value).toFixed(2),
    "editorial-labels-z": (value) => Number(value).toFixed(2),
    "editorial-info-width": (value) => Number(value).toFixed(2),
    "editorial-info-height": (value) => Number(value).toFixed(2),
    "editorial-info-font-size": (value) => `${value}px`,
    "editorial-info-tracking": (value) => `${value}px`,
    "editorial-info-line-height": (value) => Number(value).toFixed(2),
    "editorial-info-padding": (value) => `${value}px`,
    "editorial-info-x": (value) => Number(value).toFixed(2),
    "editorial-info-y": (value) => Number(value).toFixed(2),
    "editorial-info-z": (value) => Number(value).toFixed(2),
    "editorial-secondary-size": (value) => `${value}px`,
    "editorial-secondary-tracking": (value) => `${value}px`,
    "editorial-secondary-line-height": (value) => Number(value).toFixed(2),
    "editorial-secondary-opacity": (value) => Number(value).toFixed(2),
    "editorial-secondary-x": (value) => Number(value).toFixed(2),
    "editorial-secondary-y": (value) => Number(value).toFixed(2),
    "editorial-secondary-z": (value) => Number(value).toFixed(2),
    "editorial-media-opacity": (value) => Number(value).toFixed(2),
    "editorial-media-scale": (value) => Number(value).toFixed(2),
    "editorial-label-box-size": (value) => `${value}px`,
    "editorial-label-tracking": (value) => `${value}px`,
    "editorial-label-line-height": (value) => Number(value).toFixed(2),
    "editorial-label-box-opacity": (value) => Number(value).toFixed(2),
    "editorial-label-z": (value) => Number(value).toFixed(2),
    "editorial-overlap-text-opacity": (value) => Number(value).toFixed(2),
    "editorial-overlap-image-opacity": (value) => Number(value).toFixed(2),
    "editorial-overlap-brightness": (value) => Number(value).toFixed(2),
    "editorial-overlap-priority": (value) => Number(value).toFixed(2),
    "editorial-outline-thickness": (value) => Number(value).toFixed(1),
    "editorial-shadow-opacity": (value) => Number(value).toFixed(2),
    "editorial-duplicate-offset-x": (value) => `${value}px`,
    "editorial-duplicate-offset-y": (value) => `${value}px`,
    "letter-move-x": (value) => Number(value).toFixed(2),
    "letter-move-y": (value) => Number(value).toFixed(2),
    "letter-move-z": (value) => Number(value).toFixed(2),
    "letter-scale-x": (value) => Number(value).toFixed(2),
    "letter-scale-y": (value) => Number(value).toFixed(2),
    "letter-scale-z": (value) => Number(value).toFixed(2),
    "letter-bend-x": (value) => Number(value).toFixed(2),
    "letter-bend-y": (value) => Number(value).toFixed(2),
    "letter-bend-z": (value) => Number(value).toFixed(2),
    "letter-twist-x": (value) => Number(value).toFixed(2),
    "letter-twist-y": (value) => Number(value).toFixed(2),
    "letter-twist-z": (value) => Number(value).toFixed(2),
    "letter-noise": (value) => Number(value).toFixed(2)
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
  const effectivePanelTab = selectedPanelTab === "animation" ? animationSourceTab : selectedPanelTab;
  state.strokeWidth = Number(elements.controls.strokeWidth.value);
  state.pointAppearance.size = Number(elements.controls.pointSize.value);
  state.pointAppearance.opacity = Number(elements.controls.pointOpacity.value);
  state.pointAppearance.colorMode = elements.controls.pointColorMode.value;
  state.pointAppearance.colorA = elements.controls.pointColorA.value;
  state.pointAppearance.colorB = elements.controls.pointColorB.value;
  state.backgroundColor = elements.controls.backgroundColor.value;
  state.transparentBackground = elements.controls.transparentBackground.checked;
  state.glow.enabled = elements.controls.glowEnabled.checked;
  state.glow.basePointsOnly = Boolean(elements.controls.glowBasePointsOnly?.checked ?? true);
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
  state.expansionRandomness = Number(elements.controls.expansionRandomness.value);
  state.axisStep.enabled = elements.controls.axisStepEnabled.checked;
  state.axisStep.guides = elements.controls.axisGuidesEnabled.checked;
  state.camera.fov = Number(elements.controls.cameraFov.value);
  state.camera.distance = Number(elements.controls.cameraDistance.value);
  state.animation.preset = elements.controls.animationPreset.value;
  state.content.density = Number(elements.controls.contentDensity.value);
  state.content.fillPoints = Number(elements.controls.contentFillPoints?.value || 0);
  state.content.hoverScale = Number(elements.controls.contentHoverScale?.value || 220);
  state.content.textFontFamily = elements.controls.pointTextFont?.value || "Space Grotesk";
  state.content.textUppercase = Boolean(elements.controls.pointTextUppercase?.checked ?? true);
  state.content.textBackground = Boolean(elements.controls.pointTextBackground?.checked ?? true);
  state.content.textColor = elements.controls.pointTextColor?.value || "#050505";
  state.content.textBackgroundColor = elements.controls.pointTextBackgroundColor?.value || "#ffffff";
  state.content.imageRatio = Number(elements.controls.imageRatio.value);
  state.content.textRatio = Number(elements.controls.textRatio.value);
  state.content.emptyRatio = Number(elements.controls.emptyRatio.value);
  state.content.layoutMode = elements.controls.contentLayoutMode.value;
  state.content.onlyMode = elements.controls.contentOnlyMode.checked;
  state.content.onlyType = elements.controls.contentOnlyType.value;
  state.stepSettings.filterKind = elements.controls.filterKind.value;
  state.stepSettings.boundaryShape = elements.controls.boundaryShape.value;
  state.stepSettings.fieldShape = elements.controls.fieldShape.value;
  state.stepSettings.trailLength = Number(elements.controls.trailLength.value);
  state.stepSettings.mediaSpacePreset = elements.controls.mediaSpacePreset.value;
  state.stepSettings.hoverProximityStrength = Number(elements.controls.hoverProximityStrength.value);
  state.stepSettings.cinematicDepthSpeed = Number(elements.controls.cinematicDepthSpeed.value);
  state.stepSettings.cinematicDirection = elements.controls.cinematicDirection.value;
  state.export.ratio = elements.controls.exportRatio.value;
  state.export.size = Number(elements.controls.exportSize.value);
  state.export.frames = Number(elements.controls.exportFrames.value);
  state.export.duration = Number(elements.controls.exportDuration.value);
  state.export.quality = Number(elements.controls.exportQuality.value);
  state.export.fps = Number(elements.controls.exportFps.value);
  state.content.texts = elements.controls.pointTextInput.value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  state.cinematic.layoutPreset = elements.cinematic.layoutPreset?.value || "depth-field";
  state.cinematic.showPoints = Boolean(elements.cinematic.showPoints?.checked);
  state.cinematic.expansionRandomness = Number(elements.cinematic.expansionRandomness?.value || 0.35);
  state.cinematic.hoverProximityStrength = Number(elements.cinematic.hoverProximityStrength?.value || 0.9);
  state.cinematic.depthSpeed = Number(elements.cinematic.depthSpeed?.value || 0.6);
  state.cinematic.direction = elements.cinematic.direction?.value || "forward";
  state.cinematic.enabled = effectivePanelTab === "cinematic";
  state.brand.preset = elements.brand.preset?.value || "hero-orbit";
  state.brand.mainKind = elements.brand.mainKind?.value || "auto";
  state.brand.mainText = elements.brand.mainText?.value || "";
  state.brand.orbitTexts = elements.brand.orbitTexts?.value
    ? elements.brand.orbitTexts.value.split(/[,\n]+/).map((item) => item.trim().toUpperCase()).filter(Boolean)
    : [];
  state.brand.titleText = elements.brand.titleText?.value || "";
  state.brand.subtitleText = elements.brand.subtitleText?.value || "";
  state.brand.tagText = elements.brand.tagText?.value || "";
  state.brand.backgroundWord = elements.brand.backgroundWord?.value || "";
  state.brand.textFontSize = Number(elements.brand.textFontSize?.value || 108);
  state.brand.textAlign = elements.brand.textAlign?.value || "center";
  state.brand.textColor = elements.brand.textColor?.value || "#f5f2ed";
  state.brand.textLineHeight = Number(elements.brand.textLineHeight?.value || 0.92);
  state.brand.textLetterSpacing = Number(elements.brand.textLetterSpacing?.value || 4);
  state.brand.textOpacity = Number(elements.brand.textOpacity?.value || 0.92);
  state.brand.mainScale = Number(elements.brand.mainScale?.value || 0);
  state.brand.mainRotateX = Number(elements.brand.mainRotateX?.value || 0);
  state.brand.mainRotateY = Number(elements.brand.mainRotateY?.value || 0);
  state.brand.mainRotateZ = Number(elements.brand.mainRotateZ?.value || 0);
  state.brand.mainDepth = Number(elements.brand.mainDepth?.value || 0);
  state.brand.activeDepthOffset = Number(elements.brand.activeDepthOffset?.value || 0.35);
  state.brand.mainTilt = Number(elements.brand.mainTilt?.value || 0);
  state.brand.heroSkew = Number(elements.brand.heroSkew?.value || 0);
  state.brand.heroOpacity = Number(elements.brand.heroOpacity?.value || 1);
  state.brand.heroDominance = Number(elements.brand.heroDominance?.value || 2.1);
  state.brand.showPoints = Boolean(elements.brand.showPoints?.checked ?? true);
  state.brand.showImages = Boolean(elements.brand.showImages?.checked ?? true);
  state.brand.showText = Boolean(elements.brand.showText?.checked ?? true);
  state.brand.pointDensity = Number(elements.brand.pointDensity?.value || 1);
  state.brand.pointSize = Number(elements.brand.pointSize?.value || 1);
  state.brand.pointOpacity = Number(elements.brand.pointOpacity?.value || 0.18);
  state.brand.pointColorMode = elements.brand.pointColorMode?.value || "solid";
  state.brand.pointColorA = elements.brand.pointColorA?.value || "#ffffff";
  state.brand.pointColorB = elements.brand.pointColorB?.value || "#d9d9d9";
  state.brand.orbitSpeed = Number(elements.brand.orbitSpeed?.value || 0.62);
  state.brand.orbitRadius = Number(elements.brand.orbitRadius?.value || 1.9);
  state.brand.numberOfRings = Number(elements.brand.numberOfRings?.value || 2);
  state.brand.orbitSpacing = Number(elements.brand.orbitSpacing?.value || 0.38);
  state.brand.orbitRandomness = Number(elements.brand.orbitRandomness?.value || 0.28);
  state.brand.orbitJitter = Number(elements.brand.orbitJitter?.value || 0.12);
  state.brand.orbitMinScale = Number(elements.brand.orbitMinScale?.value || 0.82);
  state.brand.orbitMaxScale = Number(elements.brand.orbitMaxScale?.value || 1.08);
  state.brand.orbitDistance = Number(elements.brand.orbitDistance?.value || 1.9);
  state.brand.orbitDepthSpread = Number(elements.brand.orbitDepthSpread?.value || 1.6);
  state.brand.clusterStrength = Number(elements.brand.clusterStrength?.value || 0.4);
  state.brand.attractionToHero = Number(elements.brand.attractionToHero?.value || 0.65);
  state.brand.repulsionFromHero = Number(elements.brand.repulsionFromHero?.value || 0.22);
  state.brand.orbitRandomRotation = Boolean(elements.brand.orbitRandomRotation?.checked);
  state.brand.secondaryEmphasis = Number(elements.brand.secondaryEmphasis?.value || 0.9);
  state.brand.backgroundSuppression = Number(elements.brand.backgroundSuppression?.value || 0.28);
  state.brand.opacityFalloffByDepth = Number(elements.brand.opacityFalloffDepth?.value || 0.3);
  state.brand.scaleFalloffByDistance = Number(elements.brand.scaleFalloffDistance?.value || 0.22);
  state.brand.blurFalloffByDepth = Number(elements.brand.blurFalloffDepth?.value || 0);
  state.brand.transitionStyle = elements.brand.transitionStyle?.value || "slide";
  state.brand.transitionDuration = Number(elements.brand.transitionDuration?.value || 0.9);
  state.brand.transitionEasing = elements.brand.transitionEasing?.value || "ease-in-out";
  state.brand.cameraPreset = elements.brand.cameraPreset?.value || "medium";
  state.brand.slowCameraDrift = Number(elements.brand.slowCameraDrift?.value || 0.18);
  state.brand.parallaxStrength = Number(elements.brand.parallaxStrength?.value || 0.35);
  state.brand.outputPreset = elements.brand.outputPreset?.value || "poster";
  state.brand.glowEnabled = Boolean(elements.brand.glowEnabled?.checked ?? true);
  state.brand.moodPreset = elements.brand.moodPreset?.value || "luxury";
  state.brand.auraStrength = Number(elements.brand.auraStrength?.value || 0.65);
  state.brand.auraRadius = Number(elements.brand.auraRadius?.value || 1.15);
  state.brand.auraOpacity = Number(elements.brand.auraOpacity?.value || 0.42);
  state.brand.memoryDuration = Number(elements.brand.memoryDuration?.value || 0.9);
  state.brand.memoryOpacity = Number(elements.brand.memoryOpacity?.value || 0.32);
  state.brand.memoryOffset = Number(elements.brand.memoryOffset?.value || 0.42);
  state.brand.brandWeight = Number(elements.brand.brandWeight?.value || 1);
  state.brand.dualHeroEnabled = Boolean(elements.brand.dualHeroEnabled?.checked);
  state.brand.dualHeroDistance = Number(elements.brand.dualHeroDistance?.value || 1.5);
  state.brand.dualHeroBalance = Number(elements.brand.dualHeroBalance?.value || 0.5);
  state.brand.enabled = effectivePanelTab === "brand"
    || (effectivePanelTab === "editorial" && state.editorial.context === "brand");
  state.editorial.context = getActiveToggleValue(elements.editorial.contextToggle, "editorialContext", state.editorial.context || "standalone");
  state.editorial.glowEnabled = Boolean(elements.editorial.glowEnabled?.checked ?? true);
  state.editorial.layoutPreset = elements.editorial.layoutPreset?.value || "hero-center";
  state.editorial.templatePreset = elements.editorial.templatePreset?.value || "luxury-campaign";
  state.editorial.heroText = elements.editorial.heroText?.value || "";
  state.editorial.heroTexts = parseEditorialBlocks(state.editorial.heroText, state.editorial.heroText ? [state.editorial.heroText] : []);
  state.editorial.heroFontFamily = elements.editorial.heroFont?.value || "Cormorant Garamond";
  state.editorial.heroFontSize = Number(elements.editorial.heroSize?.value || 280);
  state.editorial.heroTracking = Number(elements.editorial.heroTracking?.value || -6);
  state.editorial.heroLineHeight = Number(elements.editorial.heroLineHeight?.value || 0.9);
  state.editorial.heroOpacity = Number(elements.editorial.heroOpacity?.value || 1);
  state.editorial.heroColor = elements.editorial.heroColor?.value || "#ffffff";
  state.editorial.heroLayer = elements.editorial.heroLayer?.value || "front";
  state.editorial.heroX = Number(elements.editorial.heroX?.value || 0);
  state.editorial.heroY = Number(elements.editorial.heroY?.value || 0);
  state.editorial.heroZ = Number(elements.editorial.heroZ?.value || 0.32);
  state.editorial.heroMaxWidth = Number(elements.editorial.heroMaxWidth?.value || 4.4);
  state.editorial.heroBackground = Boolean(elements.editorial.heroBackground?.checked);
  state.editorial.heroBackgroundOpacity = Number(elements.editorial.heroBackgroundOpacity?.value || 0.2);
  state.editorial.heroBackgroundColor = elements.editorial.heroBackgroundColor?.value || "#000000";
  state.editorial.heroPaddingX = Number(elements.editorial.heroPaddingX?.value || 40);
  state.editorial.heroPaddingY = Number(elements.editorial.heroPaddingY?.value || 26);
  state.editorial.heroMaskEnabled = Boolean(elements.editorial.heroMaskEnabled?.checked);
  state.editorial.heroMaskType = elements.editorial.heroMaskType?.value || "rectangle";
  state.editorial.heroMaskWidth = Number(elements.editorial.heroMaskWidth?.value || 0.72);
  state.editorial.heroMaskHeight = Number(elements.editorial.heroMaskHeight?.value || 0.38);
  state.editorial.heroMaskX = Number(elements.editorial.heroMaskX?.value || 0);
  state.editorial.heroMaskY = Number(elements.editorial.heroMaskY?.value || 0);
  state.editorial.opticalSizeBias = Number(elements.editorial.opticalSizeBias?.value || 0);
  state.editorial.heroContrast = Number(elements.editorial.heroContrast?.value || 1);
  state.editorial.microContrast = Number(elements.editorial.microContrast?.value || 1);
  state.editorial.whitespaceBalance = Number(elements.editorial.whitespaceBalance?.value || 0.7);
  state.editorial.textDensity = Number(elements.editorial.textDensity?.value || 1);
  state.editorial.gridPreset = elements.editorial.gridPreset?.value || "2-column";
  state.editorial.gridSnap = Number(elements.editorial.gridSnap?.value || 0);
  state.editorial.gridMargin = Number(elements.editorial.gridMargin?.value || 0.14);
  state.editorial.gridGutter = Number(elements.editorial.gridGutter?.value || 0.08);
  state.editorial.frameLogic = elements.editorial.frameLogic?.value || "under-hero";
  state.editorial.imageFollowHero = Boolean(elements.editorial.imageFollowHero?.checked ?? true);
  state.editorial.imageScaleBias = Number(elements.editorial.imageScaleBias?.value || 1);
  state.editorial.animationPreset = elements.editorial.animationPreset?.value || "none";
  state.editorial.animationSpeed = Number(elements.editorial.animationSpeed?.value || 0.4);
  state.editorial.animationIntensity = Number(elements.editorial.animationIntensity?.value || 0.35);
  state.editorial.labelsText = elements.editorial.labelsText?.value
    ? elements.editorial.labelsText.value.split(/[,\n]+/).map((item) => item.trim()).filter(Boolean)
    : [];
  state.editorial.labelsSize = Number(elements.editorial.labelsSize?.value || 24);
  state.editorial.labelsTracking = Number(elements.editorial.labelsTracking?.value || 14);
  state.editorial.labelsSpacing = Number(elements.editorial.labelsSpacing?.value || 0.75);
  state.editorial.labelsAlign = elements.editorial.labelsAlign?.value || "spread";
  state.editorial.labelsZ = Number(elements.editorial.labelsZ?.value || 0);
  state.editorial.labelsLayer = elements.editorial.labelsLayer?.value || "front";
  state.editorial.textFontFamily = elements.editorial.textFont?.value || "Cormorant Garamond";
  state.editorial.metadataFontFamily = elements.editorial.metadataFont?.value || "IBM Plex Mono";
  state.editorial.labelFontFamily = elements.editorial.labelFont?.value || "Space Grotesk";
  state.editorial.infoText = elements.editorial.infoText?.value || "";
  state.editorial.infoTexts = parseEditorialBlocks(state.editorial.infoText, state.editorial.infoText ? [state.editorial.infoText] : []);
  state.editorial.infoBlockSettings = normalizeEditorialInfoBlockSettings(
    state.editorial,
    state.editorial.infoTexts.length
  );
  state.editorial.infoFontSize = Number(elements.editorial.infoFontSize?.value || 38);
  state.editorial.infoTracking = Number(elements.editorial.infoTracking?.value || 0);
  state.editorial.infoLineHeight = Number(elements.editorial.infoLineHeight?.value || 1);
  state.editorial.infoWidth = Number(elements.editorial.infoWidth?.value || 1.9);
  state.editorial.infoHeight = Number(elements.editorial.infoHeight?.value || 0.92);
  state.editorial.infoPadding = Number(elements.editorial.infoPadding?.value || 30);
  state.editorial.infoAlign = elements.editorial.infoAlign?.value || "left";
  state.editorial.infoX = Number(elements.editorial.infoX?.value || 1.25);
  state.editorial.infoY = Number(elements.editorial.infoY?.value || -0.52);
  state.editorial.infoZ = Number(elements.editorial.infoZ?.value || 0.42);
  state.editorial.infoLayer = elements.editorial.infoLayer?.value || "front";
  state.editorial.infoBorder = Boolean(elements.editorial.infoBorder?.checked ?? true);
  state.editorial.secondaryText = elements.editorial.secondaryText?.value || "";
  state.editorial.secondaryTexts = parseEditorialBlocks(state.editorial.secondaryText, state.editorial.secondaryText ? [state.editorial.secondaryText] : []);
  state.editorial.secondarySize = Number(elements.editorial.secondarySize?.value || 26);
  state.editorial.secondaryTracking = Number(elements.editorial.secondaryTracking?.value || 4);
  state.editorial.secondaryLineHeight = Number(elements.editorial.secondaryLineHeight?.value || 1);
  state.editorial.secondaryOpacity = Number(elements.editorial.secondaryOpacity?.value || 0.86);
  state.editorial.secondaryX = Number(elements.editorial.secondaryX?.value || 1.25);
  state.editorial.secondaryY = Number(elements.editorial.secondaryY?.value || -1.2);
  state.editorial.secondaryZ = Number(elements.editorial.secondaryZ?.value || 0.46);
  state.editorial.secondaryLayer = elements.editorial.secondaryLayer?.value || "front";
  state.editorial.showGuides = Boolean(elements.editorial.showGuides?.checked);
  state.editorial.mediaOpacity = Number(elements.editorial.mediaOpacity?.value || 0.92);
  state.editorial.mediaScale = Number(elements.editorial.mediaScale?.value || 1);
  state.editorial.labelTexts = parseEditorialBlocks(elements.editorial.labelBoxes?.value || "", []);
  state.editorial.labelStyle = elements.editorial.labelStyle?.value || "outline";
  state.editorial.labelBoxSize = Number(elements.editorial.labelBoxSize?.value || 24);
  state.editorial.labelTracking = Number(elements.editorial.labelTracking?.value || 2);
  state.editorial.labelLineHeight = Number(elements.editorial.labelLineHeight?.value || 1);
  state.editorial.labelBoxOpacity = Number(elements.editorial.labelBoxOpacity?.value || 1);
  state.editorial.labelZ = Number(elements.editorial.labelZ?.value || 0.28);
  state.editorial.labelLayer = elements.editorial.labelLayer?.value || "front";
  state.editorial.overlapTextOpacity = Number(elements.editorial.overlapTextOpacity?.value || 0.72);
  state.editorial.overlapImageOpacity = Number(elements.editorial.overlapImageOpacity?.value || 0.82);
  state.editorial.overlapBrightness = Number(elements.editorial.overlapBrightness?.value || -0.1);
  state.editorial.overlapPriority = Number(elements.editorial.overlapPriority?.value || 0.7);
  state.editorial.heroStyle = elements.editorial.heroStyle?.value || "fill";
  state.editorial.textStyle = elements.editorial.textStyle?.value || "fill";
  state.editorial.outlineThickness = Number(elements.editorial.outlineThickness?.value || 2);
  state.editorial.shadowOpacity = Number(elements.editorial.shadowOpacity?.value || 0.2);
  state.editorial.duplicateOffsetX = Number(elements.editorial.duplicateOffsetX?.value || 16);
  state.editorial.duplicateOffsetY = Number(elements.editorial.duplicateOffsetY?.value || 10);
  state.editorial.brandOrbitTexts = parseEditorialBlocks(elements.editorial.brandOrbitTexts?.value || "", []);
  state.editorial.offsets = normalizeEditorialOffsets(state.editorial.offsets);
  state.editorial.backdropOffset = normalizeEditorialBackdropOffset(state.editorial.backdropOffset);
  state.editorial.enabled = effectivePanelTab === "editorial";
  if (elements.systemEditorial.enabled) {
    state.systemEditorialOverlay = {
      ...(state.systemEditorialOverlay || {}),
      enabled: elements.systemEditorial.enabled.checked
    };
  }
  state.handMode = elements.hand.mode?.value || "system";
}

function applyState(options = {}) {
  updateVisualState();
  syncSystemEditorialStatus();
  syncAutoMotionToggle();

  if (options.persist !== false) {
    scheduleSessionPersist();
  }

  if (!studio) {
    return;
  }

  studio.applyConfig(state, options);
}

async function rebuildTypography() {
  if (!studio) {
    return;
  }

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
    scheduleSessionPersist();
  }, 120);
}

async function runExport(type, sourceTab = selectedPanelTab) {
  if (!studio) {
    setStatus("Scene is still loading.");
    return;
  }

  if ((type === "gif" || type === "mp4") && sourceTab !== "system" && sourceTab !== "cinematic" && sourceTab !== "hand" && sourceTab !== "brand" && sourceTab !== "editorial" && sourceTab !== "animation") {
    setStatus("Open the System, Cinematic, Brand Mode, Editorial, Animation, or Hand Control tab to export GIF or MP4.");
    return;
  }

  if (sourceTab === "cinematic" && !state.cinematic.enabled) {
    selectedPanelTab = "cinematic";
    state.cinematic.enabled = true;
    studio.setCinematicMode?.(true);
    applyState();
  } else if (sourceTab === "brand" && !state.brand.enabled) {
    selectedPanelTab = "brand";
    state.brand.enabled = true;
    studio.setBrandMode?.(state.brand);
    applyState();
  } else if (sourceTab === "editorial" && !state.editorial.enabled) {
    selectedPanelTab = "editorial";
    state.editorial.enabled = true;
    studio.setEditorialMode?.(state.editorial);
    applyState();
  } else if (sourceTab === "hand") {
    selectedPanelTab = "hand";
  } else if (sourceTab === "animation") {
    selectedPanelTab = "animation";
    updateVisualState();
    applyState();
  }

  const fileStem = (state.typography.text.trim() || "scanner-type")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase();

  setStatus(`Preparing ${type.toUpperCase()}...`);

  try {
    const exporters = await import(EXPORTERS_MODULE_PATH);
    const exportOptions = {
      ratio: state.export.ratio,
      size: state.export.size,
      frames: state.export.frames,
      duration: sourceTab === "animation" ? getAnimationPlaybackBounds().spanSeconds : state.export.duration,
      quality: state.export.quality,
      fps: state.export.fps,
      transparentBackground: state.transparentBackground
    };

    if (sourceTab === "animation" && (type === "gif" || type === "mp4")) {
      if (!startAnimationPlayback({ reset: true, loop: false, forExport: true })) {
        return;
      }
    }

    if (type === "png") {
      await exporters.exportPNG(studio, `${fileStem}.png`, exportOptions);
    } else if (type === "jpg") {
      await exporters.exportJPG(studio, `${fileStem}.jpg`, exportOptions);
    } else if (type === "gif") {
      await exporters.exportGif(studio, `${fileStem}.gif`, setStatus, exportOptions);
    } else if (type === "mp4") {
      const exportVideo = exporters.exportMP4 || exporters.exportVideo;

      if (typeof exportVideo !== "function") {
        throw new Error("MP4 export module did not load correctly. Refresh the page and try again.");
      }

      await exportVideo(studio, `${fileStem}.mp4`, setStatus, exportOptions);
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
  } finally {
    if (sourceTab === "animation" && (type === "gif" || type === "mp4")) {
      stopAnimationPlayback();
    }
  }
}

function cancelActiveExport(reason = "Recording stopped.") {
  void import(EXPORTERS_MODULE_PATH).then((exporters) => {
    exporters.cancelActiveRecording?.(reason);
  });
}

async function refreshEditorialBackdrop() {
  if (!studio) {
    return;
  }
  studio.clearEditorialBackdrop?.();
}

function setActiveToggle(group, datasetKey, value) {
  for (const button of group.querySelectorAll("button")) {
    button.classList.toggle("is-active", button.dataset[datasetKey] === value);
  }
}

async function activateHandControlTab() {
  if (!studio || !handControl) {
    return;
  }

  previousStepModeBeforeHand = state.stepMode;
  handVariationBaseIntensity = Number(elements.controls.variationIntensity.value);
  state.stepMode = "none";
  setActiveToggle(elements.stepModeToggle, "stepMode", state.stepMode);
  studio.setStepMode(state.stepMode);
  studio.setHandControlEnabled(true);

  try {
    await handControl.start();

    if (selectedPanelTab !== "hand") {
      deactivateHandControlTab();
    }
  } catch (error) {
    console.error(error);
    studio.setHandControlEnabled(false);
    studio.setHandControlState({
      enabled: false,
      pinch: 0,
      rotationX: 0,
      rotationY: 0,
      handsDetected: 0,
      brandNextPulse: 0
    });
    setHandStatus(error.message || "Unable to start hand control.");
    setStatus(error.message || "Unable to start hand control.");
  }
}

function deactivateHandControlTab(nextTab = "system") {
  cancelActiveExport("Recording stopped because Hand Control was closed.");
  handControl?.stop();
  studio?.setHandControlEnabled(false);
  studio?.setHandControlState({
    enabled: false,
    pinch: 0,
    rotationX: 0,
    rotationY: 0,
    handsDetected: 0,
    variationIntensity: handVariationBaseIntensity,
    baseVariationIntensity: handVariationBaseIntensity,
    mode: state.handMode,
    brandVariation: 0,
    brandSwitchX: 0,
    brandNextPulse: 0
  });
  elements.controls.variationIntensity.value = String(handVariationBaseIntensity);
  state.variation.intensity = handVariationBaseIntensity;
  updateOutputs();

  if (nextTab !== "deform") {
    state.stepMode = previousStepModeBeforeHand;
    setActiveToggle(elements.stepModeToggle, "stepMode", state.stepMode);
    studio?.setStepMode(state.stepMode);
  }
}

function activateBrandTab() {
  state.brand.enabled = true;
  studio?.setBrandMode?.(state.brand);
  applyState();
}

function deactivateBrandTab(nextTab = "system") {
  cancelActiveExport("Recording stopped because Brand Mode was closed.");
  selectedPanelTab = nextTab;
  state.brand.enabled = false;
  studio?.setBrandMode?.(false);
  applyState();
}

function activateEditorialTab() {
  state.editorial.enabled = true;
  state.brand.enabled = state.editorial.context === "brand";
  if (elements.editorial.contextToggle) {
    setActiveToggle(elements.editorial.contextToggle, "editorialContext", state.editorial.context || "standalone");
  }
  studio?.clearEditorialBackdrop?.();
  studio?.setEditorialMode?.(state.editorial);
  applyState();
}

function deactivateEditorialTab(nextTab = "system") {
  cancelActiveExport("Recording stopped because Editorial mode was closed.");
  selectedPanelTab = nextTab;
  state.editorial.enabled = false;
  studio?.setEditorialMode?.(false);
  studio?.clearEditorialBackdrop?.();
  applyState();
}

function loadSystemEditorialIntoEditor({ switchTab = false } = {}) {
  const overlay = state.systemEditorialOverlay || {};

  if (!overlay.heroText) {
    setStatus("No saved System overlay to load.");
    return;
  }

  state.editorial = {
    ...state.editorial,
    ...cloneSerializable(overlay),
    enabled: false,
    context: "system",
    offsets: normalizeEditorialOffsets(overlay.offsets),
    backdropOffset: normalizeEditorialBackdropOffset(overlay.backdropOffset)
  };

  syncControlsFromStateSnapshot(state);
  updateOutputs();
  syncSystemEditorialStatus();

  if (switchTab) {
    setPanelTab("editorial");
  } else {
    scheduleSessionPersist();
  }

  setStatus("System overlay loaded into Editorial.");
}

function activateCinematicTab() {
  previousStepModeBeforeCinematic = state.stepMode;
  state.stepMode = "none";
  setActiveToggle(elements.stepModeToggle, "stepMode", state.stepMode);
  studio?.setStepMode?.(state.stepMode);
  state.cinematic.enabled = true;
  studio?.setCinematicMode?.(true);
  applyState();
}

function deactivateCinematicTab(nextTab = "system") {
  cancelActiveExport("Recording stopped because Cinematic mode was closed.");
  selectedPanelTab = nextTab;
  state.cinematic.enabled = false;
  studio?.setCinematicMode?.(false);
  state.stepMode = nextTab !== "deform" && previousStepModeBeforeCinematic !== "direct-manipulation"
    ? previousStepModeBeforeCinematic
    : "none";
  setActiveToggle(elements.stepModeToggle, "stepMode", state.stepMode);
  studio?.setStepMode?.(state.stepMode);
  applyState();
}

function activateAnimationTab() {
  state.animationWorkbench.enabled = true;
  syncAnimationTimelineRange();
  syncAnimationAdvancedUi();
  renderAnimationKeyframeList();
  setStatus("Animation ready. Move the preview, save a keyframe, then add the next one.");
}

function deactivateAnimationTab() {
  state.animationWorkbench.enabled = false;
  stopAnimationPlayback();
}

function setPanelTab(tab) {
  const currentEffectiveTab = selectedPanelTab === "animation" ? animationSourceTab : selectedPanelTab;
  const keepHandActiveForBrand = currentEffectiveTab === "hand"
    && tab === "brand"
    && (elements.hand.mode?.value || "system") === "brand";

  if (currentEffectiveTab === "hand" && tab !== "hand" && !keepHandActiveForBrand) {
    deactivateHandControlTab(tab);
  }

  if (currentEffectiveTab === "editorial" && tab !== "editorial" && tab !== "animation") {
    deactivateEditorialTab(tab);
  }

  if (currentEffectiveTab === "brand" && tab !== "brand" && tab !== "animation") {
    deactivateBrandTab(tab);

    if (tab !== "hand" && studio?.handControl?.enabled) {
      deactivateHandControlTab(tab);
    }
  }

  if (currentEffectiveTab === "cinematic" && tab !== "cinematic" && tab !== "animation") {
    deactivateCinematicTab(tab);
  }

  if (selectedPanelTab === "animation" && tab !== "animation") {
    deactivateAnimationTab();
  }

  if (tab === "animation") {
    animationSourceTab = currentEffectiveTab === "presets" ? animationSourceTab : currentEffectiveTab;
  }

  selectedPanelTab = tab;

  for (const button of elements.panelTabToggle.querySelectorAll("button")) {
    button.classList.toggle("is-active", button.dataset.panelTab === tab);
  }

  for (const pane of elements.panelPanes) {
    pane.classList.toggle("is-active", pane.dataset.panelPane === tab);
  }

  if (tab === "deform" && studio) {
    state.stepMode = "direct-manipulation";
    setActiveToggle(elements.stepModeToggle, "stepMode", state.stepMode);
    studio.setStepMode(state.stepMode);
    applyState();
    return;
  }

  if (tab === "hand") {
    void activateHandControlTab();
    return;
  }

  if (tab === "brand") {
    activateBrandTab();
    return;
  }

  if (tab === "editorial") {
    if (currentEffectiveTab === "system") {
      state.editorial.context = "system";
    } else if (currentEffectiveTab === "brand") {
      state.editorial.context = "brand";
    }

    if (elements.editorial.contextToggle) {
      setActiveToggle(elements.editorial.contextToggle, "editorialContext", state.editorial.context || "standalone");
    }

    activateEditorialTab();
    return;
  }

  if (tab === "cinematic") {
    activateCinematicTab();
    return;
  }

  if (tab === "animation") {
    activateAnimationTab();
    return;
  }

  if (tab === "presets") {
    renderPresetLibrary();
  }

  applyState();
}

function syncLetterPanel() {
  if (!studio) {
    elements.deform.status.textContent = "Scene is still loading.";
    return;
  }

  const selection = studio.getSelectedLetterState?.();

  isSyncingLetterPanel = true;

  if (!selection) {
    elements.deform.status.textContent = "No letter selected. Click a letter in the viewport, then deform it here.";
    elements.deform.moveX.value = "0";
    elements.deform.moveY.value = "0";
    elements.deform.moveZ.value = "0";
    elements.deform.scaleX.value = "1";
    elements.deform.scaleY.value = "1";
    elements.deform.scaleZ.value = "1";
    elements.deform.bendX.value = "0";
    elements.deform.bendY.value = "0";
    elements.deform.bendZ.value = "0";
    elements.deform.twistX.value = "0";
    elements.deform.twistY.value = "0";
    elements.deform.twistZ.value = "0";
    elements.deform.noise.value = "0";
    updateOutputs();
    isSyncingLetterPanel = false;
    return;
  }

  elements.deform.status.textContent = `Selected letter: ${selection.character} (${selection.index + 1})`;
  elements.deform.moveX.value = String(selection.offset.x);
  elements.deform.moveY.value = String(selection.offset.y);
  elements.deform.moveZ.value = String(selection.offset.z);
  elements.deform.scaleX.value = String(selection.scale.x);
  elements.deform.scaleY.value = String(selection.scale.y);
  elements.deform.scaleZ.value = String(selection.scale.z);
  elements.deform.bendX.value = String(selection.deform.bend.x);
  elements.deform.bendY.value = String(selection.deform.bend.y);
  elements.deform.bendZ.value = String(selection.deform.bend.z);
  elements.deform.twistX.value = String(selection.deform.twist.x);
  elements.deform.twistY.value = String(selection.deform.twist.y);
  elements.deform.twistZ.value = String(selection.deform.twist.z);
  elements.deform.noise.value = String(selection.deform.noise);
  updateOutputs();
  isSyncingLetterPanel = false;
}

function startLetterPanelSync() {
  const tick = () => {
    if (selectedPanelTab === "deform") {
      syncLetterPanel();
    }
    maybeAutoUpdateAnimationKeyframe();
    window.requestAnimationFrame(tick);
  };

  window.requestAnimationFrame(tick);
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
    elements.controls.bend,
    elements.controls.twist,
    elements.controls.wave,
    elements.controls.noise,
    elements.controls.gridEnabled,
    elements.controls.gridRows,
    elements.controls.gridCols,
    elements.controls.seedInput,
    elements.controls.variationIntensity,
    elements.controls.expansionRandomness,
    elements.controls.axisStepEnabled,
    elements.controls.axisGuidesEnabled,
    elements.controls.cameraFov,
    elements.controls.cameraDistance,
    elements.controls.animationPreset,
    elements.controls.contentDensity,
    elements.controls.contentFillPoints,
    elements.controls.contentHoverScale,
    elements.controls.pointTextFont,
    elements.controls.pointTextUppercase,
    elements.controls.pointTextBackground,
    elements.controls.pointTextColor,
    elements.controls.pointTextBackgroundColor,
    elements.controls.imageRatio,
    elements.controls.textRatio,
    elements.controls.emptyRatio,
    elements.controls.contentLayoutMode,
    elements.controls.pointTextInput,
    elements.controls.filterKind,
    elements.controls.boundaryShape,
    elements.controls.fieldShape,
    elements.controls.trailLength
  ];

  for (const control of visualControls) {
    const handler = () => {
      updateOutputs();
      if (control === elements.controls.cameraFov || control === elements.controls.cameraDistance) {
        applyState({ forceFitCamera: true, clearUserCameraOverride: true });
        return;
      }

      applyState({ rebuildLayout: true });
    };

    control.addEventListener("input", handler);
    control.addEventListener("change", handler);
  }

  for (const control of [
    elements.controls.strokeWidth,
    elements.controls.glowEnabled,
    elements.controls.glowBasePointsOnly,
    elements.controls.glowColor,
    elements.controls.glowIntensity,
    elements.controls.pointSize,
    elements.controls.pointOpacity,
    elements.controls.pointColorMode,
    elements.controls.pointColorA,
    elements.controls.pointColorB,
    elements.controls.mediaSpacePreset,
    elements.controls.hoverProximityStrength,
    elements.controls.cinematicDepthSpeed,
    elements.controls.cinematicDirection,
    elements.controls.contentOnlyMode,
    elements.controls.contentOnlyType
  ]) {
    const handler = () => {
      updateOutputs();
      applyState();
    };

    control.addEventListener("input", handler);
    control.addEventListener("change", handler);
  }

  for (const control of [
    elements.cinematic.layoutPreset,
    elements.cinematic.showPoints,
    elements.cinematic.expansionRandomness,
    elements.cinematic.hoverProximityStrength,
    elements.cinematic.depthSpeed,
    elements.cinematic.direction
  ]) {
    const handler = () => {
      updateVisualState();
      updateOutputs();

      if (selectedPanelTab === "cinematic") {
        applyState();
      }
    };

    control?.addEventListener("input", handler);
    control?.addEventListener("change", handler);
  }

  for (const control of [
    elements.brand.preset,
    elements.brand.orbitSpeed,
    elements.brand.orbitRadius,
    elements.brand.numberOfRings,
    elements.brand.orbitSpacing,
    elements.brand.orbitRandomness,
    elements.brand.orbitJitter,
    elements.brand.mainKind,
    elements.brand.mainText,
    elements.brand.orbitTexts,
    elements.brand.titleText,
    elements.brand.subtitleText,
    elements.brand.tagText,
    elements.brand.backgroundWord,
    elements.brand.textFontSize,
    elements.brand.textAlign,
    elements.brand.textColor,
    elements.brand.textLineHeight,
    elements.brand.textLetterSpacing,
    elements.brand.textOpacity,
    elements.brand.mainScale,
    elements.brand.mainRotateX,
    elements.brand.mainRotateY,
    elements.brand.mainRotateZ,
    elements.brand.mainDepth,
    elements.brand.activeDepthOffset,
    elements.brand.mainTilt,
    elements.brand.heroSkew,
    elements.brand.heroOpacity,
    elements.brand.heroDominance,
    elements.brand.showPoints,
    elements.brand.showImages,
    elements.brand.showText,
    elements.brand.pointDensity,
    elements.brand.pointSize,
    elements.brand.pointOpacity,
    elements.brand.pointColorMode,
    elements.brand.pointColorA,
    elements.brand.pointColorB,
    elements.brand.orbitMinScale,
    elements.brand.orbitMaxScale,
    elements.brand.orbitDistance,
    elements.brand.orbitDepthSpread,
    elements.brand.clusterStrength,
    elements.brand.attractionToHero,
    elements.brand.repulsionFromHero,
    elements.brand.orbitRandomRotation,
    elements.brand.secondaryEmphasis,
    elements.brand.backgroundSuppression,
    elements.brand.opacityFalloffDepth,
    elements.brand.scaleFalloffDistance,
    elements.brand.blurFalloffDepth,
    elements.brand.transitionStyle,
    elements.brand.transitionDuration,
    elements.brand.transitionEasing,
    elements.brand.cameraPreset,
    elements.brand.slowCameraDrift,
    elements.brand.parallaxStrength,
    elements.brand.outputPreset,
    elements.brand.glowEnabled,
    elements.brand.moodPreset,
    elements.brand.auraStrength,
    elements.brand.auraRadius,
    elements.brand.auraOpacity,
    elements.brand.memoryDuration,
    elements.brand.memoryOpacity,
    elements.brand.memoryOffset,
    elements.brand.brandWeight,
    elements.brand.dualHeroEnabled,
    elements.brand.dualHeroDistance,
    elements.brand.dualHeroBalance
  ]) {
    const handler = () => {
      updateVisualState();
      updateOutputs();

      if (selectedPanelTab === "brand") {
        if (control === elements.brand.cameraPreset) {
          applyState({ forceFitCamera: true, clearUserCameraOverride: true });
          return;
        }

        applyState();
      }
    };

    control?.addEventListener("input", handler);
    control?.addEventListener("change", handler);
  }

  for (const control of [
    elements.editorial.glowEnabled,
    elements.editorial.layoutPreset,
    elements.editorial.templatePreset,
    elements.editorial.heroText,
    elements.editorial.heroFont,
    elements.editorial.heroSize,
    elements.editorial.heroTracking,
    elements.editorial.heroLineHeight,
    elements.editorial.heroOpacity,
    elements.editorial.heroColor,
    elements.editorial.heroLayer,
    elements.editorial.heroX,
    elements.editorial.heroY,
    elements.editorial.heroZ,
    elements.editorial.heroMaxWidth,
    elements.editorial.heroBackground,
    elements.editorial.heroBackgroundOpacity,
    elements.editorial.heroBackgroundColor,
    elements.editorial.heroPaddingX,
    elements.editorial.heroPaddingY,
    elements.editorial.heroMaskEnabled,
    elements.editorial.heroMaskType,
    elements.editorial.heroMaskWidth,
    elements.editorial.heroMaskHeight,
    elements.editorial.heroMaskX,
    elements.editorial.heroMaskY,
    elements.editorial.opticalSizeBias,
    elements.editorial.heroContrast,
    elements.editorial.microContrast,
    elements.editorial.whitespaceBalance,
    elements.editorial.textDensity,
    elements.editorial.gridPreset,
    elements.editorial.gridSnap,
    elements.editorial.gridMargin,
    elements.editorial.gridGutter,
    elements.editorial.frameLogic,
    elements.editorial.imageFollowHero,
    elements.editorial.imageScaleBias,
    elements.editorial.animationPreset,
    elements.editorial.animationSpeed,
    elements.editorial.animationIntensity,
    elements.editorial.labelsText,
    elements.editorial.labelsSize,
    elements.editorial.labelsTracking,
    elements.editorial.labelsSpacing,
    elements.editorial.labelsAlign,
    elements.editorial.labelsZ,
    elements.editorial.labelsLayer,
    elements.editorial.textFont,
    elements.editorial.metadataFont,
    elements.editorial.labelFont,
    elements.editorial.infoText,
    elements.editorial.infoFontSize,
    elements.editorial.infoTracking,
    elements.editorial.infoLineHeight,
    elements.editorial.infoWidth,
    elements.editorial.infoHeight,
    elements.editorial.infoPadding,
    elements.editorial.infoAlign,
    elements.editorial.infoX,
    elements.editorial.infoY,
    elements.editorial.infoZ,
    elements.editorial.infoLayer,
    elements.editorial.infoBorder,
    elements.editorial.secondaryText,
    elements.editorial.secondarySize,
    elements.editorial.secondaryTracking,
    elements.editorial.secondaryLineHeight,
    elements.editorial.secondaryOpacity,
    elements.editorial.secondaryX,
    elements.editorial.secondaryY,
    elements.editorial.secondaryZ,
    elements.editorial.secondaryLayer,
    elements.editorial.showGuides,
    elements.editorial.mediaOpacity,
    elements.editorial.mediaScale,
    elements.editorial.labelBoxes,
    elements.editorial.labelStyle,
    elements.editorial.labelBoxSize,
    elements.editorial.labelTracking,
    elements.editorial.labelLineHeight,
    elements.editorial.labelBoxOpacity,
    elements.editorial.labelZ,
    elements.editorial.labelLayer,
    elements.editorial.overlapTextOpacity,
    elements.editorial.overlapImageOpacity,
    elements.editorial.overlapBrightness,
    elements.editorial.overlapPriority,
    elements.editorial.heroStyle,
    elements.editorial.textStyle,
    elements.editorial.outlineThickness,
    elements.editorial.shadowOpacity,
    elements.editorial.duplicateOffsetX,
    elements.editorial.duplicateOffsetY,
    elements.editorial.brandOrbitTexts
  ]) {
    const handler = () => {
      updateVisualState();
      updateOutputs();

      if (selectedPanelTab === "editorial") {
        applyState();
      }
    };

    control?.addEventListener("input", handler);
    control?.addEventListener("change", handler);
  }

  elements.hand.mode?.addEventListener("input", () => {
    updateVisualState();
  });
  elements.hand.mode?.addEventListener("change", () => {
    updateVisualState();
  });

  for (const control of [elements.controls.backgroundColor, elements.controls.transparentBackground]) {
    const handler = () => {
      syncBrandExportControlsFromMain();
      syncHandExportControlsFromMain();
      syncCinematicExportControlsFromMain();
      updateOutputs();
      applyPreviewAspectRatio();
      applyState({ rebuildBackground: true });
    };

    control.addEventListener("input", handler);
    control.addEventListener("change", handler);
  }

  for (const control of [
    elements.controls.exportRatio,
    elements.controls.exportSize,
    elements.controls.exportFrames,
    elements.controls.exportDuration,
    elements.controls.exportQuality,
    elements.controls.exportFps
  ]) {
    const handler = () => {
      updateVisualState();
      syncBrandExportControlsFromMain();
      syncHandExportControlsFromMain();
      syncCinematicExportControlsFromMain();
      updateOutputs();
      applyPreviewAspectRatio();
      applyState();
    };

    control.addEventListener("input", handler);
    control.addEventListener("change", handler);
  }

  for (const control of [
    elements.brand.exportRatio,
    elements.brand.exportSize,
    elements.brand.exportFrames,
    elements.brand.exportDuration,
    elements.brand.exportQuality,
    elements.brand.exportFps
  ]) {
    const handler = () => {
      syncMainExportControlsFromBrand();
      syncHandExportControlsFromMain();
      syncCinematicExportControlsFromMain();
      updateVisualState();
      updateOutputs();
      applyPreviewAspectRatio();
      applyState();
    };

    control?.addEventListener("input", handler);
    control?.addEventListener("change", handler);
  }

  for (const control of [elements.brand.backgroundColor, elements.brand.transparentBackground]) {
    const handler = () => {
      syncMainExportControlsFromBrand();
      syncHandExportControlsFromMain();
      syncCinematicExportControlsFromMain();
      updateVisualState();
      updateOutputs();
      applyPreviewAspectRatio();
      applyState({ rebuildBackground: true });
    };

    control?.addEventListener("input", handler);
    control?.addEventListener("change", handler);
  }

  for (const control of [
    elements.hand.exportRatio,
    elements.hand.exportSize,
    elements.hand.exportFrames,
    elements.hand.exportDuration,
    elements.hand.exportQuality,
    elements.hand.exportFps
  ]) {
    const handler = () => {
      syncMainExportControlsFromHand();
      syncBrandExportControlsFromMain();
      syncCinematicExportControlsFromMain();
      updateVisualState();
      updateOutputs();
      applyPreviewAspectRatio();
      applyState();
    };

    control?.addEventListener("input", handler);
    control?.addEventListener("change", handler);
  }

  for (const control of [
    elements.cinematic.exportRatio,
    elements.cinematic.exportSize,
    elements.cinematic.exportFrames,
    elements.cinematic.exportDuration,
    elements.cinematic.exportQuality,
    elements.cinematic.exportFps
  ]) {
    const handler = () => {
      syncMainExportControlsFromCinematic();
      syncBrandExportControlsFromMain();
      syncHandExportControlsFromMain();
      updateVisualState();
      updateOutputs();
      applyPreviewAspectRatio();
      applyState();
    };

    control?.addEventListener("input", handler);
    control?.addEventListener("change", handler);
  }

  for (const control of [
    elements.animationTab.exportQuality,
    elements.animationTab.exportFps
  ]) {
    const handler = () => {
      syncMainExportControlsFromAnimation();
      syncBrandExportControlsFromMain();
      syncHandExportControlsFromMain();
      syncCinematicExportControlsFromMain();
      updateVisualState();
      updateOutputs();
      scheduleSessionPersist();
    };

    control?.addEventListener("input", handler);
    control?.addEventListener("change", handler);
  }

  for (const control of [elements.cinematic.backgroundColor, elements.cinematic.transparentBackground]) {
    const handler = () => {
      syncMainExportControlsFromCinematic();
      syncBrandExportControlsFromMain();
      syncHandExportControlsFromMain();
      updateVisualState();
      updateOutputs();
      applyPreviewAspectRatio();
      applyState({ rebuildBackground: true });
    };

    control?.addEventListener("input", handler);
    control?.addEventListener("change", handler);
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
    applyState({ forceFitCamera: true, clearUserCameraOverride: true });
  });

  elements.controls.resetCameraButton?.addEventListener("click", () => {
    applyState({ forceFitCamera: true, clearUserCameraOverride: true });
    setStatus("Camera reset.");
  });

  elements.brand.resetCameraButton?.addEventListener("click", () => {
    updateVisualState();
    applyState({ forceFitCamera: true, clearUserCameraOverride: true });
    setStatus("Камера сброшена.");
  });

  elements.interactionModeToggle.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-interaction-mode]");

    if (!button) {
      return;
    }

    state.interactionMode = button.dataset.interactionMode;
    setActiveToggle(elements.interactionModeToggle, "interactionMode", state.interactionMode);
    studio?.setInteractionMode(state.interactionMode);
    applyState();
  });

  elements.panelTabToggle.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-panel-tab]");

    if (!button) {
      return;
    }

    setPanelTab(button.dataset.panelTab);
  });

  elements.animationTab.currentTime?.addEventListener("input", () => {
    stopAnimationPlayback();
    applyAnimationTimeToStudio(Number(elements.animationTab.currentTime.value), { syncControls: true });
  });

  elements.animationTab.duration?.addEventListener("input", () => {
    state.animationWorkbench.duration = Number(elements.animationTab.duration.value);
    syncAnimationTimelineRange();
    updateOutputs();
    scheduleSessionPersist();
  });
  elements.animationTab.duration?.addEventListener("change", () => {
    state.animationWorkbench.duration = Number(elements.animationTab.duration.value);
    syncAnimationTimelineRange();
    updateOutputs();
    scheduleSessionPersist();
  });

  elements.animationTab.loop?.addEventListener("change", () => {
    state.animationWorkbench.loop = Boolean(elements.animationTab.loop.checked);
    scheduleSessionPersist();
  });

  elements.animationTab.autoKey?.addEventListener("change", () => {
    state.animationWorkbench.autoKey = Boolean(elements.animationTab.autoKey.checked);
    animationAutoKeySignature = "";
    syncAnimationAdvancedUi();
    scheduleSessionPersist();
    setStatus(state.animationWorkbench.autoKey ? "Auto Key enabled." : "Auto Key disabled.");
  });

  const syncAnimationMotionControls = () => {
    state.animationWorkbench.easing = elements.animationTab.easing?.value || "ease-in-out";
    state.animationWorkbench.flightProfile = elements.animationTab.flightProfile?.value || "slow-fast";
    state.animationWorkbench.flightIntensity = Number(elements.animationTab.flightIntensity?.value || 0.65);
    updateOutputs();
    syncAnimationAdvancedUi();
    scheduleSessionPersist();
  };

  elements.animationTab.easing?.addEventListener("change", syncAnimationMotionControls);
  elements.animationTab.flightProfile?.addEventListener("change", syncAnimationMotionControls);
  elements.animationTab.flightIntensity?.addEventListener("input", syncAnimationMotionControls);
  elements.animationTab.flightIntensity?.addEventListener("change", syncAnimationMotionControls);

  elements.animationTab.prevKeyframe?.addEventListener("click", () => {
    const keyframes = sortAnimationKeyframes(state.animationWorkbench.keyframes);
    if (!keyframes.length) {
      setStatus("No keyframes yet.");
      return;
    }

    const currentTime = THREE.MathUtils.clamp(Number(elements.animationTab.currentTime?.value || 0), 0, getAnimationDurationSeconds());
    const previous = [...keyframes].reverse().find((item) => item.time < currentTime - 0.0001) || keyframes[0];
    state.animationWorkbench.selectedKeyframeId = previous.id;
    applyAnimationTimeToStudio(previous.time, { syncControls: true });
    renderAnimationKeyframeList();
  });

  elements.animationTab.nextKeyframe?.addEventListener("click", () => {
    const keyframes = sortAnimationKeyframes(state.animationWorkbench.keyframes);
    if (!keyframes.length) {
      setStatus("No keyframes yet.");
      return;
    }

    const currentTime = THREE.MathUtils.clamp(Number(elements.animationTab.currentTime?.value || 0), 0, getAnimationDurationSeconds());
    const next = keyframes.find((item) => item.time > currentTime + 0.0001) || keyframes[keyframes.length - 1];
    state.animationWorkbench.selectedKeyframeId = next.id;
    applyAnimationTimeToStudio(next.time, { syncControls: true });
    renderAnimationKeyframeList();
  });

  elements.animationTab.saveCurrentView?.addEventListener("click", () => {
    const currentTime = THREE.MathUtils.clamp(Number(elements.animationTab.currentTime?.value || 0), 0, getAnimationDurationSeconds());
    const nearest = getNearestAnimationKeyframe(currentTime);

    if (nearest) {
      state.animationWorkbench.selectedKeyframeId = nearest.id;
      captureAnimationKeyframe({ updateExisting: true });
      return;
    }

    captureAnimationKeyframe();
  });

  elements.animationTab.advancedToggle?.addEventListener("click", () => {
    state.animationWorkbench.advancedExpanded = !state.animationWorkbench.advancedExpanded;
    syncAnimationAdvancedUi();
    scheduleSessionPersist();
  });

  elements.animationTab.captureComposition?.addEventListener("change", () => {
    state.animationWorkbench.captureComposition = Boolean(elements.animationTab.captureComposition.checked);
    syncAnimationAdvancedUi();
    scheduleSessionPersist();
  });

  elements.animationTab.addKeyframe?.addEventListener("click", () => {
    captureAnimationKeyframe();
  });

  elements.animationTab.updateKeyframe?.addEventListener("click", () => {
    captureAnimationKeyframe({ updateExisting: true });
  });

  elements.animationTab.deleteKeyframe?.addEventListener("click", () => {
    const selectedId = state.animationWorkbench.selectedKeyframeId;
    if (!selectedId) {
      setStatus("Select a keyframe first.");
      return;
    }
    state.animationWorkbench.keyframes = state.animationWorkbench.keyframes.filter((item) => item.id !== selectedId);
    state.animationWorkbench.selectedKeyframeId = null;
    renderAnimationKeyframeList();
    scheduleSessionPersist();
    setStatus("Keyframe deleted.");
  });

  elements.animationTab.playToggle?.addEventListener("click", () => {
    if (state.animationWorkbench.playing) {
      stopAnimationPlayback();
      setStatus("Animation paused.");
      return;
    }
    startAnimationPlayback({ reset: true, loop: state.animationWorkbench.loop });
  });

  elements.animationTab.stop?.addEventListener("click", () => {
    stopAnimationPlayback();
    applyAnimationTimeToStudio(0, { syncControls: true });
    setStatus("Animation stopped.");
  });

  elements.animationTab.keyframeList?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-keyframe-action]");
    const item = event.target.closest("[data-keyframe-id]");

    if (!button || !item) {
      return;
    }

    const keyframe = getAnimationKeyframeById(item.dataset.keyframeId);
    if (!keyframe) {
      return;
    }

    if (button.dataset.keyframeAction === "delete") {
      state.animationWorkbench.keyframes = state.animationWorkbench.keyframes.filter((entry) => entry.id !== keyframe.id);
      if (state.animationWorkbench.selectedKeyframeId === keyframe.id) {
        state.animationWorkbench.selectedKeyframeId = null;
      }
      renderAnimationKeyframeList();
      scheduleSessionPersist();
      return;
    }

    state.animationWorkbench.selectedKeyframeId = keyframe.id;
    applyAnimationTimeToStudio(keyframe.time, { syncControls: true });
    renderAnimationKeyframeList();
  });

  elements.animationTab.trackList?.addEventListener("click", (event) => {
    if (performance.now() < animationSuppressTrackClickUntil) {
      return;
    }

    const button = event.target.closest("[data-keyframe-id]");
    if (!button) {
      return;
    }

    const keyframe = getAnimationKeyframeById(button.dataset.keyframeId);
    if (!keyframe) {
      return;
    }

    state.animationWorkbench.selectedKeyframeId = keyframe.id;
    applyAnimationTimeToStudio(keyframe.time, { syncControls: true });
    renderAnimationKeyframeList();
  });

  elements.animationTab.trackList?.addEventListener("pointerdown", (event) => {
    const keyButton = event.target.closest(".timeline-track__key[data-keyframe-id]");
    const trackBar = event.target.closest(".timeline-track__bar");

    if (!keyButton || !trackBar) {
      return;
    }

    const keyframe = getAnimationKeyframeById(keyButton.dataset.keyframeId);
    if (!keyframe) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    keyButton.setPointerCapture?.(event.pointerId);
    animationKeyframeDrag = {
      id: keyframe.id,
      bar: trackBar,
      pointerId: event.pointerId,
      captureTarget: keyButton,
      moved: false,
      startClientX: event.clientX,
      startTime: Number(keyframe.time || 0)
    };
    state.animationWorkbench.selectedKeyframeId = keyframe.id;
    renderAnimationKeyframeList();
  });

  window.addEventListener("pointermove", (event) => {
    if (!animationKeyframeDrag || event.pointerId !== animationKeyframeDrag.pointerId) {
      return;
    }

    const deltaX = Math.abs(event.clientX - animationKeyframeDrag.startClientX);

    if (!animationKeyframeDrag.moved && deltaX < 4) {
      return;
    }

    animationKeyframeDrag.moved = true;
    event.preventDefault();
    moveAnimationKeyframeTime(
      animationKeyframeDrag.id,
      getAnimationTimeFromTrackPointer(event, animationKeyframeDrag.bar),
      {
        syncControls: true,
        persist: false
      }
    );
  });

  window.addEventListener("pointerup", (event) => {
    if (!animationKeyframeDrag || event.pointerId !== animationKeyframeDrag.pointerId) {
      return;
    }

    const drag = animationKeyframeDrag;
    animationKeyframeDrag = null;
    drag.captureTarget?.releasePointerCapture?.(event.pointerId);
    if (drag.moved) {
      animationSuppressTrackClickUntil = performance.now() + 180;
      moveAnimationKeyframeTime(
        drag.id,
        getAnimationTimeFromTrackPointer(event, drag.bar),
        {
          syncControls: true,
          persist: true
        }
      );
      setStatus("Keyframe moved.");
      return;
    }

    state.animationWorkbench.selectedKeyframeId = drag.id;
    applyAnimationTimeToStudio(drag.startTime, { syncControls: true });
    renderAnimationKeyframeList();
  });

  window.addEventListener("pointercancel", (event) => {
    if (!animationKeyframeDrag || event.pointerId !== animationKeyframeDrag.pointerId) {
      return;
    }

    if (animationKeyframeDrag.moved) {
      animationSuppressTrackClickUntil = performance.now() + 180;
    }
    animationKeyframeDrag.captureTarget?.releasePointerCapture?.(event.pointerId);
    animationKeyframeDrag = null;
    renderAnimationKeyframeList();
  });

  const presetSaveButtons = [
    elements.saved.savePresetButton,
    elements.brand.savePreset,
    elements.editorial.savePreset,
    elements.cinematic.savePreset,
    elements.animationTab.savePreset
  ];

  for (const button of presetSaveButtons) {
    button?.addEventListener("click", () => {
      const sourceTab = button.closest("[data-panel-pane]")?.dataset.panelPane || selectedPanelTab;
      openPresetModal(sourceTab);
    });
  }

  elements.presetModal.cancel?.addEventListener("click", () => {
    closePresetModal();
  });

  document.querySelector("#preset-modal .modal-card")?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  elements.presetModal.root?.addEventListener("click", (event) => {
    if (event.target === elements.presetModal.root) {
      closePresetModal();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.presetModal.root?.hidden) {
      closePresetModal();
    }
  });

  elements.presetModal.confirm?.addEventListener("click", async () => {
    const name = elements.presetModal.name?.value?.trim() || "New Preset";
    const category = elements.presetModal.category?.value || "custom";
    const sourceTab = elements.presetModal.sourceTab?.value || selectedPanelTab;
    const item = buildPresetPayload(name, category, sourceTab);
    await persistPresetLibraryItem(item);
    closePresetModal();
    setStatus(`Preset saved: ${name}.`);
  });

  elements.presets.categoryFilter?.addEventListener("input", renderPresetLibrary);
  elements.presets.categoryFilter?.addEventListener("change", renderPresetLibrary);

  elements.presets.list?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-preset-action]");
    const item = event.target.closest("[data-preset-id]");

    if (!button || !item) {
      return;
    }

    const builtin = item.dataset.presetBuiltin === "true";
    const preset = builtin
      ? BUILT_IN_PRESETS.find((entry) => entry.id === item.dataset.presetId)
      : presetLibrary.find((entry) => entry.id === item.dataset.presetId);

    if (!preset) {
      return;
    }

    if (button.dataset.presetAction === "delete" && !builtin) {
      await removePresetLibraryItem(preset.id);
      setStatus(`Preset deleted: ${preset.name}.`);
      return;
    }

    await applyPresetItem(preset);
  });

  elements.editorial.contextToggle?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-editorial-context]");

    if (!button) {
      return;
    }

    state.editorial.context = button.dataset.editorialContext;
    state.brand.enabled = state.editorial.context === "brand";
    setActiveToggle(elements.editorial.contextToggle, "editorialContext", state.editorial.context);

    if (selectedPanelTab === "editorial") {
      studio?.clearEditorialBackdrop?.();
      applyState({ rebuildBackground: state.editorial.context === "brand" });
    } else {
      updateVisualState();
      updateOutputs();
      scheduleSessionPersist();
    }
  });

  elements.systemEditorial.enabled?.addEventListener("change", () => {
    updateVisualState();

    if (selectedPanelTab === "system") {
      applyState();
    } else {
      syncSystemEditorialStatus();
      scheduleSessionPersist();
    }
  });

  elements.systemEditorial.load?.addEventListener("click", () => {
    loadSystemEditorialIntoEditor({ switchTab: true });
  });

  elements.systemEditorial.remove?.addEventListener("click", () => {
    state.systemEditorialOverlay = { enabled: false };
    if (elements.systemEditorial.enabled) {
      elements.systemEditorial.enabled.checked = false;
    }
    syncSystemEditorialStatus();
    applyState();
    setStatus("System editorial overlay removed.");
  });

  elements.stepModeToggle.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-step-mode]");

    if (!button) {
      return;
    }

    state.stepMode = button.dataset.stepMode;
    setActiveToggle(elements.stepModeToggle, "stepMode", state.stepMode);
    studio?.setStepMode(state.stepMode);
    applyState();
  });

  const deformInputs = [
    elements.deform.moveX,
    elements.deform.moveY,
    elements.deform.moveZ,
    elements.deform.scaleX,
    elements.deform.scaleY,
    elements.deform.scaleZ,
    elements.deform.bendX,
    elements.deform.bendY,
    elements.deform.bendZ,
    elements.deform.twistX,
    elements.deform.twistY,
    elements.deform.twistZ,
    elements.deform.noise
  ];

  for (const control of deformInputs) {
    const handler = () => {
      if (isSyncingLetterPanel) {
        return;
      }

      studio.updateSelectedLetterState?.({
        offset: {
          x: Number(elements.deform.moveX.value),
          y: Number(elements.deform.moveY.value),
          z: Number(elements.deform.moveZ.value)
        },
        scale: {
          x: Number(elements.deform.scaleX.value),
          y: Number(elements.deform.scaleY.value),
          z: Number(elements.deform.scaleZ.value)
        },
        deform: {
          bend: {
            x: Number(elements.deform.bendX.value),
            y: Number(elements.deform.bendY.value),
            z: Number(elements.deform.bendZ.value)
          },
          twist: {
            x: Number(elements.deform.twistX.value),
            y: Number(elements.deform.twistY.value),
            z: Number(elements.deform.twistZ.value)
          },
          noise: Number(elements.deform.noise.value)
        }
      });
      updateOutputs();
    };

    control.addEventListener("input", handler);
    control.addEventListener("change", handler);
  }

  elements.deform.resetSelected.addEventListener("click", () => {
    studio.resetSelectedLetter?.();
    syncLetterPanel();
  });

  elements.deform.resetAll.addEventListener("click", () => {
    studio.resetAllLetters?.();
    syncLetterPanel();
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
      ensureSelectOption(elements.fontSelect, family, `${label} (Upload)`);
      elements.fontSelect.value = family;
      await persistUploadedFont(file, "typography", family, label);
      updateTypographyState();
      await rebuildTypography();
      scheduleSessionPersist();
    } catch (error) {
      console.error(error);
      setStatus("Unable to load font.");
    }
  });

  elements.editorial.heroFontUpload?.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];

    if (!file) {
      return;
    }

    try {
      setStatus("Loading editorial font...");
      const { family, label } = await loadFontFromFile(file);
      ensureSelectOption(elements.editorial.heroFont, family, `${label} (Upload)`);
      elements.editorial.heroFont.value = family;
      await persistUploadedFont(file, "editorial-hero", family, label);
      updateVisualState();
      applyState();
      scheduleSessionPersist();
      setStatus("Editorial font loaded.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to load editorial font.");
    }
  });

  elements.editorial.textFontUpload?.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];

    if (!file) {
      return;
    }

    try {
      setStatus("Loading editorial text font...");
      const { family, label } = await loadFontFromFile(file);
      ensureSelectOption(elements.editorial.textFont, family, `${label} (Upload)`);
      elements.editorial.textFont.value = family;
      await persistUploadedFont(file, "editorial-text", family, label);
      updateVisualState();
      applyState();
      scheduleSessionPersist();
      setStatus("Editorial text font loaded.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to load editorial text font.");
    }
  });

  elements.controls.pointTextFontUpload?.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];

    if (!file) {
      return;
    }

    try {
      setStatus("Loading system content font...");
      const { family, label } = await loadFontFromFile(file);
      ensureSelectOption(elements.controls.pointTextFont, family, `${label} (Upload)`);
      elements.controls.pointTextFont.value = family;
      await persistUploadedFont(file, "system-content", family, label);
      updateVisualState();
      applyState({ rebuildLayout: true });
      scheduleSessionPersist();
      setStatus("System content font loaded.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to load system content font.");
    }
  });

  elements.controls.pointImageUpload.addEventListener("change", async (event) => {
    const files = [...(event.target.files || [])];

    try {
      setStatus(files.length ? "Loading brand images..." : "Clearing brand images...");
      await studio?.setPointImagesFromFiles(files);
      persistedAssets.pointImages = await readFilesAsDataUrls(files);
      applyState({ rebuildLayout: true });
      setStatus(files.length ? "Brand images loaded." : "Brand images cleared.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to load images.");
    }
  });

  elements.brand.mainImageUpload?.addEventListener("change", async (event) => {
    const files = [...(event.target.files || [])];

    try {
      setStatus(files.length ? "Loading main brand image..." : "Clearing main brand image...");
      await studio?.setBrandMainImagesFromFiles?.(files);
      persistedAssets.brandMainImages = await readFilesAsDataUrls(files);
      if (files.length && elements.brand.mainKind) {
        elements.brand.mainKind.value = "image";
      }
      applyState();
      setStatus(files.length ? "Main brand image loaded." : "Main brand image cleared.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to load main brand image.");
    }
  });

  elements.brand.orbitImageUpload?.addEventListener("change", async (event) => {
    const files = [...(event.target.files || [])];

    try {
      setStatus(files.length ? "Loading orbit images..." : "Clearing orbit images...");
      await studio?.setBrandOrbitImagesFromFiles?.(files);
      persistedAssets.brandOrbitImages = await readFilesAsDataUrls(files);
      applyState();
      setStatus(files.length ? "Orbit images loaded." : "Orbit images cleared.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to load orbit images.");
    }
  });

  elements.brand.clearOrbit?.addEventListener("click", async () => {
    elements.brand.orbitTexts.value = "";
    elements.brand.orbitImageUpload.value = "";
    state.brand.orbitTexts = [];
    persistedAssets.brandOrbitImages = [];
    await studio?.setBrandOrbitImagesFromFiles?.([]);
    updateVisualState();
    applyState();
    setStatus("Orbit content cleared.");
  });

  elements.brand.randomizeOrbit?.addEventListener("click", () => {
    state.brand.orbitLayoutSeed = (state.brand.orbitLayoutSeed || 0) + 1;
    applyState();
    setStatus("Orbit layout randomized.");
  });

  elements.brand.resetMain?.addEventListener("click", async () => {
    elements.brand.preset.value = "hero-orbit";
    elements.brand.mainKind.value = "auto";
    elements.brand.mainText.value = "";
    elements.brand.orbitTexts.value = "";
    elements.brand.titleText.value = "";
    elements.brand.subtitleText.value = "";
    elements.brand.tagText.value = "";
    elements.brand.backgroundWord.value = "";
    elements.brand.mainImageUpload.value = "";
    persistedAssets.brandMainImages = [];
    elements.brand.textFontSize.value = "108";
    elements.brand.textAlign.value = "center";
    elements.brand.textColor.value = "#f5f2ed";
    elements.brand.textLineHeight.value = "0.92";
    elements.brand.textLetterSpacing.value = "4";
    elements.brand.textOpacity.value = "0.92";
    elements.brand.mainScale.value = "0";
    elements.brand.mainRotateX.value = "0";
    elements.brand.mainRotateY.value = "0";
    elements.brand.mainRotateZ.value = "0";
    elements.brand.mainDepth.value = "0";
    elements.brand.activeDepthOffset.value = "0.35";
    elements.brand.mainTilt.value = "0";
    elements.brand.heroSkew.value = "0";
    elements.brand.heroOpacity.value = "1";
    elements.brand.heroDominance.value = "2.1";
    elements.brand.showPoints.checked = true;
    elements.brand.showImages.checked = true;
    elements.brand.showText.checked = true;
    elements.brand.pointDensity.value = "1";
    elements.brand.pointSize.value = "1";
    elements.brand.pointOpacity.value = "0.18";
    elements.brand.pointColorMode.value = "solid";
    elements.brand.pointColorA.value = "#ffffff";
    elements.brand.pointColorB.value = "#d9d9d9";
    elements.brand.orbitMinScale.value = "0.82";
    elements.brand.orbitMaxScale.value = "1.08";
    elements.brand.backgroundColor.value = "#050505";
    elements.brand.transparentBackground.checked = false;
    elements.brand.numberOfRings.value = "2";
    elements.brand.orbitSpacing.value = "0.38";
    elements.brand.orbitJitter.value = "0.12";
    elements.brand.clusterStrength.value = "0.4";
    elements.brand.attractionToHero.value = "0.65";
    elements.brand.repulsionFromHero.value = "0.22";
    elements.brand.secondaryEmphasis.value = "0.9";
    elements.brand.backgroundSuppression.value = "0.28";
    elements.brand.opacityFalloffDepth.value = "0.3";
    elements.brand.scaleFalloffDistance.value = "0.22";
    elements.brand.blurFalloffDepth.value = "0";
    elements.brand.transitionStyle.value = "slide";
    elements.brand.transitionDuration.value = "0.9";
    elements.brand.transitionEasing.value = "ease-in-out";
    elements.brand.cameraPreset.value = "medium";
    elements.brand.slowCameraDrift.value = "0.18";
    elements.brand.parallaxStrength.value = "0.35";
    elements.brand.outputPreset.value = "poster";
    elements.brand.moodPreset.value = "luxury";
    elements.brand.auraStrength.value = "0.65";
    elements.brand.auraRadius.value = "1.15";
    elements.brand.auraOpacity.value = "0.42";
    elements.brand.memoryDuration.value = "0.9";
    elements.brand.memoryOpacity.value = "0.32";
    elements.brand.memoryOffset.value = "0.42";
    elements.brand.brandWeight.value = "1";
    elements.brand.dualHeroEnabled.checked = false;
    elements.brand.dualHeroDistance.value = "1.5";
    elements.brand.dualHeroBalance.value = "0.5";
    syncMainExportControlsFromBrand();
    applyPreviewAspectRatio();
    await studio?.setBrandMainImagesFromFiles?.([]);
    updateVisualState();
    updateOutputs();
    applyState();
    setStatus("Main brand element reset.");
  });

  elements.editorial.importBrand?.addEventListener("click", () => {
    const presetMap = {
      "hero-orbit": "hero-center",
      "split-orbit": "offset-hero",
      "tunnel-brand": "image-overlay",
      "wall-brand": "frame-editorial",
      "cluster-brand": "hero-center",
      "asymmetric-editorial": "offset-hero",
      "runway-brand": "image-overlay",
      "explosion-focus": "hero-center",
      "minimal-luxury": "frame-editorial",
      "data-axis-brand": "frame-editorial"
    };

    const templateMap = {
      luxury: "luxury-campaign",
      campaign: "fashion-brand-card",
      tech: "gallery-announcement",
      chaos: "sale-poster"
    };

    const brandLabels = [state.brand.titleText, state.brand.subtitleText, state.brand.tagText]
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    const brandInfoBlocks = (state.brand.orbitTexts || []).map((item) => String(item || "").trim()).filter(Boolean).slice(0, 4);
    const secondaryBlocks = [state.brand.backgroundWord, state.brand.tagText]
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    if (elements.editorial.layoutPreset) {
      elements.editorial.layoutPreset.value = presetMap[state.brand.preset] || "hero-center";
    }
    if (elements.editorial.templatePreset) {
      elements.editorial.templatePreset.value = templateMap[state.brand.moodPreset] || "luxury-campaign";
    }
    if (elements.editorial.heroText) {
      elements.editorial.heroText.value = state.brand.mainKind === "text"
        ? (state.brand.mainText || state.editorial.heroText || "YULIAWAVE")
        : (state.brand.titleText || state.editorial.heroText || "YULIAWAVE");
    }
    if (elements.editorial.heroColor) {
      elements.editorial.heroColor.value = state.brand.textColor || "#ffffff";
    }
    if (elements.editorial.labelsText) {
      elements.editorial.labelsText.value = brandLabels.join(", ");
    }
    if (elements.editorial.infoText && brandInfoBlocks.length) {
      elements.editorial.infoText.value = brandInfoBlocks.join("\n---\n");
    }
    if (elements.editorial.secondaryText && secondaryBlocks.length) {
      elements.editorial.secondaryText.value = secondaryBlocks.join("\n---\n");
    }
    if (elements.editorial.mediaOpacity) {
      elements.editorial.mediaOpacity.value = `${state.brand.heroOpacity ?? 1}`;
    }
    if (elements.editorial.mediaScale) {
      const importedMediaScale = Math.min(2, Math.max(0.5, Math.exp((state.brand.mainScale ?? 0) * 0.08)));
      elements.editorial.mediaScale.value = `${importedMediaScale}`;
    }
    if (elements.editorial.heroOpacity) {
      elements.editorial.heroOpacity.value = `${state.brand.textOpacity ?? 1}`;
    }
    if (elements.editorial.showGuides) {
      elements.editorial.showGuides.checked = true;
    }

    updateVisualState();
    updateOutputs();

    if (selectedPanelTab === "editorial") {
      applyState();
    }

    setStatus("Brand setup imported into Editorial.");
  });

  const appendEditorialBlock = (textarea, blockText) => {
    if (!textarea) {
      return;
    }

    const current = textarea.value.trim();
    textarea.value = current
      ? `${current}\n---\n${blockText}`
      : blockText;

    updateVisualState();
    updateOutputs();

    if (selectedPanelTab === "editorial") {
      applyState();
    }

    renderEditorialBlockEditors();
  };

  const commitEditorialBlockChange = (textarea, nextValue, offsetKey = "", nextLength = null) => {
    if (!textarea) {
      return;
    }

    textarea.value = nextValue;

    if (offsetKey && state.editorial?.offsets?.[offsetKey]) {
      const targetLength = Number.isFinite(nextLength) ? nextLength : state.editorial.offsets[offsetKey].length;
      state.editorial.offsets[offsetKey] = state.editorial.offsets[offsetKey].slice(0, Math.max(0, targetLength));
    }

    updateVisualState();
    updateOutputs();

    if (selectedPanelTab === "editorial") {
      applyState();
    } else {
      scheduleSessionPersist();
    }

    renderEditorialBlockEditors();
  };

  elements.editorial.addHero?.addEventListener("click", () => {
    appendEditorialBlock(elements.editorial.heroText, "NEW HERO");
    setEditorialSectionExpanded("hero", true);
    setStatus("Hero block added.");
  });

  elements.editorial.removeHero?.addEventListener("click", () => {
    const blocks = parseEditorialBlocks(elements.editorial.heroText?.value || "", []);

    if (!blocks.length) {
      setStatus("No hero blocks to remove.");
      return;
    }

    blocks.pop();
    commitEditorialBlockChange(
      elements.editorial.heroText,
      joinEditorialBlocks(blocks, ""),
      "heroBlocks",
      blocks.length
    );
    if (!blocks.length) {
      state.editorial.offsets.hero = [0, 0, 0];
    }
    setStatus("Hero block removed.");
  });

  elements.editorial.addTopLabels?.addEventListener("click", () => {
    if (!elements.editorial.labelsText) {
      return;
    }

    const labels = elements.editorial.labelsText.value
      .split(/[,\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    labels.push(`NEW LABEL ${labels.length + 1}`);
    elements.editorial.labelsText.value = labels.join(", ");

    setEditorialSectionExpanded("top-labels", true);
    updateVisualState();
    updateOutputs();

    if (selectedPanelTab === "editorial") {
      applyState();
    }

    setStatus("Top labels added.");
  });

  elements.editorial.removeTopLabels?.addEventListener("click", () => {
    if (!elements.editorial.labelsText) {
      return;
    }

    elements.editorial.labelsText.value = "";
    state.editorial.offsets.labels = [0, 0, 0];
    updateVisualState();
    updateOutputs();

    if (selectedPanelTab === "editorial") {
      applyState();
    } else {
      scheduleSessionPersist();
    }

    setStatus("Top labels removed.");
  });

  elements.editorial.addInfoBlock?.addEventListener("click", () => {
    appendEditorialBlock(elements.editorial.infoText, "NEW TEXT BLOCK");
    setEditorialSectionExpanded("info", true);
    setStatus("Text block added.");
  });

  elements.editorial.removeInfoBlock?.addEventListener("click", () => {
    const blocks = parseEditorialBlocks(elements.editorial.infoText?.value || "", []);

    if (!blocks.length) {
      setStatus("No text blocks to remove.");
      return;
    }

    blocks.pop();
    commitEditorialBlockChange(
      elements.editorial.infoText,
      joinEditorialBlocks(blocks, ""),
      "infoBlocks",
      blocks.length
    );
    setStatus("Text block removed.");
  });

  elements.editorial.addSecondaryBlock?.addEventListener("click", () => {
    appendEditorialBlock(elements.editorial.secondaryText, "NEW SECONDARY");
    setEditorialSectionExpanded("secondary", true);
    setStatus("Secondary block added.");
  });

  elements.editorial.removeSecondaryBlock?.addEventListener("click", () => {
    const blocks = parseEditorialBlocks(elements.editorial.secondaryText?.value || "", []);

    if (!blocks.length) {
      setStatus("No secondary blocks to remove.");
      return;
    }

    blocks.pop();
    commitEditorialBlockChange(
      elements.editorial.secondaryText,
      joinEditorialBlocks(blocks, ""),
      "secondaryBlocks",
      blocks.length
    );
    setStatus("Secondary block removed.");
  });

  elements.editorial.addLabelBlock?.addEventListener("click", () => {
    appendEditorialBlock(elements.editorial.labelBoxes, "NEW LABEL");
    setEditorialSectionExpanded("labels", true);
    setStatus("Label added.");
  });

  elements.editorial.removeLabelBlock?.addEventListener("click", () => {
    const blocks = parseEditorialBlocks(elements.editorial.labelBoxes?.value || "", []);

    if (!blocks.length) {
      setStatus("No labels to remove.");
      return;
    }

    blocks.pop();
    commitEditorialBlockChange(
      elements.editorial.labelBoxes,
      joinEditorialBlocks(blocks, ""),
      "labelBlocks",
      blocks.length
    );
    setStatus("Label removed.");
  });

  elements.editorial.pushBrandOrbit?.addEventListener("click", () => {
    const orbitTexts = parseEditorialBlocks(elements.editorial.brandOrbitTexts?.value || "", []);
    if (!orbitTexts.length) {
      setStatus("No editorial orbit texts to push.");
      return;
    }

    if (elements.brand.orbitTexts) {
      elements.brand.orbitTexts.value = orbitTexts.join("\n");
    }

    state.brand.orbitTexts = orbitTexts;
    updateVisualState();

    if (selectedPanelTab === "brand") {
      applyState();
    }

    setStatus("Editorial orbit texts pushed into Brand Mode.");
  });

  for (const [type, config] of Object.entries(EDITORIAL_BLOCK_GROUPS)) {
    elements.editorial?.[config.containerKey]?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-editorial-block-action='remove']");

      if (!button) {
        return;
      }

      const blockIndex = Number(button.dataset.editorialBlockIndex);
      const textarea = elements.editorial?.[config.textareaKey];
      const blocks = parseEditorialBlocks(textarea?.value || "", []);

      if (!Number.isInteger(blockIndex) || blockIndex < 0 || blockIndex >= blocks.length) {
        return;
      }

      blocks.splice(blockIndex, 1);
      applyEditorialBlockTextareaChange(type, blocks);
      setStatus(`${config.title} block removed.`);
    });
  }

  elements.editorial.saveBrand?.addEventListener("click", () => {
    state.brand.editorialOverlay = {
      ...state.editorial,
      enabled: true
    };

    if (selectedPanelTab === "brand") {
      applyState();
    }

    scheduleSessionPersist();
    setStatus("Editorial composition saved for Brand Mode.");
  });

  elements.editorial.saveSystem?.addEventListener("click", () => {
    state.systemEditorialOverlay = {
      ...cloneSerializable(state.editorial),
      enabled: true,
      context: "system"
    };

    if (elements.systemEditorial.enabled) {
      elements.systemEditorial.enabled.checked = true;
    }

    syncSystemEditorialStatus();
    scheduleSessionPersist();
    setStatus("Editorial composition saved for System.");
  });

  elements.editorial.loadSystem?.addEventListener("click", () => {
    loadSystemEditorialIntoEditor();
  });

  for (const button of elements.exportButtons) {
    button.addEventListener("click", () => {
      const sourceTab = button.closest("[data-panel-pane]")?.dataset.panelPane || selectedPanelTab;
      runExport(button.dataset.export, sourceTab);
    });
  }

  elements.saved.saveButton?.addEventListener("click", () => {
    void saveCurrentComposition();
  });

  elements.saved.clearSessionButton?.addEventListener("click", () => {
    clearSessionState();
    setStatus("Auto-saved session cleared.");
  });

  elements.randomizeCompositionButton?.addEventListener("click", () => {
    randomizeCurrentComposition();
  });

  elements.invertCompositionButton?.addEventListener("click", () => {
    invertCurrentCompositionPalette();
  });

  elements.autoMotionToggle?.addEventListener("click", () => {
    state.autoMotionPaused = !state.autoMotionPaused;
    syncAutoMotionToggle();
    applyState();
    setStatus(state.autoMotionPaused ? "Automatic motion paused." : "Automatic motion resumed.");
  });

  elements.resetAllButton?.addEventListener("click", () => {
    void resetAllToDefaults();
  });

  elements.saved.list?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-saved-action]");
    const item = event.target.closest("[data-saved-id]");

    if (!button || !item) {
      return;
    }

    const preset = compositionHistory.find((entry) => entry.id === item.dataset.savedId);

    if (!preset) {
      return;
    }

    if (button.dataset.savedAction === "delete") {
      await removeSavedComposition(preset.id);
      setStatus(`Deleted composition: ${preset.name || "Untitled Composition"}.`);
      return;
    }

    try {
      setStatus(`Loading composition: ${preset.name || "Untitled Composition"}...`);
      await applySavedComposition(preset);
    } catch (error) {
      console.error(error);
      setStatus("Unable to load saved composition.");
    }
  });
}

async function init() {
  await loadCompositionHistory();
  await loadPresetLibrary();
  if (elements.presetModal.root) {
    elements.presetModal.root.hidden = true;
    elements.presetModal.root.setAttribute("aria-hidden", "true");
  }
  restoredSessionPayload = readStorage(SESSION_STORAGE_KEY, null);
  if (restoredSessionPayload?.state) {
    mergeIntoState(state, restoredSessionPayload.state);
    sanitizeLegacyEditorialDefaults(state.editorial);
    capturePersistedAssetsFromPayload(restoredSessionPayload);
    await applyPersistedFontsToUi();
    syncControlsFromStateSnapshot(state);
  }

  syncBrandExportControlsFromMain();
  syncHandExportControlsFromMain();
  syncCinematicExportControlsFromMain();
  applyUiLanguageAndHelp();
  enhanceCollapsibleGroups();
  applyPreviewAspectRatio();
  updateOutputs();
  syncAutoMotionToggle();
  syncAnimationAdvancedUi();
  renderAnimationKeyframeList();
  renderPresetLibrary();
  bindEvents();
  setPanelTab(restoredSessionPayload?.selectedPanelTab === "hand" ? "system" : (restoredSessionPayload?.selectedPanelTab || "system"));
  startLetterPanelSync();
  studio = new TypographyStudio({
    canvas: elements.canvas,
    stage: elements.stage
  });
  studio.setEditorialLayoutChangeHandler?.((layoutState) => {
    if (!layoutState) {
      return;
    }

    state.editorial.offsets = normalizeEditorialOffsets(layoutState.offsets);
    scheduleSessionPersist();
  });
  studio.setEditorialBackdropChangeHandler?.((offset) => {
    if (!Array.isArray(offset)) {
      return;
    }

    state.editorial.backdropOffset = [
      Number(offset[0] || 0),
      Number(offset[1] || 0),
      Number(offset[2] || 0)
    ];
    scheduleSessionPersist();
  });
  handControl = new HandControlManager({
    video: elements.hand.video,
    overlay: elements.hand.overlay,
    onStatus: setHandStatus,
    onUpdate: (gestureState) => {
      const handMode = elements.hand.mode?.value || "system";
      updateVisualState();

      let nextVariationIntensity = state.variation.intensity;

      if (handMode === "system") {
        nextVariationIntensity = Math.max(
          0,
          Math.min(1.5, ((gestureState.pinch + 1) * 0.5) * 1.5)
        );
        elements.controls.variationIntensity.value = String(nextVariationIntensity);
        state.variation.intensity = nextVariationIntensity;
      }

      updateOutputs();
      studio?.setHandControlState({
        ...gestureState,
        pinch: handMode === "system" ? gestureState.pinch : 0,
        rotationX: handMode === "system" ? gestureState.rotationX : 0,
        rotationY: handMode === "system" ? gestureState.rotationY : 0,
        mode: handMode,
        variationIntensity: nextVariationIntensity,
        baseVariationIntensity: handVariationBaseIntensity,
        brandNextPulse: gestureState.brandNextPulse ?? 0
      });

      if (handMode === "brand" && selectedPanelTab === "brand") {
        applyState({ persist: false });
      }
    }
  });
  await applyPersistedAssetsToStudio();
  await rebuildTypography();
  applyState({ persist: false });
  studio.animate();
}

init().catch((error) => {
  console.error(error);
  setStatus(error.message || "Unable to initialize.");
});
