import * as THREE from "three";

const LETTER_HIT_LAYER = 2;
const MASKED_IMAGE_TEXTURE_CACHE = new WeakMap();
const TEXT_POINT_TEXTURE_CACHE = new Map();

function rotateYZ(y, z, angle) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  return {
    y: y * cosA - z * sinA,
    z: y * sinA + z * cosA
  };
}

function rotateXZ(x, z, angle) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  return {
    x: x * cosA - z * sinA,
    z: x * sinA + z * cosA
  };
}

function rotateXY(x, y, angle) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  return {
    x: x * cosA - y * sinA,
    y: x * sinA + y * cosA
  };
}

function layeredNoise(x, y, z, time, random, lowIntensity, highIntensity) {
  const low =
    Math.sin(x * 0.85 + time * 0.75 + random * 11.0) *
    Math.cos(y * 0.7 - time * 0.65 + random * 7.0) *
    Math.sin(z * 0.55 + time * 0.45 + random * 5.0);

  const high =
    Math.sin(x * 4.2 + time * 1.7 + random * 19.0) *
    Math.cos(y * 4.8 - time * 1.4 + random * 17.0) *
    Math.sin(z * 4.0 + time * 1.55 + random * 13.0);

  return low * lowIntensity + high * highIntensity;
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function getAxisDistortion(global, name, fallbackName, multiplier) {
  return (global[name] ?? global[fallbackName] ?? 0) * multiplier;
}

function transformPoint(base, origin, random, revealOffset, runtime, multipliers, bounds) {
  const intro = THREE.MathUtils.clamp((runtime.intro - revealOffset) / Math.max(0.22, 1 - revealOffset), 0, 1);
  const assemble = THREE.MathUtils.lerp(1 - runtime.animation.scatter, runtime.animation.assemble, intro);
  const global = runtime.globalDistortion;
  const variationIntensity = runtime.variationIntensityMultiplier ?? 1;

  const bendX = getAxisDistortion(global, "bendX", "bend", multipliers.bendX * variationIntensity);
  const bendY = getAxisDistortion(global, "bendY", "bend", multipliers.bendY * variationIntensity);
  const bendZ = getAxisDistortion(global, "bendZ", "bend", multipliers.bendZ * variationIntensity);
  const twistX = getAxisDistortion(global, "twistX", "twist", multipliers.twistX * variationIntensity);
  const twistY = getAxisDistortion(global, "twistY", "twist", multipliers.twistY * variationIntensity);
  const twistZ = getAxisDistortion(global, "twistZ", "twist", multipliers.twistZ * variationIntensity);
  const waveBase = global.waveAmplitude ?? global.wave ?? 0;
  const waveX = waveBase * multipliers.waveX * variationIntensity;
  const waveY = waveBase * multipliers.waveY * variationIntensity;
  const waveZ = waveBase * multipliers.waveZ * variationIntensity;
  const noiseBase = global.noiseIntensity ?? global.noise ?? 0;
  const noiseLow = noiseBase * multipliers.noiseLow * variationIntensity;
  const noiseHigh = noiseBase * multipliers.noiseHigh * variationIntensity;

  let x = base.x;
  let y = base.y;
  let z = base.z;

  const nx = bounds.width ? x / Math.max(bounds.width * 0.5, 0.001) : 0;
  const ny = bounds.height ? y / Math.max(bounds.height * 0.5, 0.001) : 0;
  const nz = bounds.depth ? z / Math.max(bounds.depth * 0.5, 0.001) : 0;

  x *= 1 + multipliers.axisScale.x * variationIntensity * multipliers.axisPriority.x * (0.7 + Math.abs(ny) * 0.8);
  y *= 1 + multipliers.axisScale.y * variationIntensity * multipliers.axisPriority.y * (0.7 + Math.abs(nz) * 0.8);
  z *= 1 + multipliers.axisScale.z * variationIntensity * multipliers.axisPriority.z * (0.7 + Math.abs(nx) * 0.8);

  const skewX = multipliers.shear.xy * variationIntensity * y + multipliers.shear.xz * variationIntensity * z;
  const skewY = multipliers.shear.yx * variationIntensity * x + multipliers.shear.yz * variationIntensity * z;
  const skewZ = multipliers.shear.zx * variationIntensity * x + multipliers.shear.zy * variationIntensity * y;

  x += skewX;
  y += skewY;
  z += skewZ;

  x += bendX * (y * y * 0.22 + z * z * 0.11) * (x >= 0 ? 1 : -1);
  y += bendY * (x * x * 0.2 + z * z * 0.1) * (y >= 0 ? 1 : -1);
  z += bendZ * (x * x * 0.24 + y * y * 0.12) * (z >= 0 ? 1 : -1);

  const fieldX = multipliers.rotationField.x * variationIntensity * Math.sin((ny + nz) * 2.8 + runtime.time * 0.75 + random * 7.0);
  const fieldY = multipliers.rotationField.y * variationIntensity * Math.cos((nx + nz) * 2.6 - runtime.time * 0.65 + random * 9.0);
  const fieldZ = multipliers.rotationField.z * variationIntensity * Math.sin((nx + ny) * 3.1 + runtime.time * 0.55 + random * 13.0);

  let rotated = rotateYZ(y, z, fieldX);
  y = rotated.y;
  z = rotated.z;
  rotated = rotateXZ(x, z, fieldY);
  x = rotated.x;
  z = rotated.z;
  rotated = rotateXY(x, y, fieldZ);
  x = rotated.x;
  y = rotated.y;

  rotated = rotateYZ(y, z, twistX * nx * 1.9 + Math.sin(nz * 3.4 + random * 5.0) * twistX * 0.22);
  y = rotated.y;
  z = rotated.z;
  rotated = rotateXZ(x, z, twistY * ny * 2.1 + Math.cos(nx * 3.1 + random * 8.0) * twistY * 0.2);
  x = rotated.x;
  z = rotated.z;
  rotated = rotateXY(x, y, twistZ * nz * 1.85 + Math.sin(ny * 3.0 + random * 11.0) * twistZ * 0.18);
  x = rotated.x;
  y = rotated.y;

  x += (
    Math.sin(y * 2.1 + runtime.time * 1.25 + random * 7.0) * 0.26 +
    Math.sin(z * 5.7 - runtime.time * 0.8 + random * 12.0) * 0.14
  ) * waveX;

  y += (
    Math.cos(x * 2.7 - runtime.time * 1.0 + random * 13.0) * 0.22 +
    Math.sin(z * 4.4 + runtime.time * 0.95 + random * 9.0) * 0.14
  ) * waveY;

  z += (
    Math.sin(x * 2.25 + runtime.time * 1.35 + random * 10.0) * 0.28 +
    Math.cos(y * 5.1 - runtime.time * 1.1 + random * 14.0) * 0.16
  ) * waveZ;

  const noiseValue = layeredNoise(x, y, z, runtime.time, random, noiseLow, noiseHigh);
  x += noiseValue * 0.11 * multipliers.axisPriority.x;
  y += noiseValue * 0.09 * multipliers.axisPriority.y;
  z += noiseValue * 0.13 * multipliers.axisPriority.z;

  if (runtime.animation.glitch > 0 && random > 0.46) {
    x += Math.sin(runtime.time * 16 + random * 30.0) * runtime.animation.glitch * 0.12;
    z += Math.cos(runtime.time * 14 + random * 24.0) * runtime.animation.glitch * 0.18;
  }

  const pulseScale = 1 + runtime.animation.pulse * 0.055;
  x *= pulseScale;
  y *= pulseScale;
  z *= 1 + runtime.animation.pulse * 0.075;

  return {
    x: THREE.MathUtils.lerp(origin.x, x, assemble),
    y: THREE.MathUtils.lerp(origin.y, y, assemble),
    z: THREE.MathUtils.lerp(origin.z, z, assemble)
  };
}

function createLineLayer(width, height, color, opacity) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(), 3));

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false
  });

  const object = new THREE.LineSegments(geometry, material);
  object.frustumCulled = false;

  return { geometry, material, object };
}

function createRelationLineLayer(color, dashed = false, opacity = 0) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(), 3));

  const material = dashed
    ? new THREE.LineDashedMaterial({
        color,
        transparent: true,
        opacity,
        dashSize: 0.08,
        gapSize: 0.05,
        depthWrite: false
      })
    : new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false
      });

  const object = new THREE.LineSegments(geometry, material);
  object.frustumCulled = false;
  object.visible = false;

  return { geometry, material, object, dashed };
}

function pickSpritePointIndices(totalPoints, textureCount) {
  if (!textureCount || totalPoints <= 0) {
    return new Uint32Array();
  }

  const spriteCount = Math.min(Math.max(textureCount * 6, 12), totalPoints, 72);
  const indices = new Uint32Array(spriteCount);
  const stride = Math.max(1, Math.floor(totalPoints / spriteCount));

  for (let index = 0; index < spriteCount; index += 1) {
    indices[index] = Math.min(totalPoints - 1, index * stride);
  }

  return indices;
}

function pickInteractiveIndices(totalPoints, preferredIndices) {
  if (preferredIndices?.length) {
    return preferredIndices;
  }

  const count = Math.min(totalPoints, 48);
  const indices = new Uint32Array(count);
  const stride = Math.max(1, Math.floor(totalPoints / Math.max(count, 1)));

  for (let index = 0; index < count; index += 1) {
    indices[index] = Math.min(totalPoints - 1, index * stride);
  }

  return indices;
}

function createDynamicPointsMaterial(color, size, opacity) {
  return new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

function resolveDisplayColor(mode, colorA, colorB, random, x, y, z, bounds, target) {
  if (mode === "random") {
    const t = THREE.MathUtils.clamp(random, 0, 1);
    return target.copy(colorA).lerp(colorB, t);
  }

  if (mode === "gradient") {
    const yRange = Math.max(bounds.height * 0.5, 0.001);
    const zRange = Math.max(bounds.depth * 0.5, 0.001);
    const t = THREE.MathUtils.clamp(
      0.5 + (y / yRange) * 0.42 + (z / zRange) * 0.18,
      0,
      1
    );
    return target.copy(colorA).lerp(colorB, t);
  }

  return target.copy(colorA);
}

function easeBrandTransition(mode, t) {
  const value = THREE.MathUtils.clamp(t, 0, 1);

  if (mode === "linear") {
    return value;
  }

  if (mode === "ease-out") {
    return 1 - Math.pow(1 - value, 3);
  }

  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function getBrandMoodAdjustments(mood) {
  if (mood === "chaos") {
    return { randomness: 1.35, jitter: 1.6, speed: 1.2, dominance: 0.92, suppression: 0.55, density: 1.15 };
  }

  if (mood === "tech") {
    return { randomness: 0.72, jitter: 0.55, speed: 0.88, dominance: 1.08, suppression: 0.68, density: 1.05 };
  }

  if (mood === "campaign") {
    return { randomness: 0.9, jitter: 0.8, speed: 0.94, dominance: 1.12, suppression: 0.6, density: 0.92 };
  }

  return { randomness: 0.5, jitter: 0.35, speed: 0.7, dominance: 1.18, suppression: 0.82, density: 0.72 };
}

function getBrandOutputFrame(outputPreset, exportRatio = "current") {
  let presetFrame;

  if (outputPreset === "story") {
    presetFrame = { xScale: 0.78, yScale: 1.12, heroOffsetX: 0, heroOffsetY: 0.18 };
  } else if (outputPreset === "hero-banner") {
    presetFrame = { xScale: 1.22, yScale: 0.78, heroOffsetX: 0.08, heroOffsetY: -0.04 };
  } else if (outputPreset === "square-post") {
    presetFrame = { xScale: 0.94, yScale: 0.94, heroOffsetX: 0, heroOffsetY: 0.04 };
  } else {
    presetFrame = { xScale: 0.9, yScale: 1.06, heroOffsetX: 0, heroOffsetY: 0.08 };
  }

  let ratioFrame = {
    xScale: 1,
    yScale: 1,
    heroOffsetX: 0,
    heroOffsetY: 0,
    orbitRadiusScale: 1,
    orbitSpacingScale: 1,
    depthSpreadScale: 1
  };

  if (exportRatio === "1:1") {
    ratioFrame = {
      xScale: 0.86,
      yScale: 0.88,
      heroOffsetX: 0,
      heroOffsetY: -0.02,
      orbitRadiusScale: 0.8,
      orbitSpacingScale: 0.84,
      depthSpreadScale: 0.88
    };
  } else if (exportRatio === "4:5") {
    ratioFrame = {
      xScale: 0.9,
      yScale: 0.98,
      heroOffsetX: 0,
      heroOffsetY: 0.04,
      orbitRadiusScale: 0.88,
      orbitSpacingScale: 0.9,
      depthSpreadScale: 0.94
    };
  } else if (exportRatio === "16:9") {
    ratioFrame = {
      xScale: 1.12,
      yScale: 0.86,
      heroOffsetX: 0.06,
      heroOffsetY: -0.02,
      orbitRadiusScale: 1.06,
      orbitSpacingScale: 0.94,
      depthSpreadScale: 1.06
    };
  } else if (exportRatio === "9:16") {
    ratioFrame = {
      xScale: 0.76,
      yScale: 1.14,
      heroOffsetX: 0,
      heroOffsetY: 0.14,
      orbitRadiusScale: 0.74,
      orbitSpacingScale: 0.82,
      depthSpreadScale: 0.92
    };
  }

  return {
    xScale: presetFrame.xScale * ratioFrame.xScale,
    yScale: presetFrame.yScale * ratioFrame.yScale,
    heroOffsetX: presetFrame.heroOffsetX + ratioFrame.heroOffsetX,
    heroOffsetY: presetFrame.heroOffsetY + ratioFrame.heroOffsetY,
    orbitRadiusScale: ratioFrame.orbitRadiusScale,
    orbitSpacingScale: ratioFrame.orbitSpacingScale,
    depthSpreadScale: ratioFrame.depthSpreadScale
  };
}

function getEditorialTemplateAdjustments(template) {
  if (template === "sale-poster") {
    return { heroScale: 0.92, mediaScale: 0.9, heroOpacity: 1, labelsOffsetY: 0.06, infoScale: 1.08 };
  }
  if (template === "gallery-announcement") {
    return { heroScale: 0.82, mediaScale: 0.82, heroOpacity: 0.92, labelsOffsetY: 0.14, infoScale: 0.96 };
  }
  if (template === "fashion-brand-card") {
    return { heroScale: 0.9, mediaScale: 0.88, heroOpacity: 0.96, labelsOffsetY: 0.02, infoScale: 1 };
  }
  if (template === "minimalist-editorial") {
    return { heroScale: 0.74, mediaScale: 0.7, heroOpacity: 0.9, labelsOffsetY: 0.16, infoScale: 0.9 };
  }
  return { heroScale: 1, mediaScale: 1, heroOpacity: 1, labelsOffsetY: 0, infoScale: 1 };
}

function getEditorialLayoutFrame(layout, aspect = 1) {
  const safeAspect = Math.max(0.4, Math.min(2.2, aspect || 1));

  if (layout === "offset-hero") {
    return {
      hero: new THREE.Vector3(-0.48 * safeAspect, 0.16, 0.15),
      media: new THREE.Vector3(0.22, -0.22, 0),
      labels: new THREE.Vector3(0, 1.28, 0.16),
      info: new THREE.Vector3(1.32, -0.44, 0.3),
      secondary: new THREE.Vector3(1.28, -1.2, 0.32)
    };
  }

  if (layout === "frame-editorial") {
    return {
      hero: new THREE.Vector3(0.08, 0.28, 0.2),
      media: new THREE.Vector3(-0.12, -0.28, 0),
      labels: new THREE.Vector3(0, 1.36, 0.16),
      info: new THREE.Vector3(1.42, 0.62, 0.32),
      secondary: new THREE.Vector3(-1.46, -1.18, 0.32)
    };
  }

  if (layout === "image-overlay") {
    return {
      hero: new THREE.Vector3(0.18, 0.02, 0.16),
      media: new THREE.Vector3(0, -0.1, 0.04),
      labels: new THREE.Vector3(0, 1.34, 0.18),
      info: new THREE.Vector3(1.36, -0.54, 0.3),
      secondary: new THREE.Vector3(1.28, -1.24, 0.34)
    };
  }

  return {
    hero: new THREE.Vector3(0, 0.08, 0.16),
    media: new THREE.Vector3(0, -0.24, 0),
    labels: new THREE.Vector3(0, 1.34, 0.16),
    info: new THREE.Vector3(1.36, -0.46, 0.28),
    secondary: new THREE.Vector3(1.28, -1.2, 0.32)
  };
}

function getEditorialGridColumns(preset) {
  if (preset === "4-column") {
    return [-0.75, -0.25, 0.25, 0.75];
  }
  if (preset === "asymmetrical") {
    return [-0.62, -0.12, 0.34];
  }
  if (preset === "poster") {
    return [-0.7, -0.18, 0.18, 0.7];
  }
  if (preset === "fashion-spread") {
    return [-0.8, -0.3, 0.2, 0.62];
  }
  return [-0.4, 0.4];
}

function hash01(value) {
  return (Math.sin(value * 127.1 + 311.7) * 43758.5453123) % 1;
}

function normalizeContentConfig(contentConfig = {}) {
  const density = THREE.MathUtils.clamp(Number(contentConfig.density ?? 0), 0, 1);
  const fillPoints = THREE.MathUtils.clamp(Number(contentConfig.fillPoints ?? 0), 0, 1);
  const hoverScale = THREE.MathUtils.clamp(Number(contentConfig.hoverScale ?? 220), 32, 15000);
  const imageRatio = Math.max(0, Number(contentConfig.imageRatio ?? 55));
  const textRatio = Math.max(0, Number(contentConfig.textRatio ?? 30));
  const emptyRatio = Math.max(0, Number(contentConfig.emptyRatio ?? 15));
  const total = Math.max(1, imageRatio + textRatio + emptyRatio);

  return {
    density,
    fillPoints,
    hoverScale,
    imageRatio: imageRatio / total,
    textRatio: textRatio / total,
    emptyRatio: emptyRatio / total,
    layoutMode: contentConfig.layoutMode || "field",
    onlyMode: Boolean(contentConfig.onlyMode),
    onlyType: contentConfig.onlyType || "mixed",
    texts: Array.isArray(contentConfig.texts) ? contentConfig.texts : [],
    textFontFamily: contentConfig.textFontFamily || "Space Grotesk",
    textUppercase: contentConfig.textUppercase !== false,
    textBackground: contentConfig.textBackground !== false,
    textColor: contentConfig.textColor || "#050505",
    textBackgroundColor: contentConfig.textBackgroundColor || "#ffffff"
  };
}

function buildRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawTrackedTextWithRenderer(context, text, x, y, align, tracking = 0, renderGlyph) {
  const content = String(text || "");

  if (!tracking) {
    if (renderGlyph) {
      let cursorX = x;
      if (align === "center") {
        cursorX = x - context.measureText(content).width * 0.5;
      } else if (align === "right") {
        cursorX = x - context.measureText(content).width;
      }
      let localCursor = cursorX;
      for (const glyph of [...content]) {
        renderGlyph(glyph, localCursor, y);
        localCursor += context.measureText(glyph).width;
      }
      return;
    }
    context.fillText(content, x, y);
    return;
  }

  const glyphs = [...content];
  const widths = glyphs.map((glyph) => context.measureText(glyph).width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + tracking * Math.max(0, glyphs.length - 1);
  let cursorX = align === "left"
    ? x
    : align === "right"
      ? x - totalWidth
      : x - totalWidth * 0.5;

  for (let index = 0; index < glyphs.length; index += 1) {
    const glyph = glyphs[index];
    if (renderGlyph) {
      renderGlyph(glyph, cursorX, y);
    } else {
      context.fillText(glyph, cursorX, y);
    }
    cursorX += widths[index] + tracking;
  }
}

function drawTrackedText(context, text, x, y, align, tracking = 0) {
  drawTrackedTextWithRenderer(context, text, x, y, align, tracking, null);
}

function createMaskedImageTexture(sourceTexture) {
  if (!sourceTexture) {
    return null;
  }

  const cached = MASKED_IMAGE_TEXTURE_CACHE.get(sourceTexture);

  if (cached) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (!context) {
    return sourceTexture;
  }

  const image = sourceTexture.image;
  const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (canvas.width - drawWidth) / 2;
  const offsetY = (canvas.height - drawHeight) / 2;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.beginPath();
  context.arc(canvas.width / 2, canvas.height / 2, canvas.width * 0.46, 0, Math.PI * 2);
  context.closePath();
  context.clip();
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.userData.sharedContentTexture = true;
  MASKED_IMAGE_TEXTURE_CACHE.set(sourceTexture, texture);
  return texture;
}

function createBrandImageTexture(sourceTexture) {
  if (!sourceTexture) {
    return null;
  }

  const texture = sourceTexture.clone();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createTextPointTexture(text, color, options = {}) {
  const fallbackColor = color instanceof THREE.Color ? color.getStyle() : (color || "#050505");
  const resolvedColor = new THREE.Color(options.textColor || fallbackColor);
  const normalizedText = options.uppercase === false
    ? String(text || "Text")
    : String(text || "TEXT").toUpperCase();
  const fontFamily = options.fontFamily || '"Space Grotesk", "Arial Black", sans-serif';
  const backgroundEnabled = options.background !== false;
  const backgroundColor = options.backgroundColor || "#ffffff";
  const cacheKey = `${normalizedText}::${resolvedColor.getStyle()}::${fontFamily}::${backgroundEnabled ? 1 : 0}::${backgroundColor}`;
  const cached = TEXT_POINT_TEXTURE_CACHE.get(cacheKey);

  if (cached) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,0)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (backgroundEnabled) {
    buildRoundedRect(context, 18, 42, canvas.width - 36, canvas.height - 84, 36);
    const bg = new THREE.Color(backgroundColor);
    context.fillStyle = `rgba(${Math.round(bg.r * 255)},${Math.round(bg.g * 255)},${Math.round(bg.b * 255)},0.92)`;
    context.fill();
  }
  context.font = `700 96px ${fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = resolvedColor.getStyle();
  context.fillText(normalizedText, canvas.width / 2, canvas.height / 2 + 6);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.userData.sharedContentTexture = true;
  TEXT_POINT_TEXTURE_CACHE.set(cacheKey, texture);
  return texture;
}

function createBrandTextTexture(text, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const fontSize = Math.max(24, Number(options.fontSize) || 108);
  const align = options.align || "center";
  const color = options.color || "#f5f2ed";
  const lineHeight = Math.max(0.65, Number(options.lineHeight) || 0.95);
  const letterSpacing = Number(options.letterSpacing) || 0;
  const opacity = THREE.MathUtils.clamp(Number(options.opacity ?? 1), 0, 1);
  const showPanel = options.panel !== false;
  const backgroundOpacity = THREE.MathUtils.clamp(Number(options.backgroundOpacity ?? 0.88), 0, 1);
  const strokeOpacity = THREE.MathUtils.clamp(Number(options.strokeOpacity ?? 0.08), 0, 1);

  context.clearRect(0, 0, canvas.width, canvas.height);
  if (showPanel) {
    context.fillStyle = `rgba(8,8,8,${backgroundOpacity})`;
    buildRoundedRect(context, 24, 44, canvas.width - 48, canvas.height - 88, 38);
    context.fill();
    context.strokeStyle = `rgba(255,255,255,${strokeOpacity})`;
    context.lineWidth = 2;
    context.stroke();
  }
  context.font = `700 ${fontSize}px "Space Grotesk", "Arial Black", sans-serif`;
  context.textBaseline = "middle";
  context.textAlign = align;
  context.fillStyle = new THREE.Color(color).getStyle();
  context.globalAlpha = opacity;
  const x = align === "left" ? 88 : align === "right" ? canvas.width - 88 : canvas.width / 2;
  const lines = String(text || "BRAND").toUpperCase().split(/\n+/).slice(0, 3);
  const resolvedLineHeight = fontSize * lineHeight;
  const startY = canvas.height / 2 - ((lines.length - 1) * resolvedLineHeight) / 2;

  for (let index = 0; index < lines.length; index += 1) {
    drawTrackedText(context, lines[index], x, startY + index * resolvedLineHeight, align, letterSpacing);
  }
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function createEditorialTextTexture(text, options = {}) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => options.uppercase === true ? line.toUpperCase() : line);
  const hasVisibleContent = lines.some((line) => line.trim().length > 0);

  if (!hasVisibleContent) {
    return null;
  }

  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");

  if (!measureContext) {
    return null;
  }

  const fontFamily = options.fontFamily || '"Cormorant Garamond", "Times New Roman", serif';
  const fontWeight = options.fontWeight || 600;
  const fontSize = Math.max(12, Number(options.fontSize) || 180);
  const align = options.align || "center";
  const color = options.color || "#ffffff";
  const lineHeight = Math.max(0.7, Number(options.lineHeight) || 0.9);
  const letterSpacing = Number(options.letterSpacing) || 0;
  const opacity = THREE.MathUtils.clamp(Number(options.opacity ?? 1), 0, 1);
  const panel = Boolean(options.panel);
  const border = options.border !== false;
  const paddingX = Math.max(0, Number(options.paddingX ?? options.padding ?? 0));
  const paddingY = Math.max(0, Number(options.paddingY ?? options.padding ?? 0));
  const backgroundOpacity = THREE.MathUtils.clamp(Number(options.backgroundOpacity ?? 0), 0, 1);
  const backgroundColor = options.backgroundColor || "#000000";
  const minWidth = Number(options.width) || 0;
  const minHeight = Number(options.height) || 0;
  const style = options.style || "fill";
  const outlineThickness = Math.max(0, Number(options.outlineThickness ?? 2));
  const duplicateOffsetX = Number(options.duplicateOffsetX ?? 16);
  const duplicateOffsetY = Number(options.duplicateOffsetY ?? 10);
  const shadowOpacity = THREE.MathUtils.clamp(Number(options.shadowOpacity ?? 0.2), 0, 1);
  const mask = options.mask || null;
  const requestedResolutionScale = THREE.MathUtils.clamp(Number(options.resolutionScale ?? 0) || 0, 0, 4);

  measureContext.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const widestLine = lines.reduce((maxWidth, line) => {
    const measured = measureContext.measureText(line).width + Math.max(0, line.length - 1) * letterSpacing;
    return Math.max(maxWidth, measured);
  }, 0);
  const resolvedLineHeight = fontSize * lineHeight;
  const contentWidth = widestLine + paddingX * 2 + 96;
  const contentHeight = lines.length * resolvedLineHeight + paddingY * 2 + 72;

  const logicalWidth = Math.max(256, Math.ceil(Math.max(minWidth, contentWidth)));
  const logicalHeight = Math.max(128, Math.ceil(Math.max(minHeight, contentHeight)));
  const smallTextBoost = fontSize <= 64
    ? THREE.MathUtils.mapLinear(fontSize, 12, 64, 2.2, 0.25)
    : 0;
  const autoResolutionScale = THREE.MathUtils.clamp(
    2 + fontSize / 220 + Math.max(logicalWidth / 2200, logicalHeight / 1500) + smallTextBoost,
    2,
    5.4
  );
  let resolutionScale = requestedResolutionScale > 0 ? requestedResolutionScale : autoResolutionScale;
  resolutionScale = Math.min(
    resolutionScale,
    8192 / Math.max(logicalWidth, 1),
    8192 / Math.max(logicalHeight, 1)
  );
  resolutionScale = THREE.MathUtils.clamp(resolutionScale, 1, 6);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(256, Math.floor(logicalWidth * resolutionScale));
  canvas.height = Math.max(128, Math.floor(logicalHeight * resolutionScale));
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.setTransform(resolutionScale, 0, 0, resolutionScale, 0, 0);
  context.clearRect(0, 0, logicalWidth, logicalHeight);

  if (panel) {
    const x = paddingX || 22;
    const y = paddingY || 22;
    const width = logicalWidth - x * 2;
    const height = logicalHeight - y * 2;
    if (backgroundOpacity > 0) {
      const bg = new THREE.Color(backgroundColor);
      context.fillStyle = `rgba(${Math.round(bg.r * 255)},${Math.round(bg.g * 255)},${Math.round(bg.b * 255)},${backgroundOpacity})`;
      context.fillRect(x, y, width, height);
    }
    if (border) {
      context.strokeStyle = "rgba(255,255,255,0.38)";
      context.lineWidth = 2;
      context.strokeRect(x, y, width, height);
    }
  }

  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  context.textBaseline = "middle";
  context.textAlign = align;
  context.fillStyle = new THREE.Color(color).getStyle();
  context.globalAlpha = opacity;

  const x = align === "left" ? paddingX + 40 : align === "right" ? logicalWidth - paddingX - 40 : logicalWidth / 2;
  const startY = logicalHeight / 2 - ((lines.length - 1) * resolvedLineHeight) / 2;

  const drawStyledGlyph = (glyph, gx, gy) => {
    if (style === "shadow-duplicate") {
      context.save();
      context.globalAlpha = opacity * shadowOpacity;
      context.fillStyle = "rgba(255,255,255,0.18)";
      context.fillText(glyph, gx + duplicateOffsetX, gy + duplicateOffsetY);
      context.restore();
    } else if (style === "offset-duplicate") {
      context.save();
      context.globalAlpha = opacity * 0.44;
      context.fillStyle = new THREE.Color(color).offsetHSL(0, 0, -0.18).getStyle();
      context.fillText(glyph, gx + duplicateOffsetX, gy + duplicateOffsetY);
      context.restore();
    }

    if (style !== "outline-only") {
      context.fillText(glyph, gx, gy);
    }

    if (style === "outline-only" || style === "fill-outline" || style === "double-outline" || style === "inline") {
      context.save();
      context.lineJoin = "round";
      context.miterLimit = 2;
      context.strokeStyle = new THREE.Color(color).getStyle();
      context.lineWidth = style === "inline"
        ? Math.max(1, outlineThickness * 0.5)
        : Math.max(1, outlineThickness);
      context.strokeText(glyph, gx, gy);
      if (style === "double-outline") {
        context.globalAlpha = opacity * 0.34;
        context.lineWidth = Math.max(context.lineWidth + 2, outlineThickness * 1.8);
        context.strokeText(glyph, gx, gy);
      }
      context.restore();
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    drawTrackedTextWithRenderer(
      context,
      lines[index],
      x,
      startY + index * resolvedLineHeight,
      align,
      letterSpacing,
      drawStyledGlyph
    );
  }

  if (mask?.enabled) {
    const maskedCanvas = document.createElement("canvas");
      maskedCanvas.width = canvas.width;
      maskedCanvas.height = canvas.height;
      const maskedContext = maskedCanvas.getContext("2d");

      if (maskedContext) {
        maskedContext.drawImage(canvas, 0, 0);
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width * (0.5 + Number(mask.x ?? 0) * 0.3);
      const centerY = canvas.height * (0.5 - Number(mask.y ?? 0) * 0.3);
      const maskWidth = canvas.width * THREE.MathUtils.clamp(Number(mask.width ?? 0.65), 0.08, 1.2);
      const maskHeight = canvas.height * THREE.MathUtils.clamp(Number(mask.height ?? 0.42), 0.08, 1.2);
      const left = centerX - maskWidth * 0.5;
      const top = centerY - maskHeight * 0.5;

      if (mask.type === "vertical-crop") {
        context.drawImage(maskedCanvas, left, 0, maskWidth, canvas.height, left, 0, maskWidth, canvas.height);
      } else if (mask.type === "horizontal-crop") {
        context.drawImage(maskedCanvas, 0, top, canvas.width, maskHeight, 0, top, canvas.width, maskHeight);
      } else {
        context.save();
        context.beginPath();
        context.rect(left, top, maskWidth, maskHeight);
        context.clip();
        context.drawImage(maskedCanvas, 0, 0);
        context.restore();

        if (mask.type === "soft-rectangle") {
          context.save();
          context.globalCompositeOperation = "destination-in";
          const gradient = context.createLinearGradient(left, top, left + maskWidth, top + maskHeight);
          gradient.addColorStop(0, "rgba(255,255,255,0)");
          gradient.addColorStop(0.18, "rgba(255,255,255,1)");
          gradient.addColorStop(0.82, "rgba(255,255,255,1)");
          gradient.addColorStop(1, "rgba(255,255,255,0)");
          context.fillStyle = gradient;
          context.fillRect(left, top, maskWidth, maskHeight);
          context.restore();
        }
      }
    }
  }

  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

function createEditorialLabelsTexture(labels, options = {}) {
  const items = (labels || []).map((item) => String(item).trim()).filter(Boolean);

  if (!items.length) {
    return null;
  }

  const baseScale = Number(options.resolutionScale ?? 2.2);
  const smallLabelBoost = fontSize <= 24 ? THREE.MathUtils.mapLinear(fontSize, 10, 24, 1.8, 0.2) : 0;
  const resolutionScale = THREE.MathUtils.clamp(baseScale + smallLabelBoost, 1.5, 5.4);
  const logicalWidth = 2048;
  const logicalHeight = 220;
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(logicalWidth * resolutionScale);
  canvas.height = Math.floor(logicalHeight * resolutionScale);
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const fontFamily = options.fontFamily || '"Space Grotesk", "Helvetica Neue", sans-serif';
  const fontSize = Math.max(10, Number(options.fontSize) || 24);
  const tracking = Number(options.letterSpacing) || 14;
  const align = options.align || "spread";
  const color = options.color || "#ffffff";

  context.setTransform(resolutionScale, 0, 0, resolutionScale, 0, 0);
  context.clearRect(0, 0, logicalWidth, logicalHeight);
  context.font = `500 ${fontSize}px ${fontFamily}`;
  context.textBaseline = "middle";
  context.fillStyle = new THREE.Color(color).getStyle();

  if (align === "spread") {
    const padding = 76;
    const usableWidth = logicalWidth - padding * 2;
    items.forEach((label, index) => {
      const x = items.length === 1 ? logicalWidth / 2 : padding + (usableWidth * index) / Math.max(items.length - 1, 1);
      drawTrackedText(context, label.toUpperCase(), x, logicalHeight / 2, "center", tracking);
    });
  } else {
    context.textAlign = align;
    const x = align === "left" ? 76 : align === "right" ? logicalWidth - 76 : logicalWidth / 2;
    const spacing = Math.max(30, Number(options.spacing || 0.75) * 80);
    let cursorY = logicalHeight / 2;
    let cursorX = x;
    items.forEach((label, index) => {
      drawTrackedText(context, label.toUpperCase(), cursorX, cursorY, align, tracking);
      if (align === "left") {
        cursorX += context.measureText(label).width + spacing;
      } else if (align === "right") {
        cursorX -= context.measureText(label).width + spacing;
      } else {
        cursorY += index === 0 ? 0 : 0;
        cursorX = x + (index - (items.length - 1) * 0.5) * spacing * 2.2;
      }
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

function createOutlineFragmentTexture(color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = color.getStyle();
  context.lineWidth = 14;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(52, 174);
  context.lineTo(84, 84);
  context.lineTo(176, 74);
  context.lineTo(206, 150);
  context.lineTo(142, 196);
  context.lineTo(78, 186);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function buildContentDefinitions(totalPoints, imageTextures, contentConfig, color) {
  const normalized = normalizeContentConfig(contentConfig);
  const definitions = [];
  const evaluateAllPoints = normalized.fillPoints > 0.001;
  const candidateCount = evaluateAllPoints ? totalPoints : Math.min(totalPoints, 180);
  const stride = Math.max(1, Math.floor(totalPoints / Math.max(candidateCount, 1)));
  let imageCursor = 0;
  let textCursor = 0;

  for (let index = 0; index < candidateCount; index += 1) {
    const pointIndex = evaluateAllPoints
      ? index
      : Math.min(totalPoints - 1, index * stride);
    const densityRoll = ((hash01(pointIndex + 0.37) + 1) % 1);
    const forcedImageRoll = ((hash01(pointIndex * 2.41 + 0.19) + 1) % 1);
    const forceImage = imageTextures.length > 0 && forcedImageRoll < normalized.fillPoints;

    if (!forceImage && densityRoll > normalized.density) {
      continue;
    }

    const typeRoll = ((hash01(pointIndex * 1.93 + 0.71) + 1) % 1);
    const hasImages = imageTextures.length > 0;
    const hasTexts = normalized.texts.length > 0;
    let type = "empty";

    if (forceImage) {
      type = "image";
    } else if (typeRoll < normalized.imageRatio && hasImages) {
      type = "image";
    } else if (typeRoll < normalized.imageRatio + normalized.textRatio && hasTexts) {
      type = "text";
    } else if (typeRoll < normalized.imageRatio + normalized.textRatio + normalized.emptyRatio) {
      type = "empty";
    } else if (hasImages) {
      type = "image";
    } else if (hasTexts) {
      type = "text";
    }

    if (type === "empty") {
      continue;
    }

    if (type === "image") {
      const sourceTexture = imageTextures[imageCursor % imageTextures.length];
      imageCursor += 1;
      definitions.push({
        type,
        pointIndex,
        texture: createMaskedImageTexture(sourceTexture),
        baseScale: 0.07,
        fullScale: 0.84
      });
      continue;
    }

    const text = normalized.texts[textCursor % normalized.texts.length];
    textCursor += 1;
    definitions.push({
      type: "text",
      pointIndex,
      texture: createTextPointTexture(text, color, {
        fontFamily: `"${normalized.textFontFamily || "Space Grotesk"}", "Arial Black", sans-serif`,
        uppercase: normalized.textUppercase,
        background: normalized.textBackground,
        textColor: normalized.textColor,
        backgroundColor: normalized.textBackgroundColor
      }),
      text,
      baseScale: 0.085,
      fullScale: 1.08
    });
  }

  return definitions;
}

function getContentItemCategory(item, index) {
  if (item.type === "text") {
    return 0;
  }

  if (item.type === "image") {
    return 1;
  }

  return 2 + (index % 3);
}

function getContentImportance(item) {
  if (!item) {
    return 0.4;
  }

  if (item.type === "text") {
    return 0.9;
  }

  if (item.type === "image") {
    return 0.68;
  }

  return 0.45;
}

function matchesFilterKind(filterKind, category, itemType) {
  if (!filterKind || filterKind === "all") {
    return true;
  }

  if (filterKind === "text") {
    return itemType === "text";
  }

  if (filterKind === "image") {
    return itemType === "image";
  }

  if (filterKind.startsWith("category-")) {
    return category === Number(filterKind.slice("category-".length));
  }

  return true;
}

function buildLetterSegmentation(label, pointPositions, meshPositions, outlinePoints, letterGuides = null) {
  const characters = [...String(label || "TEST")].filter((character) => !/\s/.test(character));
  const letterCount = Math.max(1, characters.length);

  const normalizedGuides = Array.isArray(letterGuides) && letterGuides.length === letterCount
    ? letterGuides.map((guide) => ({
        x: Number(guide?.x || 0),
        y: Number(guide?.y || 0)
      }))
    : null;

  const collectXs = (positions) => {
    const xs = [];

    for (let index = 0; index < positions.length; index += 3) {
      const x = positions[index];

      if (Number.isFinite(x)) {
        xs.push(x);
      }
    }

    return xs;
  };

  const buildThresholds = (positions) => {
    const xs = collectXs(positions).sort((a, b) => a - b);

    if (!xs.length || letterCount <= 1) {
      return [];
    }

    const minX = xs[0];
    const maxX = xs[xs.length - 1];

    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || Math.abs(maxX - minX) < 0.001) {
      return [];
    }

    const centers = Array.from({ length: letterCount }, (_, index) =>
      THREE.MathUtils.lerp(minX, maxX, letterCount === 1 ? 0.5 : index / (letterCount - 1))
    );

    for (let iteration = 0; iteration < 10; iteration += 1) {
      const sums = new Float64Array(letterCount);
      const counts = new Uint32Array(letterCount);

      for (const x of xs) {
        let nearestIndex = 0;
        let nearestDistance = Math.abs(x - centers[0]);

        for (let centerIndex = 1; centerIndex < centers.length; centerIndex += 1) {
          const distance = Math.abs(x - centers[centerIndex]);

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = centerIndex;
          }
        }

        sums[nearestIndex] += x;
        counts[nearestIndex] += 1;
      }

      for (let centerIndex = 0; centerIndex < centers.length; centerIndex += 1) {
        if (counts[centerIndex] > 0) {
          centers[centerIndex] = sums[centerIndex] / counts[centerIndex];
        }
      }

      centers.sort((a, b) => a - b);
    }

    const thresholds = [];

    for (let index = 0; index < centers.length - 1; index += 1) {
      thresholds.push((centers[index] + centers[index + 1]) * 0.5);
    }

    return thresholds;
  };

  const assignMap = (positions, thresholds) => {
    const map = new Uint16Array(Math.max(0, positions.length / 3));

    for (let pointIndex = 0; pointIndex < map.length; pointIndex += 1) {
      const x = positions[pointIndex * 3];

      if (normalizedGuides) {
        const y = positions[pointIndex * 3 + 1];
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        for (let guideIndex = 0; guideIndex < normalizedGuides.length; guideIndex += 1) {
          const guide = normalizedGuides[guideIndex];
          const dx = x - guide.x;
          const dy = y - guide.y;
          const distance = dx * dx + dy * dy * 0.7;

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = guideIndex;
          }
        }

        map[pointIndex] = nearestIndex;
        continue;
      }

      let letterIndex = 0;

      while (letterIndex < thresholds.length && x > thresholds[letterIndex]) {
        letterIndex += 1;
      }

      map[pointIndex] = Math.min(letterCount - 1, letterIndex);
    }

    return map;
  };

  const thresholds = buildThresholds(pointPositions);

  return {
    count: letterCount,
    pointMap: assignMap(pointPositions, thresholds),
    meshMap: assignMap(meshPositions, thresholds),
    outlineMap: assignMap(outlinePoints, thresholds)
  };
}

function buildAxisMeta(count, randomSource, contentIndexMap = null, contentItems = []) {
  const categories = new Float32Array(count);
  const importances = new Float32Array(count);
  const hierarchies = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const random = randomSource[index] ?? (((hash01(index * 1.37) + 1) % 1));
    const contentIndex = contentIndexMap?.get(index);
    const item = Number.isInteger(contentIndex) ? contentItems[contentIndex] : null;
    categories[index] = item ? getContentItemCategory(item, contentIndex) : Math.floor(random * 4);
    importances[index] = item
      ? item.type === "text"
        ? 0.9
        : item.type === "image"
          ? 0.68
          : 0.45
      : 0.22 + random * 0.72;
    hierarchies[index] = (index / Math.max(count - 1, 1)) * 0.55 + random * 0.45;
  }

  return { categories, importances, hierarchies };
}

function resolveAxisPosition(baseX, baseY, baseZ, index, axisMeta, runtime, target) {
  const category = axisMeta.categories[index];
  const importance = axisMeta.importances[index];
  const hierarchy = axisMeta.hierarchies[index];
  const groupX = (category - 1.5) * 0.96;
  const groupY = (importance - 0.5) * 2.5;
  const groupZ = -(hierarchy - 0.5) * 2.2;
  const drift = Math.sin(runtime.time * 0.1 + index * 0.05) * 0.04;

  target.set(
    groupX + baseX * 0.1 + drift,
    groupY + baseY * 0.08,
    groupZ + baseZ * 0.12 + Math.cos(runtime.time * 0.08 + index * 0.04) * 0.03
  );

  return target;
}

export class TypographyVariant {
  constructor(data, settings, width, height, pointImageTextures = [], contentConfig = {}) {
    this.data = data;
    this.settings = settings;
    this.group = new THREE.Group();
    this.group.layers.enable(1);
    this.group.position.copy(settings.position);
    this.group.rotation.copy(settings.rotation);
    this.group.scale.setScalar(settings.scale);
    this.resolution = { width, height };

    this.pointCurrent = new Float32Array(data.pointPositions);
    this.outlineBase = data.outlinePoints?.length ? data.outlinePoints : data.wirePositions;
    this.outlineOrigins = data.outlineOrigins?.length ? data.outlineOrigins : data.wireOrigins;
    this.outlineRandoms = data.outlineRandoms?.length ? data.outlineRandoms : data.wireRandoms;
    this.outlineDelays = data.outlineDelays?.length ? data.outlineDelays : data.wireDelays;
    this.outlineSegments = data.outlineSegments?.length
      ? data.outlineSegments
      : (() => {
          const segments = [];
          for (let index = 0; index < data.wirePositions.length / 3; index += 2) {
            segments.push(index, index + 1);
          }
          return new Uint32Array(segments);
        })();
    this.outlineCurrent = new Float32Array(this.outlineBase);
    this.wireCurrent = new Float32Array(this.outlineSegments.length * 3);
    this.meshCurrent = new Float32Array(data.meshPositions);

    this.pointGeometry = new THREE.BufferGeometry();
    this.pointAttribute = new THREE.BufferAttribute(this.pointCurrent, 3);
    this.pointAttribute.setUsage(THREE.DynamicDrawUsage);
    this.pointGeometry.setAttribute("position", this.pointAttribute);
    this.pointColors = new Float32Array(this.pointCurrent.length);
    this.pointColorAttribute = new THREE.BufferAttribute(this.pointColors, 3);
    this.pointColorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.pointGeometry.setAttribute("color", this.pointColorAttribute);
    this.pointGeometry.computeBoundingSphere();

    this.pointMaterial = new THREE.PointsMaterial({
      color: "#ffffff",
      size: 0.055,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });
    this.pointObject = new THREE.Points(this.pointGeometry, this.pointMaterial);
    this.group.add(this.pointObject);

    this.pointImageTextures = pointImageTextures;
    this.contentConfig = normalizeContentConfig(contentConfig);
    this.generatedContentTextures = [];
    this.pointSpriteGroup = new THREE.Group();
    this.pointSpriteGroup.layers.enable(2);
    const contentDefinitions = buildContentDefinitions(
      this.data.pointPositions.length / 3,
      pointImageTextures,
      this.contentConfig,
      settings.color
    );
    this.pointSpriteIndices = new Uint32Array(contentDefinitions.map((item) => item.pointIndex));
    this.pointSprites = [];
    this.pointSpritePointIndexMap = new Map();
    this.brandHeroOffset = new THREE.Vector3();
    this.brandDrag = null;
    this.focusedSpriteIndex = -1;
    this.frozenLayoutOffsets = [];
    this.contentCurrentPositions = [];
    this.contentCurrentScales = [];
    this.contentCurrentOpacities = [];
    this.contentCurrentRotations = [];
    this.contentRandomVectors = [];
    this.contentOnlyConfig = {
      enabled: Boolean(this.contentConfig.onlyMode),
      type: this.contentConfig.onlyType || "mixed"
    };

    for (let index = 0; index < contentDefinitions.length; index += 1) {
      const definition = contentDefinitions[index];
      const texture = definition.texture;

      if (!texture) {
        continue;
      }

      this.generatedContentTextures.push(texture);
      const mutationTextTexture = definition.type === "text"
        ? texture
        : createTextPointTexture(
            this.contentConfig.texts[index % Math.max(this.contentConfig.texts.length, 1)] || "TEXT",
            settings.color,
            {
              fontFamily: `"${this.contentConfig.textFontFamily || "Space Grotesk"}", "Arial Black", sans-serif`,
              uppercase: this.contentConfig.textUppercase,
              background: this.contentConfig.textBackground,
              textColor: this.contentConfig.textColor,
              backgroundColor: this.contentConfig.textBackgroundColor
            }
          );
      const mutationImageTexture = definition.type === "image"
        ? texture
        : (pointImageTextures.length ? createMaskedImageTexture(pointImageTextures[index % pointImageTextures.length]) : texture);
      const fragmentTexture = createOutlineFragmentTexture(settings.color);

      if (mutationTextTexture && mutationTextTexture !== texture) {
        this.generatedContentTextures.push(mutationTextTexture);
      }

      if (mutationImageTexture && mutationImageTexture !== texture && mutationImageTexture !== mutationTextTexture) {
        this.generatedContentTextures.push(mutationImageTexture);
      }

      if (fragmentTexture) {
        this.generatedContentTextures.push(fragmentTexture);
      }

      const aspect = texture?.image?.width && texture?.image?.height
        ? texture.image.width / texture.image.height
        : 1;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.05,
        depthWrite: false,
        opacity: 0.94,
        color: "#ffffff"
      });
      const sprite = new THREE.Sprite(material);
      sprite.userData.contentIndex = this.pointSprites.length;
      sprite.scale.set(definition.baseScale * aspect, definition.baseScale, 1);
      sprite.layers.set(2);
      this.pointSpriteGroup.add(sprite);
      this.pointSprites.push({
        sprite,
        type: definition.type,
        pointIndex: definition.pointIndex,
        text: definition.text || "",
        baseMap: texture,
        imageMap: mutationImageTexture || texture,
        textMap: mutationTextTexture || texture,
        fragmentMap: fragmentTexture || texture,
        baseScale: definition.baseScale,
        fullScale: definition.fullScale,
        aspect,
        hover: 0
      });
      this.pointSpritePointIndexMap.set(definition.pointIndex, index);
      this.frozenLayoutOffsets.push(
        new THREE.Vector3(
          (((hash01(index * 1.97) + 1) % 1) - 0.5) * 0.42,
          (((hash01(index * 2.37) + 1) % 1) - 0.5) * 0.32,
          (((hash01(index * 2.91) + 1) % 1) - 0.5) * 0.28
        )
      );
      this.contentCurrentPositions.push(new THREE.Vector3());
      this.contentCurrentScales.push(1);
      this.contentCurrentOpacities.push(1);
      this.contentCurrentRotations.push(0);
      this.contentRandomVectors.push(
        new THREE.Vector3(
          (((hash01(index * 1.13 + 0.11) + 1) % 1) - 0.5) * 2,
          (((hash01(index * 1.71 + 0.27) + 1) % 1) - 0.5) * 2,
          (((hash01(index * 2.37 + 0.49) + 1) % 1) - 0.5) * 2
        ).normalize()
      );
    }

    this.group.add(this.pointSpriteGroup);
    this.excludeContentFromGlow = true;
    this.interactiveIndices = pickInteractiveIndices(this.data.pointPositions.length / 3, this.pointSpriteIndices);
    this.hoveredInteractiveIndex = -1;
    this.hoveredSpriteIndex = -1;
    this.pointAxisMeta = buildAxisMeta(
      this.data.pointPositions.length / 3,
      this.data.pointRandoms,
      this.pointSpritePointIndexMap,
      this.pointSprites
    );
    this.outlineAxisMeta = buildAxisMeta(this.outlineBase.length / 3, this.outlineRandoms);
    this.meshAxisMeta = buildAxisMeta(this.data.meshPositions.length / 3, this.data.meshRandoms);

    this.activationLinePositions = new Float32Array(8 * 2 * 3);
    this.activationLineGeometry = new THREE.BufferGeometry();
    this.activationLineAttribute = new THREE.BufferAttribute(this.activationLinePositions, 3);
    this.activationLineAttribute.setUsage(THREE.DynamicDrawUsage);
    this.activationLineGeometry.setAttribute("position", this.activationLineAttribute);
    this.activationLineMaterial = new THREE.LineBasicMaterial({
      color: settings.color,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    this.activationLines = new THREE.LineSegments(this.activationLineGeometry, this.activationLineMaterial);
    this.activationLines.visible = false;
    this.group.add(this.activationLines);

    this.activationDotPositions = new Float32Array(12 * 3);
    this.activationDotGeometry = new THREE.BufferGeometry();
    this.activationDotAttribute = new THREE.BufferAttribute(this.activationDotPositions, 3);
    this.activationDotAttribute.setUsage(THREE.DynamicDrawUsage);
    this.activationDotGeometry.setAttribute("position", this.activationDotAttribute);
    this.activationDotMaterial = createDynamicPointsMaterial(settings.color, 0.045, 0);
    this.activationDots = new THREE.Points(this.activationDotGeometry, this.activationDotMaterial);
    this.activationDots.visible = false;
    this.group.add(this.activationDots);

    this.scanPointPositions = new Float32Array(this.interactiveIndices.length * 3);
    this.scanPointGeometry = new THREE.BufferGeometry();
    this.scanPointAttribute = new THREE.BufferAttribute(this.scanPointPositions, 3);
    this.scanPointAttribute.setUsage(THREE.DynamicDrawUsage);
    this.scanPointGeometry.setAttribute("position", this.scanPointAttribute);
    this.scanPointMaterial = createDynamicPointsMaterial(settings.color, 0.085, 0);
    this.scanPoints = new THREE.Points(this.scanPointGeometry, this.scanPointMaterial);
    this.scanPoints.visible = false;
    this.group.add(this.scanPoints);

    const maxConnectionPairs = (this.interactiveIndices.length * (this.interactiveIndices.length - 1)) / 2;
    this.connectionPositions = new Float32Array(Math.max(2, maxConnectionPairs) * 6);
    this.connectionGeometry = new THREE.BufferGeometry();
    this.connectionAttribute = new THREE.BufferAttribute(this.connectionPositions, 3);
    this.connectionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.connectionGeometry.setAttribute("position", this.connectionAttribute);
    this.connectionMaterial = new THREE.LineBasicMaterial({
      color: settings.color,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    this.connectionLines = new THREE.LineSegments(this.connectionGeometry, this.connectionMaterial);
    this.connectionLines.visible = false;
    this.group.add(this.connectionLines);

    this.relationLayers = {
      solid: createRelationLineLayer(settings.color, false, 0),
      dashed: createRelationLineLayer(settings.color, true, 0),
      emphasis: createRelationLineLayer(settings.color.clone().lerp(new THREE.Color("#ffffff"), 0.18), false, 0)
    };

    for (const layer of Object.values(this.relationLayers)) {
      layer.positions = new Float32Array(Math.max(2, maxConnectionPairs) * 6);
      layer.attribute = new THREE.BufferAttribute(layer.positions, 3);
      layer.attribute.setUsage(THREE.DynamicDrawUsage);
      layer.geometry.setAttribute("position", layer.attribute);
      this.group.add(layer.object);
    }

    this.chaosDirections = new Float32Array(this.data.pointPositions.length);
    this.clusterAssignments = new Uint8Array(this.data.pointPositions.length / 3);
    this.clusterCenters = [
      new THREE.Vector3(-0.9, 0.7, 0.2),
      new THREE.Vector3(0.95, 0.35, -0.25),
      new THREE.Vector3(-0.35, -0.9, 0.15),
      new THREE.Vector3(0.7, -0.65, -0.18)
    ];

    for (let index = 0; index < this.data.pointPositions.length; index += 3) {
      const pointIndex = index / 3;
      const random = this.data.pointRandoms[pointIndex] || Math.random();
      const theta = random * Math.PI * 2;
      const phi = ((pointIndex % 11) / 10) * Math.PI;
      this.chaosDirections[index] = Math.cos(theta) * Math.sin(phi);
      this.chaosDirections[index + 1] = Math.sin(theta) * Math.sin(phi);
      this.chaosDirections[index + 2] = Math.cos(phi);
      this.clusterAssignments[pointIndex] = pointIndex % this.clusterCenters.length;
    }

    this.lineLayers = settings.outlineLayers.map((layer) => {
      const lineLayer = createLineLayer(width, height, layer.color, layer.opacity);
      lineLayer.positions = new Float32Array(this.wireCurrent.length);
      lineLayer.attribute = new THREE.BufferAttribute(lineLayer.positions, 3);
      lineLayer.attribute.setUsage(THREE.DynamicDrawUsage);
      lineLayer.geometry.setAttribute("position", lineLayer.attribute);
      lineLayer.baseScale = layer.scale;
      lineLayer.baseOffset = layer.offset.clone();
      lineLayer.opacity = layer.opacity;
      this.group.add(lineLayer.object);
      return lineLayer;
    });

    this.meshBaseGeometry = new THREE.IcosahedronGeometry(0.045, 0);
    this.meshMaterial = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#ffffff",
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.82,
      metalness: 0.06,
      roughness: 0.28
    });
    this.meshObject = new THREE.InstancedMesh(
      this.meshBaseGeometry,
      this.meshMaterial,
      data.meshPositions.length / 3
    );
    this.meshObject.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.meshDummy = new THREE.Object3D();
    this.group.add(this.meshObject);

    this.outlineScaleBoost = 1;
    this.stepMode = "none";
    this.cinematicMode = false;
    this.cinematicShowPoints = false;
    this.brandMode = false;
    this.brandConfig = {
      enabled: false,
      orbitSpeed: 0.62,
      orbitRadius: 1.9,
      orbitRandomness: 0.28
    };
    this.brandFocusSpriteIndex = this.pointSprites.findIndex((item) => item.type === "image");
    if (this.brandFocusSpriteIndex === -1) {
      this.brandFocusSpriteIndex = this.pointSprites.length ? 0 : -1;
    }
    this.activeBrandIndex = this.brandFocusSpriteIndex;
    this.lastBrandSwitchAt = 0;
    this.brandAssets = {
      mainTextures: [],
      orbitTextures: []
    };
    this.brandVisualCache = {
      signature: "",
      mainType: "text",
      main: null,
      orbit: []
    };
    this.brandTransitionState = null;
    this.previousActiveBrandIndex = -1;
    this.brandDecorCache = {
      signature: "",
      title: null,
      subtitle: null,
      tag: null,
      backgroundWord: null
    };
    this.brandDecorGroup = new THREE.Group();
    this.brandBackdropSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      color: "#ffffff"
    }));
    this.brandTitleSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      color: "#ffffff"
    }));
    this.brandSubtitleSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      color: "#ffffff"
    }));
    this.brandTagSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      color: "#ffffff"
    }));
    this.brandMemorySprite = new THREE.Sprite(new THREE.SpriteMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      color: "#ffffff"
    }));
    this.brandDecorGroup.add(this.brandBackdropSprite);
    this.brandDecorGroup.add(this.brandTitleSprite);
    this.brandDecorGroup.add(this.brandSubtitleSprite);
    this.brandDecorGroup.add(this.brandTagSprite);
    this.brandDecorGroup.add(this.brandMemorySprite);
    this.group.add(this.brandDecorGroup);
    this.brandAuraPositions = new Float32Array(72 * 3);
    this.brandAuraGeometry = new THREE.BufferGeometry();
    this.brandAuraAttribute = new THREE.BufferAttribute(this.brandAuraPositions, 3);
    this.brandAuraAttribute.setUsage(THREE.DynamicDrawUsage);
    this.brandAuraGeometry.setAttribute("position", this.brandAuraAttribute);
    this.brandAuraMaterial = createDynamicPointsMaterial(settings.color, 0.03, 0);
    this.brandAuraPoints = new THREE.Points(this.brandAuraGeometry, this.brandAuraMaterial);
    this.brandAuraPoints.visible = false;
    this.group.add(this.brandAuraPoints);
    this.editorialMode = false;
    this.editorialConfig = {
      enabled: false,
      layoutPreset: "hero-center",
      templatePreset: "luxury-campaign",
      heroText: "",
      heroFontFamily: "Cormorant Garamond",
      heroFontSize: 280,
      heroTracking: -6,
      heroLineHeight: 0.9,
      heroOpacity: 1,
      heroColor: "#ffffff",
      heroLayer: "front",
      heroX: 0,
      heroY: 0,
      heroMaxWidth: 4.4,
      heroBackground: false,
      heroBackgroundOpacity: 0.2,
      heroBackgroundColor: "#000000",
      heroPaddingX: 40,
      heroPaddingY: 26,
      heroMaskEnabled: false,
      heroMaskType: "rectangle",
      heroMaskWidth: 0.72,
      heroMaskHeight: 0.38,
      heroMaskX: 0,
      heroMaskY: 0,
      opticalSizeBias: 0,
      heroContrast: 1,
      microContrast: 1,
      whitespaceBalance: 0.7,
      textDensity: 1,
      gridPreset: "2-column",
      gridSnap: 0,
      gridMargin: 0.14,
      gridGutter: 0.08,
      frameLogic: "under-hero",
      imageFollowHero: true,
      imageScaleBias: 1,
      animationPreset: "none",
      animationSpeed: 0.4,
      animationIntensity: 0.35,
      labelsText: [],
      labelsSize: 24,
      labelsTracking: 14,
      labelsSpacing: 0.75,
      labelsAlign: "spread",
      labelsLayer: "front",
      textFontFamily: "Cormorant Garamond",
      metadataFontFamily: "IBM Plex Mono",
      labelFontFamily: "Space Grotesk",
      infoText: "",
      infoTexts: [],
      infoBlockSettings: [],
      infoFontSize: 38,
      infoTracking: 0,
      infoLineHeight: 1,
      infoWidth: 1.9,
      infoHeight: 0.92,
      infoPadding: 30,
      infoAlign: "left",
      infoX: 1.25,
      infoY: -0.52,
      infoLayer: "front",
      infoBorder: true,
      secondaryText: "",
      secondaryTexts: [],
      secondarySize: 26,
      secondaryTracking: 4,
      secondaryLineHeight: 1,
      secondaryOpacity: 0.86,
      secondaryX: 1.25,
      secondaryY: -1.2,
      secondaryLayer: "front",
      showGuides: false,
      mediaOpacity: 0.92,
      mediaScale: 1,
      labelTexts: [],
      labelStyle: "outline",
      labelBoxSize: 24,
      labelTracking: 2,
      labelLineHeight: 1,
      labelBoxOpacity: 1,
      labelLayer: "front",
      overlapTextOpacity: 0.72,
      overlapImageOpacity: 0.82,
      overlapBrightness: -0.1,
      overlapPriority: 0.7,
      heroStyle: "fill",
      textStyle: "fill",
      outlineThickness: 2,
      shadowOpacity: 0.2,
      duplicateOffsetX: 16,
      duplicateOffsetY: 10,
      brandOrbitTexts: []
    };
    this.systemEditorialOverlayConfig = {
      enabled: false
    };
    this.editorialGroup = new THREE.Group();
    this.editorialMediaSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      color: "#ffffff"
    }));
    this.editorialHeroSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      color: "#ffffff"
    }));
    this.editorialLabelsSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      color: "#ffffff"
    }));
    this.editorialInfoSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      color: "#ffffff"
    }));
    this.editorialSecondarySprite = new THREE.Sprite(new THREE.SpriteMaterial({
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      color: "#ffffff"
    }));
    this.editorialSprites = {
      media: this.editorialMediaSprite,
      hero: this.editorialHeroSprite,
      labels: this.editorialLabelsSprite,
      info: this.editorialInfoSprite,
      secondary: this.editorialSecondarySprite
    };
    this.editorialGroup.add(this.editorialMediaSprite);
    this.editorialGroup.add(this.editorialHeroSprite);
    this.editorialGroup.add(this.editorialLabelsSprite);
    this.editorialGroup.add(this.editorialInfoSprite);
    this.editorialGroup.add(this.editorialSecondarySprite);
    this.editorialHeroSprites = [this.editorialHeroSprite];
    this.editorialInfoSprites = [this.editorialInfoSprite];
    this.editorialSecondarySprites = [this.editorialSecondarySprite];
    this.editorialLabelSprites = [];
    this.editorialGuidePositions = new Float32Array(32 * 3);
    this.editorialGuideGeometry = new THREE.BufferGeometry();
    this.editorialGuideAttribute = new THREE.BufferAttribute(this.editorialGuidePositions, 3);
    this.editorialGuideAttribute.setUsage(THREE.DynamicDrawUsage);
    this.editorialGuideGeometry.setAttribute("position", this.editorialGuideAttribute);
    this.editorialGuideMaterial = new THREE.LineBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      depthTest: false
    });
    this.editorialGuides = new THREE.LineSegments(this.editorialGuideGeometry, this.editorialGuideMaterial);
    this.editorialGroup.add(this.editorialGuides);
    this.editorialGroup.traverse((object) => {
      object.layers.set(1);
    });
    this.group.add(this.editorialGroup);
    this.editorialTextureCache = {
      signature: "",
      hero: null,
      heroBlocks: [],
      labels: null,
      infoBlocks: [],
      secondaryBlocks: [],
      labelBlocks: []
    };
    this.editorialOffsets = {
      hero: new THREE.Vector3(),
      heroBlocks: [],
      labels: new THREE.Vector3(),
      info: new THREE.Vector3(),
      secondary: new THREE.Vector3(),
      infoBlocks: [],
      secondaryBlocks: [],
      labelBlocks: []
    };
    this.hoveredEditorialKey = "";
    this.selectedEditorialKey = "";
    this.editorialDrag = null;
    this.pointSizeFactor = 1;
    this.pointOpacityFactor = 0.9;
    this.pointColorMode = "solid";
    this.pointColorA = settings.color.clone();
    this.pointColorB = new THREE.Color("#ffffff");
    this.tempPointColor = new THREE.Color();
    this.forceFieldType = ["attraction", "repulsion", "mixed"][Math.floor((((hash01(settings.revealOffset * 97) + 1) % 1) * 3)) % 3];
    this.curationAnchors = new Set();
    this.stepConnectedIndices = new Set();
    this.snapshotState = null;
    this.snapshotActive = false;
    this.cameraDramaFocusIndex = -1;
    this.letterSegmentation = buildLetterSegmentation(
      this.data.label,
      this.data.pointPositions,
      this.data.meshPositions,
      this.outlineBase,
      this.data.letterGuides
    );
    this.letterOffsets = Array.from({ length: this.letterSegmentation.count }, () => new THREE.Vector3());
    this.letterScales = Array.from({ length: this.letterSegmentation.count }, () => new THREE.Vector3(1, 1, 1));
    this.letterDeforms = Array.from({ length: this.letterSegmentation.count }, () => ({
      bend: new THREE.Vector3(),
      twist: new THREE.Vector3(),
      noise: 0
    }));
    this.letterPulls = Array.from({ length: this.letterSegmentation.count }, () => ({
      xPos: 0,
      xNeg: 0,
      yPos: 0,
      yNeg: 0,
      zPos: 0,
      zNeg: 0
    }));
    this.selectedLetterIndex = -1;
    this.hoveredLetterIndex = -1;
    this.hoveredStretchHandleIndex = -1;
    this.letterDrag = null;
    this.letterHitMeshes = [];
    this.letterSelectionMeshes = [];
    this.letterBounds = Array.from({ length: this.letterSegmentation.count }, () => ({
      min: new THREE.Vector3(),
      max: new THREE.Vector3(),
      center: new THREE.Vector3(),
      size: new THREE.Vector3(0.5, 0.5, 0.5)
    }));

    this.trailMaxLength = 14;
    this.trailHistory = Array.from({ length: this.interactiveIndices.length }, () =>
      Array.from({ length: this.trailMaxLength }, () => new THREE.Vector3(9999, 9999, 9999))
    );
    this.trailPositions = new Float32Array(Math.max(2, this.interactiveIndices.length * (this.trailMaxLength - 1)) * 6);
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailAttribute = new THREE.BufferAttribute(this.trailPositions, 3);
    this.trailAttribute.setUsage(THREE.DynamicDrawUsage);
    this.trailGeometry.setAttribute("position", this.trailAttribute);
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: settings.color,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    this.trailLines = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);
    this.trailLines.visible = false;
    this.group.add(this.trailLines);

    this.localAxisGizmo = new THREE.Group();
    const gizmoConfigs = [
      { color: "#ff4d5a", points: [0, 0, 0, 0.55, 0, 0] },
      { color: "#45d16a", points: [0, 0, 0, 0, 0.55, 0] },
      { color: "#4f7cff", points: [0, 0, 0, 0, 0, 0.55] }
    ];

    for (const config of gizmoConfigs) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(config.points, 3));
      this.localAxisGizmo.add(
        new THREE.LineSegments(
          geometry,
          new THREE.LineBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: 0.95,
            depthWrite: false
          })
        )
      );
    }

    this.localAxisGizmo.visible = false;
    this.group.add(this.localAxisGizmo);

    this.letterStretchHandleGroup = new THREE.Group();
    this.letterStretchHandles = [];
    const stretchHandleConfigs = [
      { kind: "face", axes: ["x"], signs: { x: 1 }, color: "#ff4d5a" },
      { kind: "face", axes: ["x"], signs: { x: -1 }, color: "#ff4d5a" },
      { kind: "face", axes: ["y"], signs: { y: 1 }, color: "#45d16a" },
      { kind: "face", axes: ["y"], signs: { y: -1 }, color: "#45d16a" },
      { kind: "face", axes: ["z"], signs: { z: 1 }, color: "#4f7cff" },
      { kind: "face", axes: ["z"], signs: { z: -1 }, color: "#4f7cff" },
      { kind: "corner", axes: ["x", "y", "z"], signs: { x: -1, y: -1, z: -1 }, color: "#f5f2ed" },
      { kind: "corner", axes: ["x", "y", "z"], signs: { x: -1, y: -1, z: 1 }, color: "#f5f2ed" },
      { kind: "corner", axes: ["x", "y", "z"], signs: { x: -1, y: 1, z: -1 }, color: "#f5f2ed" },
      { kind: "corner", axes: ["x", "y", "z"], signs: { x: -1, y: 1, z: 1 }, color: "#f5f2ed" },
      { kind: "corner", axes: ["x", "y", "z"], signs: { x: 1, y: -1, z: -1 }, color: "#f5f2ed" },
      { kind: "corner", axes: ["x", "y", "z"], signs: { x: 1, y: -1, z: 1 }, color: "#f5f2ed" },
      { kind: "corner", axes: ["x", "y", "z"], signs: { x: 1, y: 1, z: -1 }, color: "#f5f2ed" },
      { kind: "corner", axes: ["x", "y", "z"], signs: { x: 1, y: 1, z: 1 }, color: "#f5f2ed" }
    ];

    for (let index = 0; index < stretchHandleConfigs.length; index += 1) {
      const config = stretchHandleConfigs[index];
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({
          color: config.color,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
          depthTest: false
        })
      );
      handle.visible = false;
      handle.renderOrder = 30;
      handle.userData = { ...config, handleIndex: index };
      this.letterStretchHandleGroup.add(handle);
      this.letterStretchHandles.push(handle);
    }

    this.letterStretchHandleGroup.visible = false;
    this.group.add(this.letterStretchHandleGroup);

    this.letterHitGroup = new THREE.Group();
    for (let letterIndex = 0; letterIndex < this.letterSegmentation.count; letterIndex += 1) {
      const hitMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          depthTest: false,
          colorWrite: false
        })
      );
      hitMesh.layers.set(LETTER_HIT_LAYER);
      hitMesh.userData.letterIndex = letterIndex;
      this.letterHitGroup.add(hitMesh);
      this.letterHitMeshes.push(hitMesh);

      const selectionMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({
          color: "#ffffff",
          wireframe: true,
          transparent: true,
          opacity: 0,
          depthWrite: false
        })
      );
      selectionMesh.visible = false;
      this.group.add(selectionMesh);
      this.letterSelectionMeshes.push(selectionMesh);
    }
    this.group.add(this.letterHitGroup);
    this.setMode("outline");
  }

  setResolution(width, height) {
    this.resolution.width = width;
    this.resolution.height = height;
  }

  setMode(mode) {
    this.mode = mode;
    const contentOnly = Boolean(this.contentOnlyConfig?.enabled);
    const contentDrivenStep = this.stepMode === "media-space" || this.stepMode === "cinematic-export" || this.cinematicMode || this.brandMode;
    const brandShowPoints = this.brandMode ? this.brandConfig?.showPoints !== false : true;
    const editorialActive = this.editorialMode;
    const suppressBaseForEditorialBackdrop = Boolean(this.editorialConfig?.backdropCaptured);
    const editorialOverlayActive = Boolean(this.brandMode && this.brandConfig?.editorialOverlay?.enabled);
    const systemEditorialOverlayActive = Boolean(this.systemEditorialOverlayConfig?.enabled);
    this.pointObject.visible = !suppressBaseForEditorialBackdrop && !contentOnly && (
      (this.cinematicMode && this.cinematicShowPoints)
      || (this.brandMode && brandShowPoints)
      || (!this.cinematicMode && (mode === "points" || mode === "hybrid"))
    );
    this.pointSpriteGroup.visible = !suppressBaseForEditorialBackdrop && (contentOnly || contentDrivenStep || mode === "points" || mode === "hybrid") && this.pointSprites.length > 0;
    for (const layer of this.lineLayers) {
      layer.object.visible = !suppressBaseForEditorialBackdrop && !contentOnly && !this.cinematicMode && !this.brandMode && this.stepMode !== "cinematic-export" && mode === "outline";
    }
    this.meshObject.visible = !suppressBaseForEditorialBackdrop && !contentOnly && !this.cinematicMode && !this.brandMode && this.stepMode !== "cinematic-export" && (mode === "mesh" || mode === "hybrid");
    this.editorialGroup.visible = editorialActive || editorialOverlayActive || systemEditorialOverlayActive;
  }

  setContentDisplay(config = {}) {
    this.contentOnlyConfig = {
      enabled: Boolean(config.enabled),
      type: config.type || "mixed"
    };

    const type = this.contentOnlyConfig.enabled ? this.contentOnlyConfig.type : "mixed";

    for (const item of this.pointSprites) {
      item.sprite.visible = type === "mixed" || item.type === type;
    }

    this.setMode(this.mode);
  }

  setStepMode(mode) {
    const nextMode = mode || "none";

    if (this.stepMode === nextMode) {
      return;
    }

    this.stepMode = nextMode;

    if (nextMode !== "snapshot") {
      this.snapshotState = null;
      this.snapshotActive = false;
    }

    if (nextMode !== "curation") {
      this.curationAnchors.clear();
    }

    if (nextMode !== "camera-drama") {
      this.cameraDramaFocusIndex = -1;
    }

    if (nextMode !== "direct-manipulation" && nextMode !== "axis-visualization") {
      this.selectedLetterIndex = -1;
      this.hoveredLetterIndex = -1;
      this.hoveredStretchHandleIndex = -1;
      this.letterDrag = null;
      this.localAxisGizmo.visible = false;
      this.letterStretchHandleGroup.visible = false;
    }

    this.stepConnectedIndices.clear();
    this.setMode(this.mode);
  }

  setCinematicMode(config) {
    if (typeof config === "object" && config !== null) {
      this.cinematicMode = Boolean(config.enabled);
      this.cinematicShowPoints = Boolean(config.showPoints);
    } else {
      this.cinematicMode = Boolean(config);
      this.cinematicShowPoints = false;
    }

    this.setMode(this.mode);
  }

  setBrandMode(config) {
    if (typeof config === "object" && config !== null) {
      this.brandMode = Boolean(config.enabled);
      this.brandConfig = {
        ...this.brandConfig,
        ...config,
        enabled: Boolean(config.enabled)
      };
    } else {
      this.brandMode = Boolean(config);
      this.brandConfig = {
        ...this.brandConfig,
        enabled: this.brandMode
      };
    }

    this.setMode(this.mode);

    if (this.brandMode) {
      this.setActiveBrand(this.activeBrandIndex);
    }
  }

  setEditorialMode(config) {
    if (typeof config === "object" && config !== null) {
      this.editorialMode = Boolean(config.enabled);
      this.editorialConfig = {
        ...this.editorialConfig,
        ...config,
        enabled: Boolean(config.enabled)
      };
      this.applyEditorialOffsets(config.offsets);
    } else {
      this.editorialMode = Boolean(config);
      this.editorialConfig = {
        ...this.editorialConfig,
        enabled: this.editorialMode
      };
    }

    if (!this.editorialMode) {
      this.hoveredEditorialKey = "";
      this.selectedEditorialKey = "";
      this.editorialDrag = null;
    }

    this.setMode(this.mode);
  }

  setSystemEditorialOverlay(config) {
    if (typeof config === "object" && config !== null) {
      this.systemEditorialOverlayConfig = {
        ...this.systemEditorialOverlayConfig,
        ...config,
        enabled: Boolean(config.enabled)
      };
    } else {
      this.systemEditorialOverlayConfig = {
        ...this.systemEditorialOverlayConfig,
        enabled: Boolean(config)
      };
    }

    this.setMode(this.mode);
  }

  applyEditorialOffsets(offsets) {
    if (!offsets || typeof offsets !== "object") {
      return;
    }

    const applyVec = (target, value) => {
      if (!target || !Array.isArray(value)) {
        return;
      }

      target.set(
        Number(value[0] || 0),
        Number(value[1] || 0),
        Number(value[2] || 0)
      );
    };

    applyVec(this.editorialOffsets.hero, offsets.hero);
    applyVec(this.editorialOffsets.labels, offsets.labels);
    applyVec(this.editorialOffsets.info, offsets.info);
    applyVec(this.editorialOffsets.secondary, offsets.secondary);

    for (const [key, type] of [["heroBlocks", "hero"], ["infoBlocks", "info"], ["secondaryBlocks", "secondary"], ["labelBlocks", "label"]]) {
      const values = Array.isArray(offsets[key]) ? offsets[key] : [];
      const pool = this.ensureEditorialOffsetPool(type, values.length);

      for (let index = 0; index < pool.length; index += 1) {
        applyVec(pool[index], values[index] || [0, 0, 0]);
      }
    }
  }

  getEditorialLayoutState() {
    const serializeVec = (value) => [value.x, value.y, value.z];

    return {
      offsets: {
        hero: serializeVec(this.editorialOffsets.hero),
        heroBlocks: this.editorialOffsets.heroBlocks.map(serializeVec),
        labels: serializeVec(this.editorialOffsets.labels),
        info: serializeVec(this.editorialOffsets.info),
        secondary: serializeVec(this.editorialOffsets.secondary),
        infoBlocks: this.editorialOffsets.infoBlocks.map(serializeVec),
        secondaryBlocks: this.editorialOffsets.secondaryBlocks.map(serializeVec),
        labelBlocks: this.editorialOffsets.labelBlocks.map(serializeVec)
      }
    };
  }

  getEditorialInteractiveEntries() {
    const baseEntries = [
      ["labels", this.editorialLabelsSprite]
    ].filter(([, sprite]) => sprite.visible);

    this.editorialHeroSprites.forEach((sprite, index) => {
      if (sprite.visible) {
        baseEntries.push([index === 0 ? "hero" : `hero-${index}`, sprite]);
      }
    });

    this.editorialInfoSprites.forEach((sprite, index) => {
      if (sprite.visible) {
        baseEntries.push([`info-${index}`, sprite]);
      }
    });

    this.editorialSecondarySprites.forEach((sprite, index) => {
      if (sprite.visible) {
        baseEntries.push([`secondary-${index}`, sprite]);
      }
    });

    this.editorialLabelSprites.forEach((sprite, index) => {
      if (sprite.visible) {
        baseEntries.push([`label-${index}`, sprite]);
      }
    });

    return baseEntries;
  }

  pickEditorialKey(raycaster) {
    const entries = this.getEditorialInteractiveEntries();
    const sprites = entries.map(([, sprite]) => sprite).filter(Boolean);

    if (!sprites.length) {
      return "";
    }

    const hits = raycaster.intersectObjects(sprites, false);

    if (!hits.length) {
      return "";
    }

    const hitObject = hits[0].object;
    const match = entries.find(([, sprite]) => sprite === hitObject);
    return match?.[0] || "";
  }

  ensureEditorialSpritePool(type, count) {
    const pool = type === "hero"
      ? this.editorialHeroSprites
      : type === "info"
      ? this.editorialInfoSprites
      : type === "secondary"
        ? this.editorialSecondarySprites
        : this.editorialLabelSprites;
    const opacity = 1;

    while (pool.length < count) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
        color: "#ffffff"
      }));
      sprite.layers.set(1);
      pool.push(sprite);
      this.editorialGroup.add(sprite);
    }

    for (let index = 0; index < pool.length; index += 1) {
      pool[index].visible = index < count;
    }

    return pool;
  }

  ensureEditorialOffsetPool(type, count) {
    const key = type === "hero" ? "heroBlocks" : type === "info" ? "infoBlocks" : type === "secondary" ? "secondaryBlocks" : "labelBlocks";
    const pool = this.editorialOffsets[key];

    while (pool.length < count) {
      pool.push(new THREE.Vector3());
    }

    return pool;
  }

  getEditorialOffsetTarget(key) {
    if (!key) {
      return null;
    }

    if (key === "hero" || key === "labels" || key === "info" || key === "secondary") {
      if (key === "hero") {
        return this.ensureEditorialOffsetPool("hero", 1)[0] || this.editorialOffsets.hero;
      }
      return this.editorialOffsets[key];
    }

    const match = key.match(/^(hero|info|secondary|label)-(\d+)$/);

    if (!match) {
      return null;
    }

    const [, type, rawIndex] = match;
    const index = Number(rawIndex);
    const pool = this.ensureEditorialOffsetPool(type, index + 1);
    return pool[index] || null;
  }

  getEditorialSpriteByKey(key) {
    if (!key) {
      return null;
    }

    if (key === "hero") {
      return this.editorialHeroSprites[0] || this.editorialHeroSprite;
    }

    if (key === "labels") {
      return this.editorialLabelsSprite;
    }

    if (key === "info") {
      return this.editorialInfoSprite;
    }

    if (key === "secondary") {
      return this.editorialSecondarySprite;
    }

    const match = key.match(/^(hero|info|secondary|label)-(\d+)$/);

    if (!match) {
      return null;
    }

    const [, type, rawIndex] = match;
    const index = Number(rawIndex);
    const pool = type === "hero"
      ? this.editorialHeroSprites
      : type === "info"
      ? this.editorialInfoSprites
      : type === "secondary"
        ? this.editorialSecondarySprites
        : this.editorialLabelSprites;
    return pool[index] || null;
  }

  resolveEditorialMediaTexture() {
    return this.brandAssets.mainTextures[0]
      || this.brandAssets.orbitTextures[0]
      || this.pointImageTextures[0]
      || null;
  }

  resolveEditorialMediaTextureForContext(context = "standalone") {
    if (context === "brand") {
      return this.brandAssets.mainTextures[0]
        || this.brandAssets.orbitTextures[0]
        || this.pointImageTextures[0]
        || null;
    }

    if (context === "system") {
      return this.pointImageTextures[0] || null;
    }

    return this.resolveEditorialMediaTexture();
  }

  getResolvedEditorialConfig(config) {
    const context = config?.context || "standalone";

    if (context !== "system") {
      return config;
    }

    const normalizeText = (value) => String(value || "").trim().toUpperCase();
    const normalizeList = (list) => (Array.isArray(list) ? list : [])
      .map((item) => normalizeText(item))
      .filter(Boolean);
    const sameList = (list, expected) => {
      const normalized = normalizeList(list);
      return normalized.length === expected.length
        && normalized.every((item, index) => item === expected[index]);
    };

    const nextConfig = { ...config };

    if (sameList(config.labelsText, ["BRAND", "EDITION", "PARIS", "2026"])) {
      nextConfig.labelsText = [];
    }

    if (sameList(config.infoTexts, [
      "-20%\nNIZHNY NOVGOROD\nUL. MIRA, 15",
      "SHOWROOM / BY APPOINTMENT"
    ]) || sameList(config.infoTexts, ["-20%\nNIZHNY NOVGOROD\nUL. MIRA, 15"])) {
      nextConfig.infoTexts = [];
      nextConfig.infoText = "";
    }

    if (sameList(config.secondaryTexts, ["LIMITED EDITION / YEAR", "PARIS / 2026"])
      || sameList(config.secondaryTexts, ["LIMITED EDITION / YEAR"])) {
      nextConfig.secondaryTexts = [];
      nextConfig.secondaryText = "";
    }

    if (sameList(config.labelTexts, ["LIMITED DROP", "SEASON 26", "ARCHIVE"])) {
      nextConfig.labelTexts = [];
    }

    return nextConfig;
  }

  rebuildEditorialCache(configInput) {
    const config = configInput?.editorial || configInput || this.editorialConfig;
    const normalizedHeroTexts = ((config.heroTexts && config.heroTexts.length) ? config.heroTexts : (config.heroText ? [config.heroText] : []))
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    const normalizedInfoTexts = (config.infoTexts || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    const normalizedInfoBlockSettings = normalizedInfoTexts.map((_, index) => {
      const current = Array.isArray(config.infoBlockSettings) ? config.infoBlockSettings[index] : null;
      return {
        fontSize: Number(current?.fontSize ?? config.infoFontSize ?? 38),
        tracking: Number(current?.tracking ?? config.infoTracking ?? 0),
        lineHeight: Number(current?.lineHeight ?? config.infoLineHeight ?? 1),
        width: Number(current?.width ?? config.infoWidth ?? 1.9),
        height: Number(current?.height ?? config.infoHeight ?? 0.92),
        padding: Number(current?.padding ?? config.infoPadding ?? 30),
        align: current?.align || config.infoAlign || "left",
        x: Number(current?.x ?? config.infoX ?? 1.25),
        y: Number(current?.y ?? ((config.infoY ?? -0.52) - index * ((config.infoHeight ?? 0.92) + 0.22))),
        z: Number(current?.z ?? config.infoZ ?? 0.42),
        layer: current?.layer || config.infoLayer || "front",
        border: Boolean(current?.border ?? config.infoBorder ?? true)
      };
    });
    const normalizedSecondaryTexts = (config.secondaryTexts || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    const normalizedLabelTexts = (config.labelTexts || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    const signature = JSON.stringify({
      heroTexts: normalizedHeroTexts,
      heroFontFamily: config.heroFontFamily,
      heroFontSize: config.heroFontSize,
      heroTracking: config.heroTracking,
      heroLineHeight: config.heroLineHeight,
      heroColor: config.heroColor,
      heroOpacity: config.heroOpacity,
      heroBackground: config.heroBackground,
      heroBackgroundOpacity: config.heroBackgroundOpacity,
      heroBackgroundColor: config.heroBackgroundColor,
      heroPaddingX: config.heroPaddingX,
      heroPaddingY: config.heroPaddingY,
      heroMaskEnabled: config.heroMaskEnabled,
      heroMaskType: config.heroMaskType,
      heroMaskWidth: config.heroMaskWidth,
      heroMaskHeight: config.heroMaskHeight,
      heroMaskX: config.heroMaskX,
      heroMaskY: config.heroMaskY,
      heroStyle: config.heroStyle,
      labelsText: config.labelsText,
      labelsSize: config.labelsSize,
      labelsTracking: config.labelsTracking,
      labelsSpacing: config.labelsSpacing,
      labelsAlign: config.labelsAlign,
      textFontFamily: config.textFontFamily,
      metadataFontFamily: config.metadataFontFamily,
      labelFontFamily: config.labelFontFamily,
      infoTexts: normalizedInfoTexts,
      infoBlockSettings: normalizedInfoBlockSettings,
      secondaryTexts: normalizedSecondaryTexts,
      labelTexts: normalizedLabelTexts,
      labelStyle: config.labelStyle,
      labelBoxSize: config.labelBoxSize,
      labelBoxOpacity: config.labelBoxOpacity,
      textStyle: config.textStyle,
      outlineThickness: config.outlineThickness,
      shadowOpacity: config.shadowOpacity,
      duplicateOffsetX: config.duplicateOffsetX,
      duplicateOffsetY: config.duplicateOffsetY,
      secondarySize: config.secondarySize,
      secondaryTracking: config.secondaryTracking,
      secondaryLineHeight: config.secondaryLineHeight,
      secondaryOpacity: config.secondaryOpacity,
      labelTracking: config.labelTracking,
      labelLineHeight: config.labelLineHeight
    });

    if (this.editorialTextureCache.signature === signature) {
      return;
    }

    this.editorialTextureCache.labels?.dispose?.();
    this.editorialTextureCache.labels = null;
    this.editorialTextureCache.hero = null;
    for (const texture of this.editorialTextureCache.heroBlocks || []) {
      texture?.dispose?.();
    }
    for (const texture of this.editorialTextureCache.infoBlocks || []) {
      texture?.dispose?.();
    }
    for (const texture of this.editorialTextureCache.secondaryBlocks || []) {
      texture?.dispose?.();
    }
    for (const texture of this.editorialTextureCache.labelBlocks || []) {
      texture?.dispose?.();
    }
    this.editorialTextureCache.heroBlocks = [];
    this.editorialTextureCache.infoBlocks = [];
    this.editorialTextureCache.secondaryBlocks = [];
    this.editorialTextureCache.labelBlocks = [];

    this.editorialTextureCache.signature = signature;
    for (const heroText of normalizedHeroTexts) {
      this.editorialTextureCache.heroBlocks.push(createEditorialTextTexture(heroText, {
        fontFamily: `"${config.heroFontFamily || "Cormorant Garamond"}", "Times New Roman", serif`,
        fontSize: config.heroFontSize,
        letterSpacing: config.heroTracking,
        lineHeight: config.heroLineHeight,
        color: config.heroColor,
        opacity: config.heroOpacity,
        align: "center",
        panel: config.heroBackground,
        border: false,
        backgroundOpacity: config.heroBackgroundOpacity,
        backgroundColor: config.heroBackgroundColor,
        paddingX: config.heroPaddingX,
        paddingY: config.heroPaddingY,
        style: config.heroStyle,
        outlineThickness: config.outlineThickness,
        duplicateOffsetX: config.duplicateOffsetX,
        duplicateOffsetY: config.duplicateOffsetY,
        shadowOpacity: config.shadowOpacity,
        resolutionScale: 3.2,
        mask: {
          enabled: config.heroMaskEnabled,
          type: config.heroMaskType,
          width: config.heroMaskWidth,
          height: config.heroMaskHeight,
          x: config.heroMaskX,
          y: config.heroMaskY
        },
        width: Math.max(1400, Math.round((config.heroMaxWidth || 4.4) * 320)),
        height: Math.max(480, Math.round((config.heroFontSize || 280) * 1.9))
      }));
    }
    this.editorialTextureCache.hero = this.editorialTextureCache.heroBlocks[0] || null;
    this.editorialTextureCache.labels = createEditorialLabelsTexture(config.labelsText || [], {
      fontSize: config.labelsSize,
      letterSpacing: config.labelsTracking,
      spacing: config.labelsSpacing,
      align: config.labelsAlign,
      fontFamily: `"${config.labelFontFamily || "Space Grotesk"}", "Helvetica Neue", sans-serif`,
      resolutionScale: 2.4
    });
    for (let index = 0; index < normalizedInfoTexts.length; index += 1) {
      const infoText = normalizedInfoTexts[index];
      const infoSettings = normalizedInfoBlockSettings[index] || {};
      this.editorialTextureCache.infoBlocks.push(createEditorialTextTexture(infoText, {
        fontFamily: `"${config.textFontFamily || "Cormorant Garamond"}", "Times New Roman", serif`,
        fontSize: Math.max(12, Math.min(160, infoSettings.fontSize || 38)),
        letterSpacing: Number(infoSettings.tracking ?? config.infoTracking ?? 0),
        lineHeight: Number(infoSettings.lineHeight ?? config.infoLineHeight ?? 1),
        color: config.heroColor,
        opacity: 1,
        align: infoSettings.align || "left",
        panel: true,
        border: infoSettings.border ?? true,
        paddingX: infoSettings.padding ?? 30,
        paddingY: (infoSettings.padding ?? 30) * 0.75,
        style: config.textStyle,
        outlineThickness: config.outlineThickness,
        duplicateOffsetX: config.duplicateOffsetX,
        duplicateOffsetY: config.duplicateOffsetY,
        shadowOpacity: config.shadowOpacity,
        resolutionScale: 2.2,
        width: 480,
        height: 220
      }));
    }
    for (const secondaryText of normalizedSecondaryTexts) {
      this.editorialTextureCache.secondaryBlocks.push(createEditorialTextTexture(secondaryText, {
        fontFamily: `"${config.textFontFamily || "Cormorant Garamond"}", "Times New Roman", serif`,
        fontSize: config.secondarySize,
        letterSpacing: config.secondaryTracking ?? 4,
        lineHeight: config.secondaryLineHeight ?? 1,
        color: config.heroColor,
        opacity: config.secondaryOpacity,
        align: "right",
        style: config.textStyle,
        outlineThickness: config.outlineThickness,
        duplicateOffsetX: config.duplicateOffsetX,
        duplicateOffsetY: config.duplicateOffsetY,
        shadowOpacity: config.shadowOpacity,
        resolutionScale: 2.2,
        width: 420,
        height: 140
      }));
    }
    for (const labelText of normalizedLabelTexts) {
      this.editorialTextureCache.labelBlocks.push(createEditorialTextTexture(labelText, {
        fontFamily: `"${config.labelFontFamily || "Space Grotesk"}", "Helvetica Neue", sans-serif`,
        fontWeight: 600,
        fontSize: config.labelBoxSize,
        letterSpacing: config.labelTracking ?? 2,
        lineHeight: config.labelLineHeight ?? 1,
        color: config.heroColor,
        opacity: config.labelBoxOpacity,
        align: "center",
        panel: true,
        border: config.labelStyle !== "fill",
        backgroundOpacity: config.labelStyle === "outline" ? 0 : config.labelStyle === "sticker" ? 0.82 : 1,
        paddingX: 28,
        paddingY: 18,
        style: config.labelStyle === "sticker" ? "offset-duplicate" : "fill",
        resolutionScale: 2.2,
        width: 280,
        height: 120
      }));
    }
  }

  updateEditorialGuides(config, frame) {
    for (let index = 0; index < this.editorialGuidePositions.length; index += 1) {
      this.editorialGuidePositions[index] = 9999;
    }

    if (!config.showGuides) {
      this.editorialGuideAttribute.needsUpdate = true;
      this.editorialGuides.visible = false;
      return;
    }

    const width = 2.9 * (frame?.xScale || 1);
    const height = 2.1 * (frame?.yScale || 1);
    const marginFactor = 1 - THREE.MathUtils.clamp(config.gridMargin ?? 0.14, 0, 0.45);
    const marginX = width * marginFactor;
    const marginY = height * (1 - THREE.MathUtils.clamp(config.gridMargin ?? 0.14, 0, 0.45) * 0.7);
    const cols = getEditorialGridColumns(config.gridPreset || "2-column");
    const segments = [
      [0, -height, 0, 0, height, 0],
      [-width, 0, 0, width, 0, 0],
      [-marginX, -height, 0, -marginX, height, 0],
      [marginX, -height, 0, marginX, height, 0],
      [-width, marginY, 0, width, marginY, 0],
      [-width, -marginY, 0, width, -marginY, 0],
      [-width, -0.95, 0, width, -0.95, 0]
    ];

    for (const column of cols) {
      segments.push([width * column, -height, 0, width * column, height, 0]);
    }

    let offset = 0;
    for (const segment of segments) {
      this.editorialGuidePositions.set(segment, offset);
      offset += 6;
      if (offset >= this.editorialGuidePositions.length) {
        break;
      }
    }

    this.editorialGuideAttribute.needsUpdate = true;
    this.editorialGuides.visible = true;
  }

  snapEditorialPosition(position, config, frame) {
    const strength = THREE.MathUtils.clamp(config.gridSnap ?? 0, 0, 1);

    if (strength <= 0.001) {
      return position;
    }

    const width = 2.9 * (frame?.xScale || 1);
    const height = 2.1 * (frame?.yScale || 1);
    const columns = getEditorialGridColumns(config.gridPreset || "2-column");
    const columnPositions = columns.map((value) => value * width * (1 - THREE.MathUtils.clamp(config.gridMargin ?? 0.14, 0, 0.45)));
    const gutter = width * THREE.MathUtils.clamp(config.gridGutter ?? 0.08, 0, 0.4);
    let closestX = position.x;
    let distanceX = Infinity;

    for (const column of columnPositions) {
      const distance = Math.abs(position.x - column);
      if (distance < distanceX) {
        distanceX = distance;
        closestX = column;
      }
    }

    const baseline = height * 0.22;
    const baselineStep = 0.26 + gutter * 0.2;
    const snappedY = Math.round((position.y + baseline) / baselineStep) * baselineStep - baseline;

    position.x = THREE.MathUtils.lerp(position.x, closestX, strength);
    position.y = THREE.MathUtils.lerp(position.y, snappedY, strength * 0.72);
    return position;
  }

  updateEditorial(runtime) {
    const overlayConfig = runtime.brand?.editorialOverlay;
    const systemOverlayConfig = runtime.systemEditorialOverlay;
    const localEditorialActive = Boolean(this.editorialConfig?.enabled || this.editorialMode);
    const systemOverlayActive = Boolean(!runtime.editorial?.enabled && !this.editorialMode && systemOverlayConfig?.enabled);
    const active = Boolean(localEditorialActive || (runtime.brand?.enabled && overlayConfig?.enabled) || systemOverlayActive);

    if (!active) {
      this.editorialGroup.visible = false;
      this.hoveredEditorialKey = "";
      this.selectedEditorialKey = "";
      this.editorialDrag = null;
      return;
    }

    this.editorialGroup.visible = true;
    const rawConfig = localEditorialActive
      ? (this.editorialConfig || runtime.editorial)
      : systemOverlayActive
        ? { ...this.editorialConfig, ...(systemOverlayConfig || {}), enabled: true, context: "system" }
      : { ...this.editorialConfig, ...(overlayConfig || {}), enabled: true };
    const config = this.getResolvedEditorialConfig(rawConfig);
    const editorialContext = config.context || "standalone";
    const aspect = this.resolution.width / Math.max(this.resolution.height, 1);
    const layout = getEditorialLayoutFrame(config.layoutPreset || "hero-center", aspect);
    const template = getEditorialTemplateAdjustments(config.templatePreset || "luxury-campaign");
    this.rebuildEditorialCache(config);

    const useLiveContextBackdrop = editorialContext === "system" || editorialContext === "brand";
    const overlayInBrandMode = Boolean(editorialContext === "brand" && this.brandMode && overlayConfig?.enabled);
    const brandHeroImageActive = Boolean(
      overlayInBrandMode
      && this.resolveBrandMainVisualType(runtime) === "image"
      && (this.brandAssets.mainTextures || []).length
    );
    const mediaTexture = useLiveContextBackdrop
      ? null
      : brandHeroImageActive
      ? null
      : this.resolveEditorialMediaTextureForContext(editorialContext);
    const mediaAspect = mediaTexture?.image?.width && mediaTexture?.image?.height
      ? mediaTexture.image.width / mediaTexture.image.height
      : 0.78;
    const animationPreset = config.animationPreset || "none";
    const animationSpeed = config.animationSpeed ?? 0.4;
    const animationIntensity = config.animationIntensity ?? 0.35;
    const opticalBias = config.opticalSizeBias ?? 0;
    const whitespace = config.whitespaceBalance ?? 0.7;
    const density = config.textDensity ?? 1;

    if (this.editorialMediaSprite.material.map !== mediaTexture) {
      this.editorialMediaSprite.material.map = mediaTexture;
      this.editorialMediaSprite.material.needsUpdate = true;
    }

    const assignTexture = (sprite, texture) => {
      if (sprite.material.map !== texture) {
        sprite.material.map = texture;
        sprite.material.needsUpdate = true;
      }
    };

    assignTexture(this.editorialLabelsSprite, this.editorialTextureCache.labels);

    const heroTextures = (this.editorialTextureCache.heroBlocks || []).filter(Boolean);
    const heroSprites = this.ensureEditorialSpritePool("hero", Math.max(heroTextures.length, 1));
    const heroOffsets = this.ensureEditorialOffsetPool("hero", Math.max(heroTextures.length, 1));
    const infoTextures = (this.editorialTextureCache.infoBlocks || []).filter(Boolean);
    const secondaryTextures = (this.editorialTextureCache.secondaryBlocks || []).filter(Boolean);
    const infoSprites = this.ensureEditorialSpritePool("info", Math.max(infoTextures.length, 1));
    const secondarySprites = this.ensureEditorialSpritePool("secondary", Math.max(secondaryTextures.length, 1));
    const infoOffsets = this.ensureEditorialOffsetPool("info", Math.max(infoTextures.length, 1));
    const secondaryOffsets = this.ensureEditorialOffsetPool("secondary", Math.max(secondaryTextures.length, 1));

    const heroFront = config.heroLayer !== "behind-image";
    const heroPosition = layout.hero.clone().add(new THREE.Vector3(config.heroX, config.heroY, config.heroZ ?? (heroFront ? 0.32 : -0.06))).add(this.editorialOffsets.hero);
    const mediaPosition = layout.media.clone();
    const labelsPosition = layout.labels.clone().add(new THREE.Vector3(0, template.labelsOffsetY + (1 - whitespace) * 0.16, config.labelsZ ?? 0)).add(this.editorialOffsets.labels);
    const secondaryPosition = layout.secondary.clone().add(new THREE.Vector3(config.secondaryX - 1.25, config.secondaryY + 1.2, config.secondaryZ ?? 0.46)).add(this.editorialOffsets.secondary);

    if (config.imageFollowHero) {
      mediaPosition.x += heroPosition.x * 0.18;
      mediaPosition.y += heroPosition.y * 0.1;
    }

    if (config.frameLogic === "align-to-hero") {
      mediaPosition.copy(heroPosition).add(new THREE.Vector3(-0.22, -0.34, -0.12));
    } else if (config.frameLogic === "inside-hero") {
      mediaPosition.copy(heroPosition).add(new THREE.Vector3(0, -0.08, 0.04));
    }

    this.snapEditorialPosition(heroPosition, config, { xScale: 1, yScale: 1 });
    this.snapEditorialPosition(labelsPosition, config, { xScale: 1, yScale: 1 });
    this.snapEditorialPosition(secondaryPosition, config, { xScale: 1, yScale: 1 });

    if (animationPreset !== "none") {
      const phase = runtime.time * (0.4 + animationSpeed * 1.2);
      if (animationPreset === "letter-drift" || animationPreset === "word-slide-fracture") {
        heroPosition.x += Math.sin(phase) * animationIntensity * 0.08;
      }
      if (animationPreset === "depth-push") {
        heroPosition.z += Math.sin(phase) * animationIntensity * 0.24;
        mediaPosition.z -= Math.sin(phase) * animationIntensity * 0.08;
      }
      if (animationPreset === "metadata-flicker") {
        infoPosition.z += Math.sin(phase * 2.4) * 0.04;
      }
      if (animationPreset === "mask-reveal") {
        labelsPosition.y += Math.sin(phase * 0.8) * 0.05;
      }
    }

    const heroHover = this.hoveredEditorialKey === "hero" || this.selectedEditorialKey === "hero" ? 1 : 0;
    const labelsHover = this.hoveredEditorialKey === "labels" || this.selectedEditorialKey === "labels" ? 1 : 0;
    const infoHover = this.hoveredEditorialKey === "info" || this.selectedEditorialKey === "info" ? 1 : 0;
    const secondaryHover = this.hoveredEditorialKey === "secondary" || this.selectedEditorialKey === "secondary" ? 1 : 0;
    const clampOrderDepth = (value) => THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, -2.4, 2.4) * 1.8;
    const resolveTextRenderOrder = (layer, zValue, frontBase, behindBase, offset = 0) => (
      (layer === "behind-image" ? behindBase : frontBase) + offset + clampOrderDepth(zValue)
    );

    const heroWidthBase = config.heroMaxWidth * template.heroScale * (1 + opticalBias * 0.24) / Math.max(0.7, density * 0.92);
    const heroMediaScale = config.imageScaleBias ?? 1;
    this.editorialMediaSprite.visible = Boolean(mediaTexture);
    this.editorialMediaSprite.position.copy(mediaPosition);
    this.editorialMediaSprite.scale.set(
      config.mediaScale * heroMediaScale * template.mediaScale * mediaAspect * (config.frameLogic === "inside-hero" ? heroWidthBase * 0.78 : 2.6),
      config.mediaScale * heroMediaScale * template.mediaScale * (config.frameLogic === "inside-hero" ? heroWidthBase : 2.6),
      1
    );
    this.editorialMediaSprite.material.opacity = config.mediaOpacity;
    this.editorialMediaSprite.material.color.setScalar(1 + (config.overlapBrightness ?? 0));
    this.editorialMediaSprite.renderOrder = 24;

    const heroSpacing = Math.max(0.18, Math.min(0.74, (config.heroFontSize || 280) / 700));
    for (let index = 0; index < heroSprites.length; index += 1) {
      const sprite = heroSprites[index];
      const texture = heroTextures[index] || null;
      assignTexture(sprite, texture);
      sprite.visible = Boolean(texture);

      if (!texture) {
        continue;
      }

      const isHoveredHero = this.hoveredEditorialKey === (index === 0 ? "hero" : `hero-${index}`)
        || this.selectedEditorialKey === (index === 0 ? "hero" : `hero-${index}`);
      const heroAspect = texture.image?.width && texture.image?.height
        ? texture.image.width / texture.image.height
        : 3;
      let heroWidth = heroWidthBase * (1 + (isHoveredHero || (index === 0 && heroHover) ? 0.04 : 0));
      if (animationPreset === "kerning-bloom") {
        heroWidth *= 1 + Math.sin(runtime.time * (0.8 + animationSpeed * 1.4) + index * 0.32) * animationIntensity * 0.08;
      } else if (animationPreset === "staggered-serif") {
        heroWidth *= 1 + Math.sin(runtime.time * (0.5 + animationSpeed) + index * 0.24) * animationIntensity * 0.03;
      }

      sprite.position.copy(heroPosition)
        .add(new THREE.Vector3(0, (index - (heroTextures.length - 1) * 0.5) * -heroSpacing, 0))
        .add(heroOffsets[index] || new THREE.Vector3());
      this.snapEditorialPosition(sprite.position, config, { xScale: 1, yScale: 1 });
      sprite.scale.set(
        heroWidth,
        Math.max(0.46, heroWidth / Math.max(heroAspect, 0.1)),
        1
      );
      sprite.material.opacity = THREE.MathUtils.clamp(config.heroOpacity * template.heroOpacity * (config.heroContrast ?? 1), 0, 1);
      sprite.material.color.set(config.heroColor);
      sprite.renderOrder = resolveTextRenderOrder(
        config.heroLayer,
        sprite.position.z,
        31 + Math.round((config.overlapPriority ?? 0.7) * 2),
        11,
        Math.min(index, 2) * 0.18
      );
    }

    this.editorialLabelsSprite.visible = Boolean(this.editorialTextureCache.labels);
    this.editorialLabelsSprite.position.copy(labelsPosition);
    this.editorialLabelsSprite.scale.set(4.8 * (1 + labelsHover * 0.02), 0.52 * (1 + labelsHover * 0.02), 1);
    this.editorialLabelsSprite.material.opacity = THREE.MathUtils.clamp(0.96 * (config.microContrast ?? 1), 0, 1);
    this.editorialLabelsSprite.renderOrder = resolveTextRenderOrder(
      config.labelsLayer,
      this.editorialLabelsSprite.position.z,
      34,
      12,
      0.12
    );

    for (let index = 0; index < infoSprites.length; index += 1) {
      const sprite = infoSprites[index];
      const texture = infoTextures[index] || null;
      assignTexture(sprite, texture);
      sprite.visible = Boolean(texture);

      if (!texture) {
        continue;
      }

      const hover = this.hoveredEditorialKey === `info-${index}` || this.selectedEditorialKey === `info-${index}`
        ? 1
        : (index === 0 ? infoHover : 0);
      const infoSettings = Array.isArray(config.infoBlockSettings) ? config.infoBlockSettings[index] : null;
      const infoWidth = Number(infoSettings?.width ?? config.infoWidth ?? 1.9);
      const infoHeight = Number(infoSettings?.height ?? config.infoHeight ?? 0.92);
      const infoX = Number(infoSettings?.x ?? config.infoX ?? 1.25);
      const infoY = Number(infoSettings?.y ?? ((config.infoY ?? -0.52) - index * ((config.infoHeight ?? 0.92) + 0.22)));
      const infoZ = Number(infoSettings?.z ?? config.infoZ ?? 0.42);
      const infoLayer = infoSettings?.layer || config.infoLayer;
      const textureAspect = texture.image?.width && texture.image?.height
        ? texture.image.width / texture.image.height
        : 1.6;
      sprite.position.copy(layout.info)
        .add(new THREE.Vector3(infoX - 1.25, infoY + 0.52, infoZ))
        .add(this.editorialOffsets.info)
        .add(infoOffsets[index] || new THREE.Vector3());
      this.snapEditorialPosition(sprite.position, config, { xScale: 1, yScale: 1 });
      sprite.scale.set(
        infoWidth * template.infoScale * textureAspect * 0.56 * (1 + hover * 0.03),
        infoHeight * template.infoScale * (1 + hover * 0.03),
        1
      );
      sprite.material.opacity = THREE.MathUtils.clamp(config.microContrast ?? 1, 0, 1);
      sprite.renderOrder = resolveTextRenderOrder(
        infoLayer,
        sprite.position.z,
        35,
        12.5,
        index * 0.14
      );
    }

    const secondarySpacing = 0.36;
    for (let index = 0; index < secondarySprites.length; index += 1) {
      const sprite = secondarySprites[index];
      const texture = secondaryTextures[index] || null;
      assignTexture(sprite, texture);
      sprite.visible = Boolean(texture);

      if (!texture) {
        continue;
      }

      const hover = this.hoveredEditorialKey === `secondary-${index}` || this.selectedEditorialKey === `secondary-${index}`
        ? 1
        : (index === 0 ? secondaryHover : 0);
      const textureAspect = texture.image?.width && texture.image?.height
        ? texture.image.width / texture.image.height
        : 2.6;
      sprite.position.copy(secondaryPosition)
        .add(new THREE.Vector3(0, -index * secondarySpacing, 0))
        .add(secondaryOffsets[index] || new THREE.Vector3());
      sprite.scale.set(1.25 * textureAspect * (1 + hover * 0.03), 0.26 * (1 + hover * 0.03), 1);
      sprite.material.opacity = config.secondaryOpacity * THREE.MathUtils.clamp(config.microContrast ?? 1, 0, 1);
      sprite.renderOrder = resolveTextRenderOrder(
        config.secondaryLayer,
        sprite.position.z,
        33,
        12.25,
        index * 0.12
      );
    }

    const labelTextures = (this.editorialTextureCache.labelBlocks || []).filter(Boolean);
    const labelSprites = this.ensureEditorialSpritePool("label", labelTextures.length);
    const labelOffsets = this.ensureEditorialOffsetPool("label", labelTextures.length);
    const labelRadius = 1.2 + (1 - whitespace) * 0.6;

    for (let index = 0; index < labelSprites.length; index += 1) {
      const sprite = labelSprites[index];
      const texture = labelTextures[index] || null;
      assignTexture(sprite, texture);
      sprite.visible = Boolean(texture);

      if (!texture) {
        continue;
      }

      const angle = -0.8 + index * 0.72;
      const textureAspect = texture.image?.width && texture.image?.height
        ? texture.image.width / texture.image.height
        : 2.2;
      const hover = this.hoveredEditorialKey === `label-${index}` || this.selectedEditorialKey === `label-${index}` ? 1 : 0;
      sprite.position.set(
        heroPosition.x + Math.cos(angle) * labelRadius,
        heroPosition.y + 0.86 + Math.sin(angle) * 0.24,
        heroPosition.z + (config.labelZ ?? 0.28)
      ).add(labelOffsets[index] || new THREE.Vector3());
      this.snapEditorialPosition(sprite.position, config, { xScale: 1, yScale: 1 });
      sprite.scale.set(0.72 * textureAspect * (1 + hover * 0.05), 0.32 * (1 + hover * 0.05), 1);
      sprite.material.opacity = config.labelBoxOpacity;
      sprite.renderOrder = resolveTextRenderOrder(
        config.labelLayer,
        sprite.position.z,
        36,
        12.75,
        index * 0.12
      );
    }

    const primaryHeroSprite = heroSprites[0];
    const overlapDistance = primaryHeroSprite?.visible
      ? primaryHeroSprite.position.distanceTo(mediaPosition)
      : heroPosition.distanceTo(mediaPosition);
    const overlapMix = mediaTexture
      ? THREE.MathUtils.clamp(1 - overlapDistance / 1.8, 0, 1)
      : 0;
    if (overlapMix > 0.001) {
      for (const sprite of heroSprites) {
        if (sprite.visible) {
          sprite.material.opacity *= THREE.MathUtils.lerp(1, config.overlapTextOpacity ?? 0.72, overlapMix);
        }
      }
      this.editorialMediaSprite.material.opacity *= THREE.MathUtils.lerp(1, config.overlapImageOpacity ?? 0.82, overlapMix);
    }

    this.updateEditorialGuides(config, {
      xScale: config.mediaScale * (aspect >= 1 ? 1 : 0.82),
      yScale: config.mediaScale
    });
  }

  getBrandCandidateIndices() {
    const selectable = this.pointSprites
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.type === "image" || item.type === "text");

    return selectable.length
      ? selectable.map(({ index }) => index)
      : this.pointSprites.map((_, index) => index);
  }

  setActiveBrand(index) {
    const candidates = this.getBrandCandidateIndices();

    if (!candidates.length) {
      this.activeBrandIndex = -1;
      this.brandFocusSpriteIndex = -1;
      this.focusedSpriteIndex = -1;
      this.cameraDramaFocusIndex = -1;
      return;
    }

    const nextIndex = candidates.includes(index) ? index : candidates[0];
    if (this.activeBrandIndex !== -1 && this.activeBrandIndex !== nextIndex) {
      this.previousActiveBrandIndex = this.activeBrandIndex;
      this.brandTransitionState = {
        from: this.activeBrandIndex,
        to: nextIndex,
        startedAt: performance.now() * 0.001
      };
    }
    this.activeBrandIndex = nextIndex;
    this.brandFocusSpriteIndex = nextIndex;
    this.focusedSpriteIndex = nextIndex;
    this.cameraDramaFocusIndex = nextIndex;
  }

  getResolvedBrandConfig(runtime) {
    const config = runtime.brand || this.brandConfig;
    const mood = getBrandMoodAdjustments(config.moodPreset || "luxury");
    const frame = getBrandOutputFrame(config.outputPreset || "poster", config.exportRatio || "current");
    return {
      ...config,
      mood,
      frame,
      orbitRandomnessResolved: THREE.MathUtils.clamp((config.orbitRandomness ?? 0.28) * mood.randomness, 0, 1),
      orbitJitterResolved: (config.orbitJitter ?? 0.12) * mood.jitter,
      orbitSpeedResolved: (config.orbitSpeed ?? 0.62) * mood.speed,
      heroDominanceResolved: (config.heroDominance ?? 2.1) * mood.dominance,
      backgroundSuppressionResolved: THREE.MathUtils.clamp((config.backgroundSuppression ?? 0.28) * mood.suppression, 0, 1),
      densityResolved: mood.density,
      brandWeightResolved: THREE.MathUtils.clamp(config.brandWeight ?? 1, 0.2, 2.4),
      secondaryEmphasisResolved: THREE.MathUtils.clamp(config.secondaryEmphasis ?? 0.9, 0.15, 2),
      opacityFalloffResolved: THREE.MathUtils.clamp(config.opacityFalloffByDepth ?? 0.3, 0, 1),
      scaleFalloffResolved: THREE.MathUtils.clamp(config.scaleFalloffByDistance ?? 0.22, 0, 1),
      blurFalloffResolved: THREE.MathUtils.clamp(config.blurFalloffByDepth ?? 0, 0, 1)
    };
  }

  getBrandHeroIndices(config) {
    const candidates = this.getBrandCandidateIndices();
    const primary = candidates.includes(this.activeBrandIndex) ? this.activeBrandIndex : (candidates[0] ?? -1);

    if (!config.dualHeroEnabled || candidates.length < 2 || primary === -1) {
      return [primary].filter((value) => value !== -1);
    }

    const primaryIndex = candidates.indexOf(primary);
    const secondary = candidates[(primaryIndex + 1) % candidates.length];
    return [primary, secondary];
  }

  getBrandTransition(runtime) {
    if (!this.brandTransitionState) {
      return { active: false, progress: 1, eased: 1, style: runtime.brand?.transitionStyle || "slide" };
    }

    const config = runtime.brand || this.brandConfig;
    const duration = Math.max(0.2, Number(config.transitionDuration) || 0.9);
    const elapsed = performance.now() * 0.001 - this.brandTransitionState.startedAt;
    const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
    const eased = easeBrandTransition(config.transitionEasing || "ease-in-out", progress);

    if (progress >= 1) {
      this.brandTransitionState = null;
      this.previousActiveBrandIndex = -1;
      return { active: false, progress: 1, eased: 1, style: config.transitionStyle || "slide" };
    }

    return {
      active: true,
      progress,
      eased,
      style: config.transitionStyle || "slide",
      from: this.brandTransitionState.from,
      to: this.brandTransitionState.to
    };
  }

  rebuildBrandDecorCache(runtime) {
    const config = this.getResolvedBrandConfig(runtime);
    const signature = JSON.stringify({
      title: config.titleText || "",
      subtitle: config.subtitleText || "",
      tag: config.tagText || "",
      backgroundWord: config.backgroundWord || "",
      fontSize: config.textFontSize,
      align: config.textAlign,
      color: config.textColor,
      lineHeight: config.textLineHeight,
      letterSpacing: config.textLetterSpacing,
      textOpacity: config.textOpacity
    });

    if (this.brandDecorCache.signature === signature) {
      return;
    }

    for (const key of ["title", "subtitle", "tag", "backgroundWord"]) {
      this.brandDecorCache[key]?.dispose?.();
      this.brandDecorCache[key] = null;
    }

    this.brandDecorCache.signature = signature;
    this.brandDecorCache.title = config.titleText
      ? createBrandTextTexture(config.titleText, {
          fontSize: Math.max(28, config.textFontSize * 0.42),
          align: "left",
          color: config.textColor,
          lineHeight: config.textLineHeight,
          letterSpacing: config.textLetterSpacing,
          opacity: config.textOpacity,
          backgroundOpacity: 0.6,
          strokeOpacity: 0.04
        })
      : null;
    this.brandDecorCache.subtitle = config.subtitleText
      ? createBrandTextTexture(config.subtitleText, {
          fontSize: Math.max(22, config.textFontSize * 0.24),
          align: "left",
          color: config.textColor,
          lineHeight: config.textLineHeight,
          letterSpacing: config.textLetterSpacing * 0.5,
          opacity: config.textOpacity * 0.82,
          backgroundOpacity: 0.44,
          strokeOpacity: 0.03
        })
      : null;
    this.brandDecorCache.tag = config.tagText
      ? createBrandTextTexture(config.tagText, {
          fontSize: Math.max(20, config.textFontSize * 0.18),
          align: "center",
          color: config.textColor,
          lineHeight: 0.9,
          letterSpacing: config.textLetterSpacing * 0.8,
          opacity: config.textOpacity,
          backgroundOpacity: 0.72,
          strokeOpacity: 0.06
        })
      : null;
    this.brandDecorCache.backgroundWord = config.backgroundWord
      ? createBrandTextTexture(config.backgroundWord, {
          fontSize: Math.max(120, config.textFontSize * 1.4),
          align: "center",
          color: config.textColor,
          lineHeight: 0.9,
          letterSpacing: config.textLetterSpacing * 0.5,
          opacity: config.textOpacity * 0.18,
          panel: false
        })
      : null;
  }

  setBrandAssets(assets = {}) {
    this.brandAssets = {
      mainTextures: Array.isArray(assets.mainTextures) ? assets.mainTextures : [],
      orbitTextures: Array.isArray(assets.orbitTextures) ? assets.orbitTextures : []
    };
    this.brandVisualCache.signature = "";
  }

  rebuildBrandVisualCache(runtime) {
    const config = runtime.brand || this.brandConfig;
    const mainTextures = this.brandAssets.mainTextures || [];
    const mainKind = config.mainKind || "auto";
    const mainText = String(config.mainText || "").trim();
    const wantsMainText = (mainKind === "text" || (mainKind === "auto" && !mainTextures.length)) && Boolean(mainText);
    const signature = JSON.stringify({
      mainKind,
      mainText: config.mainText || "",
      orbitTexts: config.orbitTexts || [],
      textFontSize: config.textFontSize || 108,
      textAlign: config.textAlign || "center",
      textColor: config.textColor || "#f5f2ed",
      mainImages: mainTextures.length,
      orbitImages: this.brandAssets.orbitTextures.length
    });

    if (this.brandVisualCache.signature === signature) {
      return;
    }

    if (this.brandVisualCache.main) {
      this.brandVisualCache.main.dispose?.();
    }

    for (const texture of this.brandVisualCache.orbit) {
      texture.dispose?.();
    }

    this.brandVisualCache.signature = signature;
    this.brandVisualCache.mainType = wantsMainText ? "text" : (mainTextures.length ? "image" : "none");
    this.brandVisualCache.main = null;
    this.brandVisualCache.orbit = [];

    if (wantsMainText) {
      this.brandVisualCache.main = createBrandTextTexture(mainText, {
        fontSize: config.textFontSize,
        align: config.textAlign,
        color: config.textColor
      });
    } else if (mainTextures.length) {
      this.brandVisualCache.main = createBrandImageTexture(mainTextures[0]);
    }

    const orbitTextures = this.brandAssets.orbitTextures || [];
    const orbitTexts = Array.isArray(config.orbitTexts) ? config.orbitTexts : [];

    for (const texture of orbitTextures) {
      const visualTexture = createBrandImageTexture(texture);

      if (visualTexture) {
        this.brandVisualCache.orbit.push(visualTexture);
      }
    }

    for (const text of orbitTexts) {
      const texture = createBrandTextTexture(text, {
        fontSize: Math.max(28, (config.textFontSize || 108) * 0.6),
        align: config.textAlign,
        color: config.textColor,
        lineHeight: config.textLineHeight,
        letterSpacing: config.textLetterSpacing,
        opacity: config.textOpacity
      });

      if (texture) {
        this.brandVisualCache.orbit.push(texture);
      }
    }
  }

  updateBrandDecor(runtime) {
    const brandActive = Boolean(runtime.brand?.enabled || this.brandMode);

    if (!brandActive) {
      this.brandDecorGroup.visible = false;
      this.brandAuraPoints.visible = false;
      return;
    }

    const config = this.getResolvedBrandConfig(runtime);
    this.rebuildBrandDecorCache(runtime);
    const heroIndices = this.getBrandHeroIndices(config);
    const primaryHeroIndex = heroIndices[0];

    if (primaryHeroIndex === undefined || primaryHeroIndex === -1 || !this.contentCurrentPositions[primaryHeroIndex]) {
      this.brandDecorGroup.visible = false;
      this.brandAuraPoints.visible = false;
      return;
    }

    const heroPosition = this.contentCurrentPositions[primaryHeroIndex];
    const frame = config.frame || getBrandOutputFrame(config.outputPreset || "poster");
    const titleVisible = Boolean(config.titleText);
    const subtitleVisible = Boolean(config.subtitleText);
    const tagVisible = Boolean(config.tagText);
    const backgroundWordVisible = Boolean(config.backgroundWord);

    this.brandDecorGroup.visible = titleVisible || subtitleVisible || tagVisible || backgroundWordVisible || Boolean(this.brandTransitionState);

    const assignSpriteTexture = (sprite, texture) => {
      if (sprite.material.map === texture) {
        return;
      }

      sprite.material.map = texture;
      sprite.material.needsUpdate = true;
    };

    assignSpriteTexture(this.brandBackdropSprite, this.brandDecorCache.backgroundWord);
    assignSpriteTexture(this.brandTitleSprite, this.brandDecorCache.title);
    assignSpriteTexture(this.brandSubtitleSprite, this.brandDecorCache.subtitle);
    assignSpriteTexture(this.brandTagSprite, this.brandDecorCache.tag);

    const baseOpacity = THREE.MathUtils.clamp(config.textOpacity ?? 0.92, 0, 1);
    this.brandBackdropSprite.visible = backgroundWordVisible;
    this.brandBackdropSprite.position.set(heroPosition.x, heroPosition.y - 0.12, heroPosition.z - 0.55);
    this.brandBackdropSprite.scale.set(4.4 * frame.xScale, 1.8 * frame.yScale, 1);
    this.brandBackdropSprite.material.opacity = backgroundWordVisible ? baseOpacity * 0.22 : 0;
    this.brandBackdropSprite.material.color.set(config.textColor || "#f5f2ed");

    this.brandTitleSprite.visible = titleVisible;
    this.brandTitleSprite.position.set(heroPosition.x - 1.56 * frame.xScale, heroPosition.y + 1.1 * frame.yScale, heroPosition.z - 0.18);
    this.brandTitleSprite.scale.set(1.8, 0.62, 1);
    this.brandTitleSprite.material.opacity = titleVisible ? baseOpacity : 0;
    this.brandTitleSprite.material.color.set("#ffffff");

    this.brandSubtitleSprite.visible = subtitleVisible;
    this.brandSubtitleSprite.position.set(heroPosition.x - 1.48 * frame.xScale, heroPosition.y + 0.74 * frame.yScale, heroPosition.z - 0.16);
    this.brandSubtitleSprite.scale.set(1.7, 0.44, 1);
    this.brandSubtitleSprite.material.opacity = subtitleVisible ? baseOpacity * 0.82 : 0;
    this.brandSubtitleSprite.material.color.set("#ffffff");

    this.brandTagSprite.visible = tagVisible;
    this.brandTagSprite.position.set(heroPosition.x + 1.18 * frame.xScale, heroPosition.y - 0.96 * frame.yScale, heroPosition.z - 0.12);
    this.brandTagSprite.scale.set(0.86, 0.24, 1);
    this.brandTagSprite.material.opacity = tagVisible ? baseOpacity * 0.94 : 0;
    this.brandTagSprite.material.color.set("#ffffff");

    const transition = this.getBrandTransition(runtime);
    const memoryIndex = transition.active ? transition.from : this.previousActiveBrandIndex;
    const hasMemory = Number.isInteger(memoryIndex)
      && memoryIndex >= 0
      && this.pointSprites[memoryIndex]
      && this.contentCurrentPositions[memoryIndex];

    this.brandMemorySprite.visible = hasMemory;
    if (hasMemory) {
      const memoryVisual = this.resolveBrandOrbitVisual(memoryIndex, runtime) || this.resolveBrandActiveVisual(memoryIndex, runtime);
      assignSpriteTexture(this.brandMemorySprite, memoryVisual?.texture || null);
      const memoryPosition = this.contentCurrentPositions[memoryIndex];
      const memoryOpacity = THREE.MathUtils.clamp(config.memoryOpacity ?? 0.32, 0, 1)
        * (transition.active ? 1 - transition.eased : 0.35);
      this.brandMemorySprite.position.set(
        memoryPosition.x + (config.memoryOffset ?? 0.42) * 0.16,
        memoryPosition.y - (config.memoryOffset ?? 0.42) * 0.08,
        memoryPosition.z - (config.memoryOffset ?? 0.42) * 0.3
      );
      this.brandMemorySprite.scale.set(1.18, 0.9, 1);
      this.brandMemorySprite.material.opacity = memoryOpacity;
      this.brandMemorySprite.material.color.set("#ffffff");
    } else {
      this.brandMemorySprite.material.opacity = 0;
    }

    const auraVisible = (config.auraStrength ?? 0) > 0.001 && (config.auraOpacity ?? 0) > 0.001;
    this.brandAuraPoints.visible = auraVisible;

    if (!auraVisible) {
      this.brandAuraMaterial.opacity = 0;
      return;
    }

    const auraRadius = Math.max(0.12, config.auraRadius ?? 1.15);
    const auraStrength = Math.max(0, config.auraStrength ?? 0.65);

    for (let index = 0; index < this.brandAuraPositions.length / 3; index += 1) {
      const angle = (index / (this.brandAuraPositions.length / 3)) * Math.PI * 2 + runtime.time * 0.22;
      const ring = index % 3;
      const radial = auraRadius * (0.62 + ring * 0.18 + Math.sin(runtime.time * 0.35 + index * 0.37) * 0.03);
      const offset = index * 3;
      this.brandAuraPositions[offset] = heroPosition.x + Math.cos(angle) * radial;
      this.brandAuraPositions[offset + 1] = heroPosition.y + Math.sin(angle) * radial * 0.62;
      this.brandAuraPositions[offset + 2] = heroPosition.z - 0.2 + Math.cos(angle * 1.6) * auraStrength * 0.12;
    }

    this.brandAuraAttribute.needsUpdate = true;
    this.brandAuraMaterial.size = 0.022 + auraStrength * 0.02;
    this.brandAuraMaterial.opacity = THREE.MathUtils.clamp(config.auraOpacity ?? 0.42, 0, 1);
    this.brandAuraMaterial.color.copy(this.settings.color).lerp(new THREE.Color(config.textColor || "#ffffff"), 0.28);
  }

  getLetterCenter(letterIndex, target) {
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    let count = 0;

    for (let pointIndex = 0; pointIndex < this.letterSegmentation.pointMap.length; pointIndex += 1) {
      if (this.letterSegmentation.pointMap[pointIndex] !== letterIndex) {
        continue;
      }

      const offset = pointIndex * 3;
      sumX += this.pointCurrent[offset];
      sumY += this.pointCurrent[offset + 1];
      sumZ += this.pointCurrent[offset + 2];
      count += 1;
    }

    if (!count) {
      return target.set(9999, 9999, 9999);
    }

    return target.set(sumX / count, sumY / count, sumZ / count);
  }

  updateLetterHandles() {
    for (let letterIndex = 0; letterIndex < this.letterSegmentation.count; letterIndex += 1) {
      const bounds = this.letterBounds[letterIndex];
      bounds.min.set(Infinity, Infinity, Infinity);
      bounds.max.set(-Infinity, -Infinity, -Infinity);
    }

    for (let pointIndex = 0; pointIndex < this.letterSegmentation.pointMap.length; pointIndex += 1) {
      const letterIndex = this.letterSegmentation.pointMap[pointIndex];
      const bounds = this.letterBounds[letterIndex];
      const offset = pointIndex * 3;
      const x = this.pointCurrent[offset];
      const y = this.pointCurrent[offset + 1];
      const z = this.pointCurrent[offset + 2];
      bounds.min.x = Math.min(bounds.min.x, x);
      bounds.min.y = Math.min(bounds.min.y, y);
      bounds.min.z = Math.min(bounds.min.z, z);
      bounds.max.x = Math.max(bounds.max.x, x);
      bounds.max.y = Math.max(bounds.max.y, y);
      bounds.max.z = Math.max(bounds.max.z, z);
    }

    for (let letterIndex = 0; letterIndex < this.letterSegmentation.count; letterIndex += 1) {
      const bounds = this.letterBounds[letterIndex];
      const size = bounds.size.set(
        Math.max(0.28, bounds.max.x - bounds.min.x),
        Math.max(0.28, bounds.max.y - bounds.min.y),
        Math.max(0.22, bounds.max.z - bounds.min.z)
      );
      const center = bounds.center.set(
        (bounds.min.x + bounds.max.x) * 0.5,
        (bounds.min.y + bounds.max.y) * 0.5,
        (bounds.min.z + bounds.max.z) * 0.5
      );
      const hitMesh = this.letterHitMeshes[letterIndex];
      const selectionMesh = this.letterSelectionMeshes[letterIndex];

      hitMesh.position.copy(center);
      hitMesh.scale.copy(size).addScalar(0.22);
      selectionMesh.position.copy(center);
      selectionMesh.scale.copy(size).addScalar(0.14);
      selectionMesh.visible = this.selectedLetterIndex === letterIndex || this.hoveredLetterIndex === letterIndex;
      selectionMesh.material.opacity = this.selectedLetterIndex === letterIndex ? 0.88 : 0.26;
      selectionMesh.material.color.set(this.selectedLetterIndex === letterIndex ? "#ffffff" : "#88ffbc");
    }

    const showStretchHandles = this.stepMode === "direct-manipulation" && this.selectedLetterIndex !== -1;
    this.letterStretchHandleGroup.visible = showStretchHandles;

    for (const handle of this.letterStretchHandles) {
      handle.visible = showStretchHandles;
    }

    if (!showStretchHandles) {
      this.hoveredStretchHandleIndex = -1;
      return;
    }

    const bounds = this.letterBounds[this.selectedLetterIndex];
    const size = bounds.size;
    const center = bounds.center;
    const handleScale = THREE.MathUtils.clamp(Math.max(size.x, size.y, size.z) * 0.09, 0.08, 0.22);
    const margin = handleScale * 0.85;

    for (const handle of this.letterStretchHandles) {
      const { kind, signs, handleIndex, color } = handle.userData;

      handle.position.copy(center);
      handle.position.x += (signs.x || 0) * (size.x * 0.5 + margin);
      handle.position.y += (signs.y || 0) * (size.y * 0.5 + margin);
      handle.position.z += (signs.z || 0) * (size.z * 0.5 + margin);

      handle.scale.setScalar(kind === "corner" ? handleScale * 0.82 : handleScale);

      const active = this.hoveredStretchHandleIndex === handleIndex || this.letterDrag?.handleIndex === handleIndex;
      handle.material.opacity = active ? 1 : 0.72;
      handle.material.color.set(active ? "#ffffff" : color);
    }
  }

  pickLetterIndex(raycaster) {
    const previousMask = raycaster.layers.mask;
    raycaster.layers.set(LETTER_HIT_LAYER);
    const hits = raycaster.intersectObjects(this.letterHitMeshes, false);
    raycaster.layers.mask = previousMask;
    return hits[0]?.object?.userData?.letterIndex ?? -1;
  }

  pickStretchHandle(raycaster) {
    const visibleHandles = this.letterStretchHandles.filter((handle) => handle.visible);

    if (!visibleHandles.length) {
      return null;
    }

    const hits = raycaster.intersectObjects(visibleHandles, false);
    return hits[0]?.object ?? null;
  }

  handleLetterPointerDown(raycaster, camera, modifiers = {}) {
    const stretchHandle = this.pickStretchHandle(raycaster);

    if (stretchHandle && this.selectedLetterIndex !== -1) {
      const { axes, signs, handleIndex } = stretchHandle.userData;
      const worldPosition = new THREE.Vector3();
      const planeNormal = new THREE.Vector3();
      const axisVectors = {};
      const quaternion = new THREE.Quaternion();
      const startWorld = new THREE.Vector3();
      const dragPlane = new THREE.Plane();

      stretchHandle.getWorldPosition(worldPosition);
      camera.getWorldDirection(planeNormal);
      dragPlane.setFromNormalAndCoplanarPoint(planeNormal, worldPosition);
      raycaster.ray.intersectPlane(dragPlane, startWorld);
      this.group.getWorldQuaternion(quaternion);

      for (const axis of axes) {
        const axisVector = new THREE.Vector3(
          axis === "x" ? 1 : 0,
          axis === "y" ? 1 : 0,
          axis === "z" ? 1 : 0
        );
        axisVector.applyQuaternion(quaternion).normalize();
        axisVectors[axis] = axisVector;
      }

      this.hoveredStretchHandleIndex = handleIndex;
      this.letterDrag = {
        type: "pull",
        handleIndex,
        letterIndex: this.selectedLetterIndex,
        axes,
        signs,
        axisVectors,
        dragPlane,
        startWorld,
        startPulls: { ...this.letterPulls[this.selectedLetterIndex] },
        startSizes: {
          x: Math.max(0.18, this.letterBounds[this.selectedLetterIndex].size.x),
          y: Math.max(0.18, this.letterBounds[this.selectedLetterIndex].size.y),
          z: Math.max(0.18, this.letterBounds[this.selectedLetterIndex].size.z)
        }
      };
      return true;
    }

    const letterIndex = this.pickLetterIndex(raycaster);

    if (letterIndex === -1) {
      this.selectedLetterIndex = -1;
      this.hoveredLetterIndex = -1;
      this.hoveredStretchHandleIndex = -1;
      this.letterDrag = null;
      this.localAxisGizmo.visible = false;
      this.letterStretchHandleGroup.visible = false;
      return false;
    }

    const axis = modifiers.altKey ? "z" : modifiers.shiftKey ? "y" : "xy";
    const dragPlane = new THREE.Plane();
    const worldCenter = this.letterBounds[letterIndex].center.clone().applyMatrix4(this.group.matrixWorld);
    const planeNormal = new THREE.Vector3();
    camera.getWorldDirection(planeNormal);
    dragPlane.setFromNormalAndCoplanarPoint(planeNormal, worldCenter);
    const startWorld = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, startWorld);
    this.selectedLetterIndex = letterIndex;
    this.hoveredLetterIndex = letterIndex;
    this.letterDrag = {
      type: "move",
      letterIndex,
      axis,
      dragPlane,
      startWorld,
      startOffset: this.letterOffsets[letterIndex].clone()
    };

    return true;
  }

  handleLetterSelect(raycaster) {
    const letterIndex = this.pickLetterIndex(raycaster);
    this.selectedLetterIndex = letterIndex;
    this.localAxisGizmo.visible = letterIndex !== -1;
    return letterIndex !== -1;
  }

  clearLetterSelection() {
    this.selectedLetterIndex = -1;
    this.hoveredLetterIndex = -1;
    this.hoveredStretchHandleIndex = -1;
    this.letterDrag = null;
    this.localAxisGizmo.visible = false;
    this.letterStretchHandleGroup.visible = false;
  }

  getSelectedLetterState() {
    if (this.selectedLetterIndex === -1) {
      return null;
    }

    const index = this.selectedLetterIndex;
    const character = this.letterSegmentation.characters[index] || "";
    const offset = this.letterOffsets[index];
    const scale = this.letterScales[index];
    const deform = this.letterDeforms[index];

    return {
      index,
      character,
      offset: {
        x: offset.x,
        y: offset.y,
        z: offset.z
      },
      scale: {
        x: scale.x,
        y: scale.y,
        z: scale.z
      },
      deform: {
        bend: {
          x: deform.bend.x,
          y: deform.bend.y,
          z: deform.bend.z
        },
        twist: {
          x: deform.twist.x,
          y: deform.twist.y,
          z: deform.twist.z
        },
        noise: deform.noise
      }
    };
  }

  updateSelectedLetterState(patch = {}) {
    if (this.selectedLetterIndex === -1) {
      return false;
    }

    const index = this.selectedLetterIndex;
    const offset = this.letterOffsets[index];
    const scale = this.letterScales[index];
    const deform = this.letterDeforms[index];

    if (patch.offset) {
      offset.set(
        Number.isFinite(patch.offset.x) ? patch.offset.x : offset.x,
        Number.isFinite(patch.offset.y) ? patch.offset.y : offset.y,
        Number.isFinite(patch.offset.z) ? patch.offset.z : offset.z
      );
    }

    if (patch.scale) {
      scale.set(
        THREE.MathUtils.clamp(Number.isFinite(patch.scale.x) ? patch.scale.x : scale.x, 0.4, 3),
        THREE.MathUtils.clamp(Number.isFinite(patch.scale.y) ? patch.scale.y : scale.y, 0.4, 3),
        THREE.MathUtils.clamp(Number.isFinite(patch.scale.z) ? patch.scale.z : scale.z, 0.4, 3)
      );
    }

    if (patch.deform?.bend) {
      deform.bend.set(
        THREE.MathUtils.clamp(Number.isFinite(patch.deform.bend.x) ? patch.deform.bend.x : deform.bend.x, -1.5, 1.5),
        THREE.MathUtils.clamp(Number.isFinite(patch.deform.bend.y) ? patch.deform.bend.y : deform.bend.y, -1.5, 1.5),
        THREE.MathUtils.clamp(Number.isFinite(patch.deform.bend.z) ? patch.deform.bend.z : deform.bend.z, -1.5, 1.5)
      );
    }

    if (patch.deform?.twist) {
      deform.twist.set(
        THREE.MathUtils.clamp(Number.isFinite(patch.deform.twist.x) ? patch.deform.twist.x : deform.twist.x, -1.5, 1.5),
        THREE.MathUtils.clamp(Number.isFinite(patch.deform.twist.y) ? patch.deform.twist.y : deform.twist.y, -1.5, 1.5),
        THREE.MathUtils.clamp(Number.isFinite(patch.deform.twist.z) ? patch.deform.twist.z : deform.twist.z, -1.5, 1.5)
      );
    }

    if (Number.isFinite(patch.deform?.noise)) {
      deform.noise = THREE.MathUtils.clamp(patch.deform.noise, 0, 1.5);
    }

    return true;
  }

  resetSelectedLetter() {
    if (this.selectedLetterIndex === -1) {
      return false;
    }

    const index = this.selectedLetterIndex;
    this.letterOffsets[index].set(0, 0, 0);
    this.letterScales[index].set(1, 1, 1);
    this.letterDeforms[index].bend.set(0, 0, 0);
    this.letterDeforms[index].twist.set(0, 0, 0);
    this.letterDeforms[index].noise = 0;
    Object.assign(this.letterPulls[index], {
      xPos: 0,
      xNeg: 0,
      yPos: 0,
      yNeg: 0,
      zPos: 0,
      zNeg: 0
    });
    return true;
  }

  resetAllLetters() {
    for (let index = 0; index < this.letterOffsets.length; index += 1) {
      this.letterOffsets[index].set(0, 0, 0);
      this.letterScales[index].set(1, 1, 1);
      this.letterDeforms[index].bend.set(0, 0, 0);
      this.letterDeforms[index].twist.set(0, 0, 0);
      this.letterDeforms[index].noise = 0;
      Object.assign(this.letterPulls[index], {
        xPos: 0,
        xNeg: 0,
        yPos: 0,
        yNeg: 0,
        zPos: 0,
        zNeg: 0
      });
    }

    return true;
  }

  handleLetterPointerMove(raycaster, camera, pointer, modifiers = {}) {
    const stretchHandle = this.pickStretchHandle(raycaster);
    this.hoveredStretchHandleIndex = stretchHandle?.userData?.handleIndex ?? -1;
    this.hoveredLetterIndex = this.pickLetterIndex(raycaster);

    if (!this.letterDrag) {
      return false;
    }

    if (this.letterDrag.type === "pull") {
      const currentWorld = new THREE.Vector3();
      raycaster.ray.intersectPlane(this.letterDrag.dragPlane, currentWorld);
      const dragDelta = currentWorld.sub(this.letterDrag.startWorld);
      const letterIndex = this.letterDrag.letterIndex;
      const pulls = this.letterPulls[letterIndex];
      Object.assign(pulls, this.letterDrag.startPulls);

      for (const axis of this.letterDrag.axes) {
        const projected = dragDelta.dot(this.letterDrag.axisVectors[axis]);
        const sign = this.letterDrag.signs[axis] || 1;
        const amount = THREE.MathUtils.clamp(
          this.letterDrag.startPulls[`${axis}${sign > 0 ? "Pos" : "Neg"}`] + (projected * sign) / this.letterDrag.startSizes[axis],
          -2.4,
          2.4
        );
        pulls[`${axis}${sign > 0 ? "Pos" : "Neg"}`] = amount;
      }

      return true;
    }

    const axis = modifiers.altKey ? "z" : modifiers.shiftKey ? "y" : "xy";
    this.letterDrag.axis = axis;

    const currentWorld = new THREE.Vector3();
    raycaster.ray.intersectPlane(this.letterDrag.dragPlane, currentWorld);
    const worldDelta = currentWorld.sub(this.letterDrag.startWorld);
    const distanceScale = Math.max(0.55, camera.position.distanceTo(this.group.position) * 0.16);
    const deltaY = pointer.y * distanceScale;
    const offset = this.letterOffsets[this.letterDrag.letterIndex];
    offset.copy(this.letterDrag.startOffset);

    if (axis === "z") {
      offset.z += -worldDelta.y - deltaY * 0.2;
    } else if (axis === "y") {
      offset.y += worldDelta.y;
    } else {
      offset.x += worldDelta.x;
      offset.y += worldDelta.y;
    }

    return true;
  }

  handleLetterPointerUp() {
    this.letterDrag = null;
  }

  handleLetterKey(event) {
    if (this.selectedLetterIndex === -1) {
      return false;
    }

    const scale = this.letterScales[this.selectedLetterIndex];
    const deform = this.letterDeforms[this.selectedLetterIndex];
    const adjust = (axis, delta) => {
      scale[axis] = THREE.MathUtils.clamp(scale[axis] + delta, 0.4, 3);
    };
    const adjustDeform = (group, axis, delta, min = -1.5, max = 1.5) => {
      group[axis] = THREE.MathUtils.clamp(group[axis] + delta, min, max);
    };

    if (event.code === "Digit1") {
      adjust("x", -0.08);
      return true;
    }

    if (event.code === "Digit2") {
      adjust("x", 0.08);
      return true;
    }

    if (event.code === "Digit3") {
      adjust("y", -0.08);
      return true;
    }

    if (event.code === "Digit4") {
      adjust("y", 0.08);
      return true;
    }

    if (event.code === "Digit5") {
      adjust("z", -0.08);
      return true;
    }

    if (event.code === "Digit6") {
      adjust("z", 0.08);
      return true;
    }

    if (event.code === "KeyQ") {
      adjustDeform(deform.bend, "x", -0.08);
      return true;
    }

    if (event.code === "KeyW") {
      adjustDeform(deform.bend, "x", 0.08);
      return true;
    }

    if (event.code === "KeyA") {
      adjustDeform(deform.bend, "y", -0.08);
      return true;
    }

    if (event.code === "KeyS") {
      adjustDeform(deform.bend, "y", 0.08);
      return true;
    }

    if (event.code === "KeyZ") {
      adjustDeform(deform.bend, "z", -0.08);
      return true;
    }

    if (event.code === "KeyX") {
      adjustDeform(deform.bend, "z", 0.08);
      return true;
    }

    if (event.code === "KeyE") {
      adjustDeform(deform.twist, "x", -0.08);
      return true;
    }

    if (event.code === "KeyR") {
      adjustDeform(deform.twist, "x", 0.08);
      return true;
    }

    if (event.code === "KeyD") {
      adjustDeform(deform.twist, "y", -0.08);
      return true;
    }

    if (event.code === "KeyF") {
      adjustDeform(deform.twist, "y", 0.08);
      return true;
    }

    if (event.code === "KeyC") {
      adjustDeform(deform.twist, "z", -0.08);
      return true;
    }

    if (event.code === "KeyV") {
      adjustDeform(deform.twist, "z", 0.08);
      return true;
    }

    if (event.code === "KeyG") {
      deform.noise = THREE.MathUtils.clamp(deform.noise - 0.05, 0, 1.5);
      return true;
    }

    if (event.code === "KeyH") {
      deform.noise = THREE.MathUtils.clamp(deform.noise + 0.05, 0, 1.5);
      return true;
    }

    if (event.code === "Backspace") {
      this.letterOffsets[this.selectedLetterIndex].set(0, 0, 0);
      this.letterScales[this.selectedLetterIndex].set(1, 1, 1);
      deform.bend.set(0, 0, 0);
      deform.twist.set(0, 0, 0);
      deform.noise = 0;
      Object.assign(this.letterPulls[this.selectedLetterIndex], {
        xPos: 0,
        xNeg: 0,
        yPos: 0,
        yNeg: 0,
        zPos: 0,
        zNeg: 0
      });
      return true;
    }

    if (event.code === "KeyT") {
      for (let index = 0; index < this.letterOffsets.length; index += 1) {
        this.letterOffsets[index].set(0, 0, 0);
        this.letterScales[index].set(1, 1, 1);
        this.letterDeforms[index].bend.set(0, 0, 0);
        this.letterDeforms[index].twist.set(0, 0, 0);
        this.letterDeforms[index].noise = 0;
        Object.assign(this.letterPulls[index], {
          xPos: 0,
          xNeg: 0,
          yPos: 0,
          yNeg: 0,
          zPos: 0,
          zNeg: 0
        });
      }
      return true;
    }

    return false;
  }

  applyLetterScaling() {
    const centers = Array.from({ length: this.letterSegmentation.count }, () => new THREE.Vector3());
    const counts = new Uint16Array(this.letterSegmentation.count);

    for (let pointIndex = 0; pointIndex < this.letterSegmentation.pointMap.length; pointIndex += 1) {
      const letterIndex = this.letterSegmentation.pointMap[pointIndex];
      const offset = pointIndex * 3;
      centers[letterIndex].x += this.pointCurrent[offset];
      centers[letterIndex].y += this.pointCurrent[offset + 1];
      centers[letterIndex].z += this.pointCurrent[offset + 2];
      counts[letterIndex] += 1;
    }

    for (let letterIndex = 0; letterIndex < centers.length; letterIndex += 1) {
      if (!counts[letterIndex]) {
        continue;
      }
      centers[letterIndex].multiplyScalar(1 / counts[letterIndex]);
    }

    const applyScale = (array, map) => {
      for (let pointIndex = 0; pointIndex < map.length; pointIndex += 1) {
        const letterIndex = map[pointIndex];
        const center = centers[letterIndex];
        const scale = this.letterScales[letterIndex];
        const offset = pointIndex * 3;
        array[offset] = center.x + (array[offset] - center.x) * scale.x;
        array[offset + 1] = center.y + (array[offset + 1] - center.y) * scale.y;
        array[offset + 2] = center.z + (array[offset + 2] - center.z) * scale.z;
      }
    };

    applyScale(this.pointCurrent, this.letterSegmentation.pointMap);
    applyScale(this.outlineCurrent, this.letterSegmentation.outlineMap);
    applyScale(this.meshCurrent, this.letterSegmentation.meshMap);
  }

  applyLetterDeformations() {
    const centers = Array.from({ length: this.letterSegmentation.count }, () => new THREE.Vector3());
    const counts = new Uint16Array(this.letterSegmentation.count);
    const extents = Array.from({ length: this.letterSegmentation.count }, () => new THREE.Vector3(0.18, 0.18, 0.18));

    for (let pointIndex = 0; pointIndex < this.letterSegmentation.pointMap.length; pointIndex += 1) {
      const letterIndex = this.letterSegmentation.pointMap[pointIndex];
      const offset = pointIndex * 3;
      centers[letterIndex].x += this.pointCurrent[offset];
      centers[letterIndex].y += this.pointCurrent[offset + 1];
      centers[letterIndex].z += this.pointCurrent[offset + 2];
      counts[letterIndex] += 1;
    }

    for (let letterIndex = 0; letterIndex < centers.length; letterIndex += 1) {
      if (!counts[letterIndex]) {
        continue;
      }
      centers[letterIndex].multiplyScalar(1 / counts[letterIndex]);
    }

    for (let pointIndex = 0; pointIndex < this.letterSegmentation.pointMap.length; pointIndex += 1) {
      const letterIndex = this.letterSegmentation.pointMap[pointIndex];
      const offset = pointIndex * 3;
      const center = centers[letterIndex];
      extents[letterIndex].x = Math.max(extents[letterIndex].x, Math.abs(this.pointCurrent[offset] - center.x));
      extents[letterIndex].y = Math.max(extents[letterIndex].y, Math.abs(this.pointCurrent[offset + 1] - center.y));
      extents[letterIndex].z = Math.max(extents[letterIndex].z, Math.abs(this.pointCurrent[offset + 2] - center.z));
    }

    const applyDeform = (array, map) => {
      for (let pointIndex = 0; pointIndex < map.length; pointIndex += 1) {
        const letterIndex = map[pointIndex];
        const deform = this.letterDeforms[letterIndex];
        const pulls = this.letterPulls[letterIndex];

        if (!deform) {
          continue;
        }

        const center = centers[letterIndex];
        const extent = extents[letterIndex];
        const offset = pointIndex * 3;
        let x = array[offset] - center.x;
        let y = array[offset + 1] - center.y;
        let z = array[offset + 2] - center.z;

        x += deform.bend.x * (y * y * 0.18 + z * z * 0.08) * (x >= 0 ? 1 : -1);
        y += deform.bend.y * (x * x * 0.18 + z * z * 0.08) * (y >= 0 ? 1 : -1);
        z += deform.bend.z * (x * x * 0.18 + y * y * 0.08) * (z >= 0 ? 1 : -1);

        let rotated = rotateYZ(y, z, deform.twist.x * THREE.MathUtils.clamp(x * 0.9, -1.5, 1.5));
        y = rotated.y;
        z = rotated.z;
        rotated = rotateXZ(x, z, deform.twist.y * THREE.MathUtils.clamp(y * 0.9, -1.5, 1.5));
        x = rotated.x;
        z = rotated.z;
        rotated = rotateXY(x, y, deform.twist.z * THREE.MathUtils.clamp(z * 0.9, -1.5, 1.5));
        x = rotated.x;
        y = rotated.y;

        if (deform.noise > 0.0001) {
          const noise = layeredNoise(x, y, z, 0, pointIndex * 0.013, deform.noise * 0.3, deform.noise * 0.12);
          x += noise * 0.18;
          y += noise * 0.14;
          z += noise * 0.2;
        }

        if (pulls) {
          const nxPos = smoothstep(0.2, 1, x / extent.x);
          const nxNeg = smoothstep(0.2, 1, -x / extent.x);
          const nyPos = smoothstep(0.2, 1, y / extent.y);
          const nyNeg = smoothstep(0.2, 1, -y / extent.y);
          const nzPos = smoothstep(0.2, 1, z / extent.z);
          const nzNeg = smoothstep(0.2, 1, -z / extent.z);
          const crossX = (1 - smoothstep(0.55, 1.05, Math.abs(y) / extent.y)) * (1 - smoothstep(0.55, 1.05, Math.abs(z) / extent.z));
          const crossY = (1 - smoothstep(0.55, 1.05, Math.abs(x) / extent.x)) * (1 - smoothstep(0.55, 1.05, Math.abs(z) / extent.z));
          const crossZ = (1 - smoothstep(0.55, 1.05, Math.abs(x) / extent.x)) * (1 - smoothstep(0.55, 1.05, Math.abs(y) / extent.y));

          x += pulls.xPos * nxPos * (0.45 + crossX * 0.55) * extent.x * 0.9;
          x -= pulls.xNeg * nxNeg * (0.45 + crossX * 0.55) * extent.x * 0.9;
          y += pulls.yPos * nyPos * (0.45 + crossY * 0.55) * extent.y * 0.9;
          y -= pulls.yNeg * nyNeg * (0.45 + crossY * 0.55) * extent.y * 0.9;
          z += pulls.zPos * nzPos * (0.45 + crossZ * 0.55) * extent.z * 0.9;
          z -= pulls.zNeg * nzNeg * (0.45 + crossZ * 0.55) * extent.z * 0.9;
        }

        array[offset] = center.x + x;
        array[offset + 1] = center.y + y;
        array[offset + 2] = center.z + z;
      }
    };

    applyDeform(this.pointCurrent, this.letterSegmentation.pointMap);
    applyDeform(this.outlineCurrent, this.letterSegmentation.outlineMap);
    applyDeform(this.meshCurrent, this.letterSegmentation.meshMap);
  }

  setAppearance({ strokeWidth, opacity, glowEnabled, glowBasePointsOnly, pointSize, pointOpacity, pointColorMode, pointColorA, pointColorB }) {
    const widthFactor = THREE.MathUtils.clamp((strokeWidth || 1.6) / 6, 0.1, 1.4);
    this.outlineScaleBoost = widthFactor;
    this.pointSizeFactor = THREE.MathUtils.clamp(Number(pointSize) || 1, 0.2, 6);
    this.pointOpacityFactor = THREE.MathUtils.clamp(Number(pointOpacity) || 0, 0, 1);
    this.pointColorMode = pointColorMode || "solid";
    this.pointColorA.set(pointColorA || this.settings.color);
    this.pointColorB.set(pointColorB || "#ffffff");
    this.excludeContentFromGlow = Boolean(glowBasePointsOnly);
    const contentLayer = this.excludeContentFromGlow ? 2 : 0;
    this.pointSpriteGroup.layers.set(contentLayer);
    this.pointSpriteGroup.traverse((object) => {
      object.layers.set(contentLayer);
    });

    for (let index = 0; index < this.lineLayers.length; index += 1) {
      const layer = this.lineLayers[index];
      layer.material.opacity = layer.opacity * opacity;
      layer.object.scale.setScalar(layer.baseScale + widthFactor * index * 0.012);
      layer.object.position.copy(layer.baseOffset).multiplyScalar(1 + widthFactor * 0.18);
    }

    this.pointMaterial.size = 0.055 * this.pointSizeFactor;
    this.pointMaterial.opacity = opacity * this.pointOpacityFactor;
    for (const item of this.pointSprites) {
      item.sprite.material.opacity = opacity;
    }
    this.meshMaterial.opacity = opacity * this.pointOpacityFactor * 0.9;
    this.meshMaterial.emissiveIntensity = glowEnabled ? 0.22 : 0.05;
  }

  hasNonBloomContentLayer() {
    return Boolean(this.excludeContentFromGlow && this.pointSpriteGroup.visible && this.pointSprites.length > 0);
  }

  applyForceFieldStep(runtime) {
    const centerIndices = this.interactiveIndices.length ? this.interactiveIndices : this.pointSpriteIndices;

    if (!centerIndices.length) {
      return;
    }

    const centers = [];

    for (let index = 0; index < centerIndices.length && centers.length < 6; index += 1) {
      const pointIndex = centerIndices[index];
      const offset = pointIndex * 3;
      centers.push(
        new THREE.Vector3(
          this.pointCurrent[offset],
          this.pointCurrent[offset + 1],
          this.pointCurrent[offset + 2]
        )
      );
    }

    const signForCenter = (centerIndex) => {
      if (this.forceFieldType === "attraction") {
        return 1;
      }

      if (this.forceFieldType === "repulsion") {
        return -1;
      }

      return centerIndex % 2 === 0 ? 1 : -1;
    };

    for (let index = 0; index < this.pointCurrent.length; index += 3) {
      let forceX = 0;
      let forceY = 0;
      let forceZ = 0;
      const px = this.pointCurrent[index];
      const py = this.pointCurrent[index + 1];
      const pz = this.pointCurrent[index + 2];

      for (let centerIndex = 0; centerIndex < centers.length; centerIndex += 1) {
        const center = centers[centerIndex];
        const dx = center.x - px;
        const dy = center.y - py;
        const dz = center.z - pz;
        const distanceSq = dx * dx + dy * dy + dz * dz + 0.06;
        const force = (0.012 / distanceSq) * signForCenter(centerIndex);
        forceX += dx * force;
        forceY += dy * force;
        forceZ += dz * force;
      }

      this.pointCurrent[index] += THREE.MathUtils.clamp(forceX, -0.18, 0.18);
      this.pointCurrent[index + 1] += THREE.MathUtils.clamp(forceY, -0.18, 0.18);
      this.pointCurrent[index + 2] += THREE.MathUtils.clamp(forceZ, -0.18, 0.18);
    }

    for (let index = 0; index < this.meshCurrent.length; index += 3) {
      let forceX = 0;
      let forceY = 0;
      let forceZ = 0;
      const px = this.meshCurrent[index];
      const py = this.meshCurrent[index + 1];
      const pz = this.meshCurrent[index + 2];

      for (let centerIndex = 0; centerIndex < centers.length; centerIndex += 1) {
        const center = centers[centerIndex];
        const dx = center.x - px;
        const dy = center.y - py;
        const dz = center.z - pz;
        const distanceSq = dx * dx + dy * dy + dz * dz + 0.08;
        const force = (0.009 / distanceSq) * signForCenter(centerIndex);
        forceX += dx * force;
        forceY += dy * force;
        forceZ += dz * force;
      }

      this.meshCurrent[index] += THREE.MathUtils.clamp(forceX, -0.14, 0.14);
      this.meshCurrent[index + 1] += THREE.MathUtils.clamp(forceY, -0.14, 0.14);
      this.meshCurrent[index + 2] += THREE.MathUtils.clamp(forceZ, -0.14, 0.14);
    }

    for (let index = 0; index < this.outlineCurrent.length; index += 3) {
      let forceX = 0;
      let forceY = 0;
      let forceZ = 0;
      const px = this.outlineCurrent[index];
      const py = this.outlineCurrent[index + 1];
      const pz = this.outlineCurrent[index + 2];

      for (let centerIndex = 0; centerIndex < centers.length; centerIndex += 1) {
        const center = centers[centerIndex];
        const dx = center.x - px;
        const dy = center.y - py;
        const dz = center.z - pz;
        const distanceSq = dx * dx + dy * dy + dz * dz + 0.08;
        const force = (0.008 / distanceSq) * signForCenter(centerIndex);
        forceX += dx * force;
        forceY += dy * force;
        forceZ += dz * force;
      }

      this.outlineCurrent[index] += THREE.MathUtils.clamp(forceX, -0.12, 0.12);
      this.outlineCurrent[index + 1] += THREE.MathUtils.clamp(forceY, -0.12, 0.12);
      this.outlineCurrent[index + 2] += THREE.MathUtils.clamp(forceZ, -0.12, 0.12);
    }
  }

  applyCurationStep(runtime) {
    if (!this.curationAnchors.size) {
      return;
    }

    const anchors = [...this.curationAnchors];

    for (let index = 0; index < this.pointCurrent.length; index += 3) {
      const pointIndex = index / 3;
      let nearestAnchor = anchors[0];
      let nearestDistanceSq = Infinity;

      for (const anchorPoint of anchors) {
        const anchorOffset = anchorPoint * 3;
        const dx = this.pointCurrent[anchorOffset] - this.pointCurrent[index];
        const dy = this.pointCurrent[anchorOffset + 1] - this.pointCurrent[index + 1];
        const dz = this.pointCurrent[anchorOffset + 2] - this.pointCurrent[index + 2];
        const distanceSq = dx * dx + dy * dy + dz * dz;

        if (distanceSq < nearestDistanceSq) {
          nearestDistanceSq = distanceSq;
          nearestAnchor = anchorPoint;
        }
      }

      if (!Number.isFinite(nearestDistanceSq) || nearestDistanceSq > 3.24) {
        continue;
      }

      const anchorOffset = nearestAnchor * 3;
      const ringAngle = pointIndex * 0.37 + runtime.time * 0.08;
      const ringRadius = 0.16 + (((hash01(pointIndex * 1.19) + 1) % 1) * 0.42);
      const influence = THREE.MathUtils.clamp(1 - Math.sqrt(nearestDistanceSq) / 1.8, 0, 1) * 0.28;
      const targetX = this.pointCurrent[anchorOffset] + Math.cos(ringAngle) * ringRadius;
      const targetY = this.pointCurrent[anchorOffset + 1] + Math.sin(ringAngle) * ringRadius * 0.7;
      const targetZ = this.pointCurrent[anchorOffset + 2] + Math.sin(ringAngle * 1.3) * 0.18;

      this.pointCurrent[index] = THREE.MathUtils.lerp(this.pointCurrent[index], targetX, influence);
      this.pointCurrent[index + 1] = THREE.MathUtils.lerp(this.pointCurrent[index + 1], targetY, influence);
      this.pointCurrent[index + 2] = THREE.MathUtils.lerp(this.pointCurrent[index + 2], targetZ, influence);
    }

    for (let index = 0; index < this.meshCurrent.length; index += 3) {
      const anchorPoint = anchors[(index / 3) % anchors.length];
      const anchorOffset = anchorPoint * 3;
      const influence = 0.08;
      this.meshCurrent[index] = THREE.MathUtils.lerp(this.meshCurrent[index], this.pointCurrent[anchorOffset], influence);
      this.meshCurrent[index + 1] = THREE.MathUtils.lerp(this.meshCurrent[index + 1], this.pointCurrent[anchorOffset + 1], influence);
      this.meshCurrent[index + 2] = THREE.MathUtils.lerp(this.meshCurrent[index + 2], this.pointCurrent[anchorOffset + 2], influence);
    }

    for (let index = 0; index < this.outlineCurrent.length; index += 3) {
      let nearestAnchor = anchors[0];
      let nearestDistanceSq = Infinity;

      for (const anchorPoint of anchors) {
        const anchorOffset = anchorPoint * 3;
        const dx = this.pointCurrent[anchorOffset] - this.outlineCurrent[index];
        const dy = this.pointCurrent[anchorOffset + 1] - this.outlineCurrent[index + 1];
        const dz = this.pointCurrent[anchorOffset + 2] - this.outlineCurrent[index + 2];
        const distanceSq = dx * dx + dy * dy + dz * dz;

        if (distanceSq < nearestDistanceSq) {
          nearestDistanceSq = distanceSq;
          nearestAnchor = anchorPoint;
        }
      }

      if (!Number.isFinite(nearestDistanceSq) || nearestDistanceSq > 3.24) {
        continue;
      }

      const anchorOffset = nearestAnchor * 3;
      const ringAngle = (index / 3) * 0.29 + runtime.time * 0.06;
      const ringRadius = 0.12 + ((((hash01(index * 0.43) + 1) % 1)) * 0.22);
      const influence = THREE.MathUtils.clamp(1 - Math.sqrt(nearestDistanceSq) / 1.8, 0, 1) * 0.18;
      this.outlineCurrent[index] = THREE.MathUtils.lerp(this.outlineCurrent[index], this.pointCurrent[anchorOffset] + Math.cos(ringAngle) * ringRadius, influence);
      this.outlineCurrent[index + 1] = THREE.MathUtils.lerp(this.outlineCurrent[index + 1], this.pointCurrent[anchorOffset + 1] + Math.sin(ringAngle) * ringRadius * 0.68, influence);
      this.outlineCurrent[index + 2] = THREE.MathUtils.lerp(this.outlineCurrent[index + 2], this.pointCurrent[anchorOffset + 2], influence);
    }
  }

  captureSnapshotState(runtime) {
    this.snapshotState = {
      pointCurrent: new Float32Array(this.pointCurrent),
      outlineCurrent: new Float32Array(this.outlineCurrent),
      wireCurrent: new Float32Array(this.wireCurrent),
      meshCurrent: new Float32Array(this.meshCurrent),
      meshScales: new Float32Array(this.data.meshScales.length),
      contentPositions: this.contentCurrentPositions.map((position) => position.clone()),
      contentScales: [...this.contentCurrentScales],
      contentOpacities: [...this.contentCurrentOpacities]
    };

    for (let index = 0; index < this.data.meshScales.length; index += 1) {
      this.snapshotState.meshScales[index] = this.data.meshScales[index] * (1 + runtime.animation.pulse * 0.08);
    }

    this.snapshotActive = true;
  }

  applySnapshotState() {
    if (!this.snapshotState) {
      return;
    }

    this.pointCurrent.set(this.snapshotState.pointCurrent);
    this.outlineCurrent.set(this.snapshotState.outlineCurrent);
    this.wireCurrent.set(this.snapshotState.wireCurrent);
    this.meshCurrent.set(this.snapshotState.meshCurrent);

    for (let index = 0; index < this.contentCurrentPositions.length; index += 1) {
      if (this.snapshotState.contentPositions[index]) {
        this.contentCurrentPositions[index].copy(this.snapshotState.contentPositions[index]);
      }
      this.contentCurrentScales[index] = this.snapshotState.contentScales[index] ?? this.contentCurrentScales[index];
      this.contentCurrentOpacities[index] = this.snapshotState.contentOpacities[index] ?? this.contentCurrentOpacities[index];
    }
  }

  applyBoundaryStep(runtime) {
    const boundaryShape = runtime.stepSettings?.boundaryShape || "box";
    const clampPoint = (array, index) => {
      if (boundaryShape === "sphere") {
        const x = array[index];
        const y = array[index + 1];
        const z = array[index + 2];
        const radius = 2.35;
        const length = Math.hypot(x, y, z) || 1;

        if (length > radius) {
          const bounce = 0.92 + ((((hash01(index * 0.31) + 1) % 1)) * 0.08);
          array[index] = (x / length) * radius * bounce;
          array[index + 1] = (y / length) * radius * bounce;
          array[index + 2] = (z / length) * radius * bounce;
        }

        return;
      }

      array[index] = THREE.MathUtils.clamp(array[index], -2.6, 2.6);
      array[index + 1] = THREE.MathUtils.clamp(array[index + 1], -1.95, 1.95);
      array[index + 2] = THREE.MathUtils.clamp(array[index + 2], -2.2, 2.2);
    };

    for (let index = 0; index < this.pointCurrent.length; index += 3) {
      clampPoint(this.pointCurrent, index);
    }

    for (let index = 0; index < this.meshCurrent.length; index += 3) {
      clampPoint(this.meshCurrent, index);
    }

    for (let index = 0; index < this.outlineCurrent.length; index += 3) {
      clampPoint(this.outlineCurrent, index);
    }
  }

  applyFieldShapeStep(runtime) {
    const shape = runtime.stepSettings?.fieldShape || "plane";

    if (shape === "plane") {
      for (let index = 0; index < this.pointCurrent.length; index += 3) {
        this.pointCurrent[index + 2] *= 0.22;
      }

      for (let index = 0; index < this.meshCurrent.length; index += 3) {
        this.meshCurrent[index + 2] *= 0.22;
      }

      for (let index = 0; index < this.outlineCurrent.length; index += 3) {
        this.outlineCurrent[index + 2] *= 0.22;
      }

      return;
    }

    const remap = (array, totalCount) => {
      for (let pointIndex = 0; pointIndex < totalCount; pointIndex += 1) {
        const index = pointIndex * 3;
        const normalized = totalCount > 1 ? pointIndex / (totalCount - 1) : 0;
        const detailX = array[index] * 0.08;
        const detailY = array[index + 1] * 0.08;
        const detailZ = array[index + 2] * 0.08;

        if (shape === "sphere") {
          const phi = normalized * Math.PI;
          const theta = normalized * Math.PI * 6;
          const radius = 1.65 + Math.sin(theta * 0.5) * 0.12;
          array[index] = Math.sin(phi) * Math.cos(theta) * radius + detailX;
          array[index + 1] = Math.cos(phi) * radius + detailY;
          array[index + 2] = Math.sin(phi) * Math.sin(theta) * radius + detailZ;
        } else if (shape === "spiral") {
          const angle = normalized * Math.PI * 10;
          const radius = 1.55 - normalized * 0.72;
          array[index] = Math.cos(angle) * radius + detailX;
          array[index + 1] = (normalized - 0.5) * 3.4 + detailY;
          array[index + 2] = Math.sin(angle) * radius + detailZ;
        } else if (shape === "ribbon") {
          const x = (normalized - 0.5) * 4.6;
          const y = Math.sin(normalized * Math.PI * 4 + runtime.time * 0.18) * 0.7;
          const z = Math.cos(normalized * Math.PI * 3) * 0.95;
          array[index] = x + detailX;
          array[index + 1] = y + detailY;
          array[index + 2] = z + detailZ;
        }
      }
    };

    remap(this.pointCurrent, this.pointCurrent.length / 3);
    remap(this.meshCurrent, this.meshCurrent.length / 3);
    remap(this.outlineCurrent, this.outlineCurrent.length / 3);
  }

  updateTrailStep(runtime) {
    if (runtime.stepMode !== "trail" || this.contentOnlyConfig.enabled) {
      this.trailLines.visible = false;
      this.trailMaterial.opacity = 0;
      return;
    }

    const historyDepth = THREE.MathUtils.clamp(Math.round(runtime.stepSettings?.trailLength || 7), 3, this.trailMaxLength);
    const current = new THREE.Vector3();
    let writeOffset = 0;

    this.trailLines.visible = true;

    for (let itemIndex = 0; itemIndex < this.interactiveIndices.length; itemIndex += 1) {
      this.getInteractivePosition(itemIndex, runtime, current);
      const history = this.trailHistory[itemIndex];

      for (let historyIndex = history.length - 1; historyIndex > 0; historyIndex -= 1) {
        history[historyIndex].copy(history[historyIndex - 1]);
      }

      history[0].copy(current);

      for (let historyIndex = 0; historyIndex < historyDepth - 1; historyIndex += 1) {
        if (writeOffset + 6 > this.trailPositions.length) {
          break;
        }

        const a = history[historyIndex];
        const b = history[historyIndex + 1];
        this.trailPositions[writeOffset] = a.x;
        this.trailPositions[writeOffset + 1] = a.y;
        this.trailPositions[writeOffset + 2] = a.z;
        this.trailPositions[writeOffset + 3] = b.x;
        this.trailPositions[writeOffset + 4] = b.y;
        this.trailPositions[writeOffset + 5] = b.z;
        writeOffset += 6;
      }
    }

    for (let index = writeOffset; index < this.trailPositions.length; index += 1) {
      this.trailPositions[index] = 9999;
    }

    this.trailAttribute.needsUpdate = true;
    this.trailGeometry.computeBoundingSphere();
    this.trailMaterial.opacity = 0.42;
  }

  getFilterMatch(item, itemIndex, pointIndex, runtime) {
    const filterKind = runtime.stepSettings?.filterKind || "all";
    const category = item
      ? getContentItemCategory(item, itemIndex)
      : this.pointAxisMeta.categories[pointIndex] ?? 0;
    const itemType = item?.type || null;
    return matchesFilterKind(filterKind, category, itemType);
  }

  update(runtime) {
    const bounds = this.data.bounds || { width: 4, height: 1.4, depth: 0.6 };
    const axisTarget = new THREE.Vector3();
    const letterOffset = new THREE.Vector3();

    for (let index = 0; index < this.data.pointRandoms.length; index += 1) {
      const offset = index * 3;
      const result = transformPoint(
        {
          x: this.data.pointPositions[offset],
          y: this.data.pointPositions[offset + 1],
          z: this.data.pointPositions[offset + 2]
        },
        {
          x: this.data.pointOrigins[offset],
          y: this.data.pointOrigins[offset + 1],
          z: this.data.pointOrigins[offset + 2]
        },
        this.data.pointRandoms[index],
        this.settings.revealOffset + this.data.pointDelays[index],
        runtime,
        this.settings.distortions,
        bounds
      );
      if (runtime.axisStep?.enabled) {
        resolveAxisPosition(result.x, result.y, result.z, index, this.pointAxisMeta, runtime, axisTarget);
        this.pointCurrent[offset] = axisTarget.x;
        this.pointCurrent[offset + 1] = axisTarget.y;
        this.pointCurrent[offset + 2] = axisTarget.z;
      } else {
        this.pointCurrent[offset] = result.x;
        this.pointCurrent[offset + 1] = result.y;
        this.pointCurrent[offset + 2] = result.z;
      }

      if (runtime.stepMode === "direct-manipulation") {
        letterOffset.copy(this.letterOffsets[this.letterSegmentation.pointMap[index]] || new THREE.Vector3());
        this.pointCurrent[offset] += letterOffset.x;
        this.pointCurrent[offset + 1] += letterOffset.y;
        this.pointCurrent[offset + 2] += letterOffset.z;
      }
    }

    if (runtime.cinematic?.enabled && runtime.cinematic.showPoints) {
      const depthSpeed = runtime.cinematic.depthSpeed ?? 0.6;

      for (let index = 0; index < this.pointCurrent.length; index += 3) {
        const pointIndex = index / 3;
        const depthDrift = Math.sin(runtime.time * depthSpeed * 0.42 + pointIndex * 0.035) * 0.26;
        const xySpread = runtime.expansionRandomness * 0.22;
        const zSpread = 0.1 + runtime.expansionRandomness * 0.18;

        this.pointCurrent[index] += this.chaosDirections[index] * xySpread;
        this.pointCurrent[index + 1] += this.chaosDirections[index + 1] * xySpread;
        this.pointCurrent[index + 2] += depthDrift + this.chaosDirections[index + 2] * zSpread;
      }
    }

    if (runtime.brand?.enabled || this.brandMode) {
      const handVariation = runtime.handControl?.mode === "brand" ? (runtime.handControl.brandVariation ?? 0) : 0;
      const orbitSpeed = (runtime.brand?.orbitSpeed ?? this.brandConfig.orbitSpeed ?? 0.62) * (0.8 + handVariation * 0.7);
      const orbitRadius = (runtime.brand?.orbitRadius ?? this.brandConfig.orbitRadius ?? 1.9) * (0.7 + handVariation * 0.5);
      const orbitRandomness = THREE.MathUtils.clamp((runtime.brand?.orbitRandomness ?? this.brandConfig.orbitRandomness ?? 0.28) + handVariation * 0.35, 0, 1);

      for (let index = 0; index < this.pointCurrent.length; index += 3) {
        const pointIndex = index / 3;
        const hashA = ((hash01(pointIndex * 1.27 + 0.13) + 1) % 1);
        const hashB = ((hash01(pointIndex * 1.79 + 0.31) + 1) % 1);
        const hashC = ((hash01(pointIndex * 2.41 + 0.53) + 1) % 1);
        const angle = runtime.time * orbitSpeed * (0.7 + hashA * 0.9) + pointIndex * 0.11;
        const radius = orbitRadius * (0.45 + hashB * 0.85);
        this.pointCurrent[index] = Math.cos(angle) * radius + this.chaosDirections[index] * orbitRandomness * 0.34;
        this.pointCurrent[index + 1] = Math.sin(angle * 1.2 + hashB * 3.4) * (0.2 + hashC * 0.9) + this.chaosDirections[index + 1] * orbitRandomness * 0.18;
        this.pointCurrent[index + 2] = Math.sin(angle * 0.84 + hashC * Math.PI * 2) * (0.95 + hashA * 1.3) + this.chaosDirections[index + 2] * orbitRandomness * 0.42;
      }
    }

    if (runtime.interactionMode === "chaos" && runtime.chaosBurst > 0.001) {
      const spread = 1.4 * runtime.chaosBurst;

      for (let index = 0; index < this.pointCurrent.length; index += 3) {
        this.pointCurrent[index] += this.chaosDirections[index] * spread;
        this.pointCurrent[index + 1] += this.chaosDirections[index + 1] * spread;
        this.pointCurrent[index + 2] += this.chaosDirections[index + 2] * spread;
      }
    } else if (runtime.interactionMode === "cluster") {
      for (let index = 0; index < this.pointCurrent.length; index += 3) {
        const pointIndex = index / 3;
        const clusterCenter = this.clusterCenters[this.clusterAssignments[pointIndex]];
        const pull = 0.42 + Math.sin(runtime.time * 1.1 + pointIndex * 0.03) * 0.08;
        this.pointCurrent[index] = THREE.MathUtils.lerp(this.pointCurrent[index], clusterCenter.x, pull);
        this.pointCurrent[index + 1] = THREE.MathUtils.lerp(this.pointCurrent[index + 1], clusterCenter.y, pull);
        this.pointCurrent[index + 2] = THREE.MathUtils.lerp(this.pointCurrent[index + 2], clusterCenter.z, pull);
      }
    }

    for (let index = 0; index < this.outlineRandoms.length; index += 1) {
      const offset = index * 3;
      const result = transformPoint(
        {
          x: this.outlineBase[offset],
          y: this.outlineBase[offset + 1],
          z: this.outlineBase[offset + 2]
        },
        {
          x: this.outlineOrigins[offset],
          y: this.outlineOrigins[offset + 1],
          z: this.outlineOrigins[offset + 2]
        },
        this.outlineRandoms[index],
        this.settings.revealOffset + this.outlineDelays[index],
        runtime,
        this.settings.distortions,
        bounds
      );
      if (runtime.axisStep?.enabled) {
        resolveAxisPosition(result.x, result.y, result.z, index, this.outlineAxisMeta, runtime, axisTarget);
        this.outlineCurrent[offset] = axisTarget.x;
        this.outlineCurrent[offset + 1] = axisTarget.y;
        this.outlineCurrent[offset + 2] = axisTarget.z;
      } else {
        this.outlineCurrent[offset] = result.x;
        this.outlineCurrent[offset + 1] = result.y;
        this.outlineCurrent[offset + 2] = result.z;
      }

      if (runtime.stepMode === "direct-manipulation") {
        letterOffset.copy(this.letterOffsets[this.letterSegmentation.outlineMap[index]] || new THREE.Vector3());
        this.outlineCurrent[offset] += letterOffset.x;
        this.outlineCurrent[offset + 1] += letterOffset.y;
        this.outlineCurrent[offset + 2] += letterOffset.z;
      }
    }

    for (let index = 0; index < this.outlineSegments.length; index += 1) {
      const sourceIndex = this.outlineSegments[index] * 3;
      const targetIndex = index * 3;
      this.wireCurrent[targetIndex] = this.outlineCurrent[sourceIndex];
      this.wireCurrent[targetIndex + 1] = this.outlineCurrent[sourceIndex + 1];
      this.wireCurrent[targetIndex + 2] = this.outlineCurrent[sourceIndex + 2];
    }

    for (let index = 0; index < this.data.meshRandoms.length; index += 1) {
      const offset = index * 3;
      const result = transformPoint(
        {
          x: this.data.meshPositions[offset],
          y: this.data.meshPositions[offset + 1],
          z: this.data.meshPositions[offset + 2]
        },
        {
          x: this.data.meshOrigins[offset],
          y: this.data.meshOrigins[offset + 1],
          z: this.data.meshOrigins[offset + 2]
        },
        this.data.meshRandoms[index],
        this.settings.revealOffset + this.data.meshDelays[index],
        runtime,
        this.settings.distortions,
        bounds
      );

      if (runtime.axisStep?.enabled) {
        resolveAxisPosition(result.x, result.y, result.z, index, this.meshAxisMeta, runtime, axisTarget);
        this.meshCurrent[offset] = axisTarget.x;
        this.meshCurrent[offset + 1] = axisTarget.y;
        this.meshCurrent[offset + 2] = axisTarget.z;
      } else {
        this.meshCurrent[offset] = result.x;
        this.meshCurrent[offset + 1] = result.y;
        this.meshCurrent[offset + 2] = result.z;
      }

      if (runtime.stepMode === "direct-manipulation") {
        letterOffset.copy(this.letterOffsets[this.letterSegmentation.meshMap[index]] || new THREE.Vector3());
        this.meshCurrent[offset] += letterOffset.x;
        this.meshCurrent[offset + 1] += letterOffset.y;
        this.meshCurrent[offset + 2] += letterOffset.z;
      }

    }

    if (runtime.stepMode === "force-field") {
      this.applyForceFieldStep(runtime);
    } else if (runtime.stepMode === "curation") {
      this.applyCurationStep(runtime);
    } else if (runtime.stepMode === "field-shape") {
      this.applyFieldShapeStep(runtime);
    } else if (runtime.stepMode === "boundary") {
      this.applyBoundaryStep(runtime);
    }

    if (runtime.stepMode === "force-field" || runtime.stepMode === "curation") {
      for (let index = 0; index < this.outlineSegments.length; index += 1) {
        const sourceIndex = this.outlineSegments[index] * 3;
        const targetIndex = index * 3;
        this.wireCurrent[targetIndex] = this.outlineCurrent[sourceIndex];
        this.wireCurrent[targetIndex + 1] = this.outlineCurrent[sourceIndex + 1];
        this.wireCurrent[targetIndex + 2] = this.outlineCurrent[sourceIndex + 2];
      }
    }

    if (runtime.stepMode === "field-shape" || runtime.stepMode === "boundary") {
      for (let index = 0; index < this.outlineSegments.length; index += 1) {
        const sourceIndex = this.outlineSegments[index] * 3;
        const targetIndex = index * 3;
        this.wireCurrent[targetIndex] = this.outlineCurrent[sourceIndex];
        this.wireCurrent[targetIndex + 1] = this.outlineCurrent[sourceIndex + 1];
        this.wireCurrent[targetIndex + 2] = this.outlineCurrent[sourceIndex + 2];
      }
    }

    if (runtime.stepMode === "direct-manipulation") {
      this.applyLetterDeformations();
      this.applyLetterScaling();

      for (let index = 0; index < this.outlineSegments.length; index += 1) {
        const sourceIndex = this.outlineSegments[index] * 3;
        const targetIndex = index * 3;
        this.wireCurrent[targetIndex] = this.outlineCurrent[sourceIndex];
        this.wireCurrent[targetIndex + 1] = this.outlineCurrent[sourceIndex + 1];
        this.wireCurrent[targetIndex + 2] = this.outlineCurrent[sourceIndex + 2];
      }
    }

    if (runtime.stepMode === "snapshot") {
      if (!this.snapshotActive || !this.snapshotState) {
        this.captureSnapshotState(runtime);
      }
      this.applySnapshotState();
    } else {
      this.snapshotActive = false;
    }

    const activePointColorMode = runtime.brand?.enabled || this.brandMode
      ? (runtime.brand?.pointColorMode || this.pointColorMode)
      : this.pointColorMode;
    const activePointColorA = runtime.brand?.enabled || this.brandMode
      ? new THREE.Color(runtime.brand?.pointColorA || this.pointColorA)
      : this.pointColorA;
    const activePointColorB = runtime.brand?.enabled || this.brandMode
      ? new THREE.Color(runtime.brand?.pointColorB || this.pointColorB)
      : this.pointColorB;

    for (let index = 0; index < this.data.pointRandoms.length; index += 1) {
      const offset = index * 3;
      const replacementIndex = this.pointSpritePointIndexMap.get(index);

      if (Number.isInteger(replacementIndex)) {
        this.pointColors[offset] = 0;
        this.pointColors[offset + 1] = 0;
        this.pointColors[offset + 2] = 0;
        continue;
      }

      resolveDisplayColor(
        activePointColorMode,
        activePointColorA,
        activePointColorB,
        this.data.pointRandoms[index] ?? 0,
        this.pointCurrent[offset],
        this.pointCurrent[offset + 1],
        this.pointCurrent[offset + 2],
        bounds,
        this.tempPointColor
      );
      this.pointColors[offset] = this.tempPointColor.r;
      this.pointColors[offset + 1] = this.tempPointColor.g;
      this.pointColors[offset + 2] = this.tempPointColor.b;
    }

    for (let index = 0; index < this.data.meshRandoms.length; index += 1) {
      const offset = index * 3;
      this.meshDummy.position.set(this.meshCurrent[offset], this.meshCurrent[offset + 1], this.meshCurrent[offset + 2]);
      const snapshotScale = this.snapshotState?.meshScales?.[index];
      let scale = runtime.stepMode === "snapshot" && snapshotScale
        ? snapshotScale
        : this.data.meshScales[index] * (1 + runtime.animation.pulse * 0.08);

      if (runtime.stepMode === "filter") {
        const meshCategory = this.meshAxisMeta.categories[index] ?? 0;
        const matched = matchesFilterKind(runtime.stepSettings?.filterKind || "all", meshCategory, null);
        scale *= matched ? 1.14 : 0.42;
      }

      scale *= this.pointSizeFactor;
      this.meshDummy.scale.setScalar(scale);
      this.meshDummy.updateMatrix();
      this.meshObject.setMatrixAt(index, this.meshDummy.matrix);
      resolveDisplayColor(
        this.pointColorMode,
        this.pointColorA,
        this.pointColorB,
        this.data.meshRandoms[index] ?? 0,
        this.meshCurrent[offset],
        this.meshCurrent[offset + 1],
        this.meshCurrent[offset + 2],
        bounds,
        this.tempPointColor
      );
      this.meshObject.setColorAt(index, this.tempPointColor);
    }

    this.pointAttribute.needsUpdate = true;
    this.pointColorAttribute.needsUpdate = true;
    if (runtime.brand?.enabled || this.brandMode) {
      const density = THREE.MathUtils.clamp(runtime.brand?.pointDensity ?? 1, 0.05, 1);
      const visiblePoints = Math.max(1, Math.floor((this.pointCurrent.length / 3) * density));
      this.pointGeometry.setDrawRange(0, visiblePoints);
      this.pointMaterial.size = 0.055 * (runtime.brand?.pointSize ?? this.pointSizeFactor);
    } else {
      this.pointGeometry.setDrawRange(0, this.pointCurrent.length / 3);
      this.pointMaterial.size = 0.055 * this.pointSizeFactor;
    }

    for (let layerIndex = 0; layerIndex < this.lineLayers.length; layerIndex += 1) {
      const layer = this.lineLayers[layerIndex];

      for (let index = 0; index < this.wireCurrent.length; index += 3) {
        layer.positions[index] = this.wireCurrent[index];
        layer.positions[index + 1] = this.wireCurrent[index + 1];
        layer.positions[index + 2] = this.wireCurrent[index + 2];
      }

      layer.attribute.needsUpdate = true;
      layer.geometry.computeBoundingSphere();
    }

    this.updateTrailStep(runtime);
    this.meshObject.instanceMatrix.needsUpdate = true;
    if (this.meshObject.instanceColor) {
      this.meshObject.instanceColor.needsUpdate = true;
    }
    this.updateEditorial(runtime);
    this.updateLetterHandles();

    if ((runtime.stepMode === "direct-manipulation" || runtime.stepMode === "axis-visualization") && this.selectedLetterIndex !== -1) {
      this.getLetterCenter(this.selectedLetterIndex, axisTarget);
      this.localAxisGizmo.position.copy(axisTarget);
      this.localAxisGizmo.visible = true;
    } else {
      this.localAxisGizmo.visible = false;
    }
  }

  getBasePointPosition(pointIndex, target) {
    const offset = pointIndex * 3;
    target.set(this.pointCurrent[offset], this.pointCurrent[offset + 1], this.pointCurrent[offset + 2]);
    return target;
  }

  resolveMediaSpaceTargetPosition(index, runtime, target) {
    const item = this.pointSprites[index];

    if (!item) {
      return target.set(9999, 9999, 9999);
    }

    const total = Math.max(1, this.pointSprites.length);
    const normalized = total > 1 ? index / (total - 1) : 0;
    const hashA = ((hash01(index * 1.91 + 0.17) + 1) % 1);
    const hashB = ((hash01(index * 2.43 + 0.29) + 1) % 1);
    const hashC = ((hash01(index * 2.97 + 0.53) + 1) % 1);
    const preset = runtime.stepSettings?.mediaSpacePreset || "depth-field";
    const driftX = Math.sin(runtime.time * 0.11 + index * 0.37) * 0.08;
    const driftY = Math.cos(runtime.time * 0.09 + index * 0.24) * 0.06;
    const driftZ = Math.sin(runtime.time * 0.07 + index * 0.18) * 0.1;

    if (preset === "tunnel") {
      const depth = -normalized * 5.6;
      const laneAngle = hashA * Math.PI * 2;
      const laneRadius = 0.28 + hashB * 1.08;
      return target.set(
        Math.cos(laneAngle) * laneRadius * (1 + normalized * 0.12) + driftX,
        Math.sin(laneAngle) * laneRadius * 0.68 + driftY,
        depth + driftZ
      );
    }

    if (preset === "sphere-orbit") {
      const phi = Math.acos(1 - 2 * normalized);
      const theta = normalized * Math.PI * 7 + hashA * 0.8 + runtime.time * 0.04;
      const radius = 2.2 + (hashB - 0.5) * 0.42;
      return target.set(
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.cos(phi) * radius * 0.84,
        Math.sin(phi) * Math.sin(theta) * radius
      );
    }

    if (preset === "walls") {
      const wall = index % 3;
      const band = Math.floor(index / 3);
      const cols = Math.max(3, Math.ceil(Math.sqrt(total / 3)));
      const row = Math.floor(band / cols);
      const column = band % cols;
      const baseY = 1.25 - row * 0.52 + driftY;

      if (wall === 0) {
        return target.set(-2.35, baseY, (column - (cols - 1) / 2) * 0.74 + driftZ);
      }

      if (wall === 1) {
        return target.set(2.35, baseY, (column - (cols - 1) / 2) * 0.74 - driftZ);
      }

      return target.set(
        (column - (cols - 1) / 2) * 0.74 + driftX,
        baseY,
        -2.3 + Math.sin(column * 0.9) * 0.16
      );
    }

    if (preset === "stacked-cards") {
      const stackDepth = -normalized * 2.6;
      return target.set(
        (hashA - 0.5) * 0.9 + driftX,
        (hashB - 0.5) * 0.6 + driftY,
        stackDepth + (hashC - 0.5) * 0.35
      );
    }

    return target.set(
      (hashA - 0.5) * 3.1 + driftX,
      (hashB - 0.5) * 1.9 + driftY,
      1.3 - normalized * 5.2 + driftZ
    );
  }

  resolveCinematicTargetPosition(index, runtime, target) {
    const item = this.pointSprites[index];

    if (!item) {
      return target.set(9999, 9999, 9999);
    }

    const total = Math.max(1, this.pointSprites.length);
    const normalized = total > 1 ? index / (total - 1) : 0;
    const hashA = ((hash01(index * 1.47 + 0.13) + 1) % 1);
    const hashB = ((hash01(index * 1.93 + 0.39) + 1) % 1);
    const hashC = ((hash01(index * 2.61 + 0.57) + 1) % 1);
    const config = runtime.cinematic || {};
    const preset = config.layoutPreset || "depth-field";
    const direction = config.direction === "backward" ? -1 : 1;
    const speed = config.depthSpeed ?? 0.6;
    const loopPhase = (runtime.time * speed * 0.25 + normalized) % 1;
    const loopZ = direction * Math.sin(loopPhase * Math.PI * 2) * 1.45;

    if (preset === "tunnel") {
      const angle = normalized * Math.PI * 6 + hashA * 0.7;
      const radius = 0.45 + hashB * 1.6;
      return target.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.68,
        -normalized * 6.8 + loopZ
      );
    }

    if (preset === "media-walls") {
      const wall = index % 3;
      const band = Math.floor(index / 3);
      const cols = Math.max(3, Math.ceil(Math.sqrt(total / 3)));
      const row = Math.floor(band / cols);
      const column = band % cols;
      const baseY = 1.45 - row * 0.54 + (hashB - 0.5) * 0.1;

      if (wall === 0) {
        return target.set(-2.55, baseY, (column - (cols - 1) / 2) * 0.82 + loopZ * 0.12);
      }

      if (wall === 1) {
        return target.set(2.55, baseY, (column - (cols - 1) / 2) * 0.82 - loopZ * 0.12);
      }

      return target.set(
        (column - (cols - 1) / 2) * 0.76,
        baseY,
        -2.85 + loopZ * 0.4
      );
    }

    if (preset === "floating-cards") {
      return target.set(
        (hashA - 0.5) * 3.2,
        (hashB - 0.5) * 1.7,
        -normalized * 4.6 + loopZ + (hashC - 0.5) * 0.44
      );
    }

    return target.set(
      (hashA - 0.5) * 2.6,
      (hashB - 0.5) * 1.65,
      1.3 - normalized * 5.8 + loopZ + (hashC - 0.5) * 0.28
    );
  }

  updateBrandFocus(runtime) {
    if (!this.brandMode || !this.pointSprites.length) {
      return;
    }

    const candidates = this.getBrandCandidateIndices();

    if (!candidates.length) {
      this.activeBrandIndex = -1;
      this.brandFocusSpriteIndex = -1;
      return;
    }

    if (!candidates.includes(this.activeBrandIndex)) {
      this.setActiveBrand(candidates[0]);
    }

    if (!runtime.handControl?.enabled || runtime.handControl.mode !== "brand" || !runtime.brand?.enabled) {
      return;
    }

    const switchX = runtime.handControl.brandSwitchX ?? 0;
    const nextPulse = runtime.handControl.brandNextPulse ?? 0;
    const now = runtime.time;

    if (nextPulse > 0.5 && now - this.lastBrandSwitchAt >= 0.48) {
      const currentIndex = Math.max(0, candidates.indexOf(this.activeBrandIndex));
      const nextIndex = (currentIndex + 1) % candidates.length;
      this.setActiveBrand(candidates[nextIndex]);
      this.lastBrandSwitchAt = now;
      return;
    }

    if (Math.abs(switchX) < 0.46 || now - this.lastBrandSwitchAt < 0.48) {
      return;
    }

    const currentIndex = Math.max(0, candidates.indexOf(this.activeBrandIndex));
    const direction = switchX > 0 ? 1 : -1;
    const nextIndex = (currentIndex + direction + candidates.length) % candidates.length;
    this.setActiveBrand(candidates[nextIndex]);
    this.lastBrandSwitchAt = now;
  }

  resolveBrandMainVisual(runtime) {
    const config = runtime.brand || this.brandConfig;
    const mainTextures = this.brandAssets.mainTextures || [];
    const kind = config.mainKind || "auto";
    const mainText = String(config.mainText || "").trim();
    const wantsText = (kind === "text" || (kind === "auto" && !mainTextures.length)) && Boolean(mainText);

    if (this.brandVisualCache.signature) {
      return {
        type: this.brandVisualCache.mainType || (wantsText ? "text" : (mainTextures.length ? "image" : "none")),
        texture: this.brandVisualCache.main
      };
    }

    if (wantsText) {
      return {
        type: "text",
        texture: createBrandTextTexture(mainText, {
          fontSize: config.textFontSize,
          align: config.textAlign,
          color: config.textColor
        })
      };
    }

    if (mainTextures.length) {
      return {
        type: "image",
        texture: createBrandImageTexture(mainTextures[0])
      };
    }

    return {
      type: "none",
      texture: null
    };
  }

  resolveBrandMainVisualType(runtime) {
    const config = runtime.brand || this.brandConfig;
    const mainTextures = this.brandAssets.mainTextures || [];
    const kind = config.mainKind || "auto";
    return (kind === "text" || (kind === "auto" && !mainTextures.length))
      ? (String(config.mainText || "").trim() ? "text" : "none")
      : (mainTextures.length ? "image" : "none");
  }

  resolveBrandOrbitVisual(index, runtime) {
    if (!this.brandVisualCache.orbit.length) {
      return null;
    }

    return {
      type: "mixed",
      texture: this.brandVisualCache.orbit[index % this.brandVisualCache.orbit.length]
    };
  }

  resolveBrandActiveVisual(index, runtime) {
    const config = runtime.brand || this.brandConfig;
    const mainTextures = this.brandAssets.mainTextures || [];
    const hasExplicitMain = (config.mainKind === "image" && mainTextures.length)
      || config.mainKind === "text"
      || mainTextures.length > 0
      || Boolean((config.mainText || "").trim());

    if (hasExplicitMain) {
      return this.resolveBrandMainVisual(runtime);
    }

    const orbitVisual = this.resolveBrandOrbitVisual(index, runtime);
    return orbitVisual?.texture ? orbitVisual : this.resolveBrandMainVisual(runtime);
  }

  isBrandSpriteVisible(item, runtime, visualType = item.type) {
    const config = this.getResolvedBrandConfig(runtime);

    if (visualType === "image") {
      return config.showImages !== false;
    }

    if (visualType === "text") {
      return config.showText !== false;
    }

    return true;
  }

  resolveBrandTargetPosition(index, runtime, target) {
    const total = Math.max(1, this.pointSprites.length);
    const normalized = total > 1 ? index / (total - 1) : 0;
    const config = this.getResolvedBrandConfig(runtime);
    const seed = config.orbitLayoutSeed ?? 0;
    const hashA = ((hash01(index * 1.37 + 0.17 + seed * 0.37) + 1) % 1);
    const hashB = ((hash01(index * 1.91 + 0.43 + seed * 0.61) + 1) % 1);
    const hashC = ((hash01(index * 2.63 + 0.71 + seed * 0.89) + 1) % 1);
    const handVariation = runtime.handControl?.mode === "brand" ? (runtime.handControl.brandVariation ?? 0) : 0;
    const orbitSpeed = (config.orbitSpeedResolved ?? 0.62) * (0.7 + hashB * 0.9);
    const orbitRadiusBase = (config.orbitDistance ?? config.orbitRadius ?? 1.9) * (config.frame?.orbitRadiusScale ?? 1);
    const orbitRadius = orbitRadiusBase * (0.55 + hashA * 0.95) * (1 + handVariation * 0.55);
    const orbitRandomness = THREE.MathUtils.clamp((config.orbitRandomnessResolved ?? 0.28) + handVariation * 0.25, 0, 1);
    const depthSpread = (config.orbitDepthSpread ?? 1.6) * (config.frame?.depthSpreadScale ?? 1);
    const numberOfRings = Math.max(1, Math.round(config.numberOfRings ?? 2));
    const orbitSpacing = (config.orbitSpacing ?? 0.38) * (config.frame?.orbitSpacingScale ?? 1);
    const orbitJitter = config.orbitJitterResolved ?? 0.12;
    const clusterStrength = config.clusterStrength ?? 0.4;
    const attractionToHero = config.attractionToHero ?? 0.65;
    const repulsionFromHero = config.repulsionFromHero ?? 0.22;
    const brandWeight = config.brandWeightResolved ?? 1;
    const frame = config.frame || getBrandOutputFrame(config.outputPreset || "poster");
    const heroIndices = this.getBrandHeroIndices(config);
    const heroSlot = heroIndices.indexOf(index);
    const transition = this.getBrandTransition(runtime);
    const activeDepthOffset = THREE.MathUtils.clamp(config.activeDepthOffset ?? 0.35, -1, 1);
    const centeredDepth = THREE.MathUtils.clamp(
      THREE.MathUtils.lerp(-1.05, 1.1, (activeDepthOffset + 1) * 0.5) + (config.mainDepth ?? 0) * 0.22,
      -1.2,
      1.25
    );
    const heroCenter = new THREE.Vector3(frame.heroOffsetX, frame.heroOffsetY, centeredDepth);

    if (heroSlot !== -1) {
      let x = heroCenter.x;
      let y = heroCenter.y;
      let z = heroCenter.z;

      if (index === this.activeBrandIndex) {
        x += this.brandHeroOffset.x;
        y += this.brandHeroOffset.y;
        z += this.brandHeroOffset.z;
      }

      if (config.preset === "asymmetric-editorial") {
        x += heroSlot === 0 ? -0.46 : 0.46;
        y += 0.08;
      } else if (config.preset === "runway-brand") {
        y -= 0.12;
        x += heroSlot === 0 ? -0.24 : 0.24;
      } else if (config.preset === "tunnel-brand") {
        z += 0.22;
      } else if (config.preset === "wall-brand") {
        z -= 0.08;
      } else if (config.preset === "minimal-luxury") {
        y += 0.12;
      } else if (config.preset === "data-axis-brand") {
        y += 0.04;
      }

      if (config.dualHeroEnabled && heroIndices.length > 1) {
        const balance = THREE.MathUtils.clamp(config.dualHeroBalance ?? 0.5, 0, 1);
        const spread = config.dualHeroDistance ?? 1.5;
        x += heroSlot === 0
          ? -spread * (1 - balance)
          : spread * balance;
      }

      x += Math.sin(runtime.time * 0.42 + heroSlot * 0.6) * 0.025;
      y += Math.cos(runtime.time * 0.36 + heroSlot * 0.4) * 0.02;

      if (transition.active) {
        const enterStrength = 1 - transition.eased;
        const style = transition.style;
        if (index === transition.to) {
          if (style === "slide") {
            x += enterStrength * 1.6;
          } else if (style === "dissolve") {
            z += enterStrength * 0.28;
          } else if (style === "zoom-through") {
            z -= enterStrength * 1.5;
          } else if (style === "push-pull-depth") {
            z += enterStrength * 1.2;
          } else if (style === "orbit-replace") {
            x += Math.cos(index + runtime.time) * enterStrength * 0.9;
            y += Math.sin(index * 0.6) * enterStrength * 0.45;
          } else if (style === "glitch-switch") {
            x += Math.sin(runtime.time * 32 + index) * enterStrength * 0.08;
            y += Math.cos(runtime.time * 28 + index) * enterStrength * 0.06;
          } else if (style === "fade-through-points") {
            z += enterStrength * 0.55;
            y += Math.sin(runtime.time * 8 + index) * enterStrength * 0.05;
          }
        }
      }

      return target.set(x, y, z);
    }

    const ringIndex = index - heroIndices.filter((heroIndex) => heroIndex < index).length;
    const angle = runtime.time * orbitSpeed + ringIndex * 0.63 + hashA * Math.PI * 2;
    const ring = ringIndex % numberOfRings;
    const ringRadius = orbitRadius + ring * orbitSpacing;
    const radial = ringRadius + Math.sin(runtime.time * 0.31 + index * 0.27) * orbitJitter * 0.5;
    const spreadX = (((hash01(index * 3.17 + 0.19) + 1) % 1) - 0.5) * orbitRandomness * 1.5;
    const spreadY = (((hash01(index * 4.11 + 0.57) + 1) % 1) - 0.5) * orbitRandomness * 0.95;
    const spreadZ = (((hash01(index * 5.03 + 0.83) + 1) % 1) - 0.5) * orbitRandomness * 2.1;
    const direction = ring % 2 === 0 ? 1 : -1;
    let x = 0;
    let y = 0;
    let z = 0;

    switch (config.preset) {
      case "split-orbit": {
        const side = ringIndex % 2 === 0 ? -1 : 1;
        x = heroCenter.x + side * (ringRadius + 0.6) + Math.cos(angle) * 0.35;
        y = heroCenter.y + Math.sin(angle) * (0.42 + ring * 0.08);
        z = heroCenter.z - 0.9 + Math.sin(angle * 0.8) * depthSpread * 0.45;
        break;
      }
      case "tunnel-brand": {
        x = heroCenter.x + Math.cos(angle) * (0.4 + ring * 0.18);
        y = heroCenter.y + Math.sin(angle) * (0.24 + ring * 0.14);
        z = heroCenter.z - 1.2 - normalized * (2.4 + ring * 0.5);
        break;
      }
      case "wall-brand": {
        const wall = ringIndex % 3;
        x = heroCenter.x + (wall === 0 ? -2.25 : wall === 1 ? 2.25 : Math.cos(angle) * 1.6);
        y = heroCenter.y + 1.05 - (Math.floor(ringIndex / 3) % 6) * 0.42;
        z = heroCenter.z - 0.8 + (wall === 2 ? Math.sin(angle) * 0.55 : Math.cos(angle) * 0.18);
        break;
      }
      case "cluster-brand": {
        const clusterAngle = (ringIndex % 4) * (Math.PI * 0.5) + hashA * 0.4;
        const clusterRadius = ringRadius * (0.55 + clusterStrength * 0.35);
        x = heroCenter.x + Math.cos(clusterAngle) * clusterRadius + Math.cos(angle) * 0.3;
        y = heroCenter.y + Math.sin(clusterAngle) * clusterRadius * 0.6 + Math.sin(angle * 1.3) * 0.18;
        z = heroCenter.z - 0.55 + Math.sin(angle * 0.8) * depthSpread * 0.3;
        break;
      }
      case "asymmetric-editorial": {
        x = heroCenter.x + 1.25 + Math.cos(angle) * radial * 0.75;
        y = heroCenter.y - 0.2 + Math.sin(angle * 1.1) * 0.48;
        z = heroCenter.z - 0.9 + Math.sin(angle * 0.6) * depthSpread * 0.44;
        break;
      }
      case "runway-brand": {
        x = heroCenter.x + (ringIndex % 2 === 0 ? -0.85 : 0.85) + spreadX * 0.45;
        y = heroCenter.y + (((ringIndex % 5) - 2) * 0.18);
        z = heroCenter.z - 0.8 - ringIndex * 0.22 + spreadZ * 0.25;
        break;
      }
      case "explosion-focus": {
        x = heroCenter.x + Math.cos(angle) * (radial + 0.95 + repulsionFromHero * 0.45);
        y = heroCenter.y + Math.sin(angle * 1.1) * (0.48 + ring * 0.18);
        z = heroCenter.z - 0.6 + Math.sin(angle * 0.9) * depthSpread * 0.55;
        break;
      }
      case "minimal-luxury": {
        const keep = ringIndex < Math.max(4, Math.ceil((total - heroIndices.length) * 0.2));
        x = heroCenter.x + Math.cos(angle) * (keep ? ringRadius * 0.9 : 4.8);
        y = heroCenter.y + Math.sin(angle * 0.8) * (keep ? 0.32 : 2.8);
        z = heroCenter.z - (keep ? 0.9 : 4.2);
        break;
      }
      case "data-axis-brand": {
        x = heroCenter.x + (((ringIndex % 4) - 1.5) * 0.72);
        y = heroCenter.y + ((Math.floor(ringIndex / 4) % 4) - 1.5) * 0.42;
        z = heroCenter.z - 0.7 - ring * 0.32;
        break;
      }
      case "hero-orbit":
      default: {
        x = heroCenter.x + Math.cos(angle * direction) * (radial + 0.58);
        y = heroCenter.y + Math.sin(angle * 1.32 + hashB * 2.2) * (0.38 + hashC * 0.78);
        z = heroCenter.z - 0.95 + Math.sin(angle * 0.78 + normalized * 3.4) * depthSpread;
        break;
      }
    }

    const pullX = (heroCenter.x - x) * attractionToHero * 0.08 * brandWeight;
    const pullY = (heroCenter.y - y) * attractionToHero * 0.08 * brandWeight;
    const pushZ = repulsionFromHero * 0.22 * brandWeight;
    x = (x + spreadX + pullX) * frame.xScale;
    y = (y + spreadY + pullY) * frame.yScale;
    z = z + spreadZ - pushZ + Math.sin(runtime.time * (0.12 + ring * 0.03) + index * 0.19) * orbitJitter * 0.24;

    if (transition.active && index === transition.from) {
      const exit = 1 - transition.eased;
      if (transition.style === "slide") {
        x -= exit * 1.2;
      } else if (transition.style === "dissolve") {
        z -= exit * 0.5;
      } else if (transition.style === "zoom-through") {
        z += exit * 1.1;
      } else if (transition.style === "push-pull-depth") {
        z -= exit * 1.2;
      } else if (transition.style === "orbit-replace") {
        x += Math.sin(index * 0.7 + runtime.time) * exit * 0.55;
        y -= exit * 0.16;
      } else if (transition.style === "glitch-switch") {
        x += Math.sin(runtime.time * 24 + index) * exit * 0.12;
        y += Math.cos(runtime.time * 18 + index) * exit * 0.08;
      } else if (transition.style === "fade-through-points") {
        z -= exit * 0.36;
      }
    }

    return target.set(x, y, z);
  }

  getMediaSpaceRotation(index, runtime) {
    const preset = runtime.stepSettings?.mediaSpacePreset || "depth-field";
    const hashA = ((hash01(index * 1.83 + 0.31) + 1) % 1) - 0.5;

    if (preset === "stacked-cards") {
      return hashA * 0.34 + Math.sin(runtime.time * 0.08 + index * 0.23) * 0.05;
    }

    if (preset === "walls") {
      return hashA * 0.08;
    }

    if (preset === "sphere-orbit") {
      return hashA * 0.22 + runtime.time * 0.02;
    }

    return hashA * 0.14;
  }

  resolveContentTargetPosition(index, runtime, target) {
    const item = this.pointSprites[index];

    if (!item) {
      return target.set(9999, 9999, 9999);
    }

    const mode = this.contentConfig.layoutMode;

    if (runtime.brand?.enabled || this.brandMode) {
      return this.resolveBrandTargetPosition(index, runtime, target);
    }

    if (runtime.cinematic?.enabled || runtime.stepMode === "cinematic-export") {
      return this.resolveCinematicTargetPosition(index, runtime, target);
    }

    if (runtime.stepMode === "media-space") {
      return this.resolveMediaSpaceTargetPosition(index, runtime, target);
    }

    if (runtime.axisStep?.enabled) {
      return this.getBasePointPosition(item.pointIndex, target);
    }

    if (mode === "field") {
      return this.getBasePointPosition(item.pointIndex, target);
    }

    const total = Math.max(1, this.pointSprites.length);
    const normalized = total > 1 ? index / (total - 1) : 0;
    const hashA = ((hash01(index * 1.71 + 0.13) + 1) % 1);
    const hashB = ((hash01(index * 2.17 + 0.23) + 1) % 1);
    const hashC = ((hash01(index * 2.83 + 0.41) + 1) % 1);

    if (mode === "grid") {
      const cols = Math.ceil(Math.sqrt(total));
      const rows = Math.ceil(total / cols);
      const column = index % cols;
      const row = Math.floor(index / cols);
      return target.set(
        (column - (cols - 1) / 2) * 0.42,
        ((rows - 1) / 2 - row) * 0.34,
        (row - rows / 2) * -0.08
      );
    }

    if (mode === "perspective") {
      const cols = Math.max(3, Math.ceil(Math.sqrt(total)));
      const row = Math.floor(index / cols);
      const column = index % cols;
      const depth = row * 0.32;
      const widthScale = 1 + depth * 0.5;
      return target.set(
        (column - (cols - 1) / 2) * 0.38 * widthScale,
        1.1 - row * 0.32,
        -depth - (item.type === "text" ? 0.08 : 0)
      );
    }

    if (mode === "arc") {
      const angle = total > 1 ? (index / (total - 1)) * Math.PI * 1.15 - Math.PI * 0.575 : 0;
      const radius = 1.45;
      return target.set(
        Math.sin(angle) * radius,
        Math.cos(angle * 0.9) * 0.82,
        Math.cos(angle) * 0.48 - (item.type === "text" ? 0.1 : 0)
      );
    }

    if (mode === "constellation") {
      const base = this.getBasePointPosition(item.pointIndex, target);
      base.x += Math.sin(runtime.time * 0.12 + index * 0.37) * 0.22;
      base.y += Math.cos(runtime.time * 0.1 + index * 0.21) * 0.18;
      base.z += ((hashC - 0.5) * 1.6) + Math.sin(runtime.time * 0.14 + index * 0.19) * 0.14;
      return base;
    }

    if (mode === "perspective-wall") {
      const cols = Math.max(4, Math.ceil(Math.sqrt(total)));
      const row = Math.floor(index / cols);
      const column = index % cols;
      const depth = row * 0.28;
      const wallTilt = 0.32;
      return target.set(
        (column - (cols - 1) / 2) * (0.34 + depth * 0.09),
        1.3 - row * 0.28,
        -depth - Math.abs(column - (cols - 1) / 2) * wallTilt * 0.08
      );
    }

    if (mode === "radial") {
      const ring = Math.floor(normalized * 3.999);
      const ringCount = [6, 10, 14, 18][ring] || 20;
      const ringIndex = index - [0, 6, 16, 30][ring];
      const angle = (ringIndex / Math.max(ringCount, 1)) * Math.PI * 2 + runtime.time * 0.04;
      const radius = 0.3 + ring * 0.42;
      return target.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.86,
        -ring * 0.12
      );
    }

    if (mode === "flow-field") {
      const t = normalized * Math.PI * 4;
      const radius = 0.6 + hashA * 1.1;
      return target.set(
        Math.sin(t + runtime.time * 0.1) * radius,
        Math.cos(t * 0.7 + runtime.time * 0.08) * 0.75 + Math.sin(t * 1.4) * 0.22,
        Math.cos(t + runtime.time * 0.09) * 0.55
      );
    }

    if (mode === "stacked-planes") {
      const planeCount = 4;
      const plane = index % planeCount;
      const perPlane = Math.ceil(total / planeCount);
      const planeIndex = Math.floor(index / planeCount);
      const cols = Math.ceil(Math.sqrt(perPlane));
      const row = Math.floor(planeIndex / cols);
      const column = planeIndex % cols;
      return target.set(
        (column - (cols - 1) / 2) * 0.36,
        ((Math.ceil(perPlane / cols) - 1) / 2 - row) * 0.28,
        -plane * 0.42
      );
    }

    if (mode === "grid-break") {
      const cols = Math.ceil(Math.sqrt(total));
      const rows = Math.ceil(total / cols);
      const column = index % cols;
      const row = Math.floor(index / cols);
      return target.set(
        (column - (cols - 1) / 2) * 0.38 + (hashA - 0.5) * 0.42,
        ((rows - 1) / 2 - row) * 0.32 + (hashB - 0.5) * 0.34,
        (hashC - 0.5) * 0.6
      );
    }

    if (mode === "type-dominance") {
      const textBand = item.type === "text";
      const localIndex = textBand ? index : total - index - 1;
      const angle = (localIndex / Math.max(total - 1, 1)) * Math.PI * 0.9 - Math.PI * 0.45;
      return target.set(
        textBand ? Math.sin(angle) * 1.55 : Math.sin(angle) * 0.95,
        textBand ? Math.cos(angle) * 0.28 : -0.85 + Math.cos(angle) * 0.18,
        textBand ? -0.12 : -0.42
      );
    }

    if (mode === "image-dominance") {
      const isImage = item.type === "image";
      const cols = Math.max(4, Math.ceil(Math.sqrt(total)));
      const row = Math.floor(index / cols);
      const column = index % cols;
      return target.set(
        isImage ? (column - (cols - 1) / 2) * 0.42 : (hashA - 0.5) * 1.8,
        isImage ? 0.9 - row * 0.34 : -1.1 + hashB * 0.4,
        isImage ? -row * 0.14 : -0.72 - hashC * 0.18
      );
    }

    if (mode === "cluster-blobs") {
      const cluster = index % 5;
      const centers = [
        [-1.0, 0.75, 0.0],
        [1.05, 0.55, -0.22],
        [-0.45, -0.85, 0.18],
        [0.82, -0.72, -0.28],
        [0.0, 0.0, 0.42]
      ];
      const center = centers[cluster];
      const angle = hashA * Math.PI * 2;
      const radius = 0.18 + hashB * 0.34;
      return target.set(
        center[0] + Math.cos(angle) * radius,
        center[1] + Math.sin(angle) * radius * 0.72,
        center[2] + (hashC - 0.5) * 0.22
      );
    }

    if (mode === "scan-lines") {
      const bands = 8;
      const band = index % bands;
      const bandPosition = Math.floor(index / bands);
      const direction = band % 2 === 0 ? 1 : -1;
      return target.set(
        (bandPosition - total / (bands * 2)) * 0.32 * direction,
        1.1 - band * 0.28,
        -band * 0.08
      );
    }

    if (mode === "axis") {
      const category = getContentItemCategory(item, index);
      const importance = item.type === "text" ? 0.9 : item.type === "image" ? 0.68 : 0.42;
      return target.set(
        (category - 1.5) * 0.82,
        (importance - 0.5) * 2.2,
        -normalized * 1.6 + (hashC - 0.5) * 0.25
      );
    }

    if (mode === "tear") {
      const side = normalized < 0.5 ? -1 : 1;
      const local = normalized < 0.5 ? normalized / 0.5 : (normalized - 0.5) / 0.5;
      return target.set(
        side * (0.6 + local * 1.25 + Math.sin(runtime.time * 0.08 + index * 0.04) * 0.08),
        (hashA - 0.5) * 1.8,
        (hashB - 0.5) * 0.9
      );
    }

    if (mode === "funnel") {
      const angle = normalized * Math.PI * 8 + runtime.time * 0.28;
      const radius = 1.5 - normalized * 1.15;
      return target.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        -normalized * 2.1
      );
    }

    if (mode === "freeze") {
      return this.getBasePointPosition(item.pointIndex, target).add(this.frozenLayoutOffsets[index]);
    }

    if (mode === "mutation") {
      const angle = normalized * Math.PI * 3.5 + runtime.time * 0.18;
      return target.set(
        Math.sin(angle) * (0.8 + hashA * 0.6),
        Math.cos(angle * 0.7) * 0.72,
        Math.sin(angle * 0.45) * 0.55
      );
    }

    if (mode === "focus") {
      const focusedIndex = this.focusedSpriteIndex !== -1 ? this.focusedSpriteIndex : 0;
      const distanceFromFocus = Math.abs(index - focusedIndex);
      return target.set(
        (index - focusedIndex) * 0.22,
        Math.sin(index * 0.23) * 0.12,
        -distanceFromFocus * 0.06
      );
    }

    return this.getBasePointPosition(item.pointIndex, target);
  }

  updateContentLayout(runtime) {
    if (runtime.brand?.enabled || this.brandMode) {
      this.rebuildBrandVisualCache(runtime);
    }

    this.updateBrandFocus(runtime);

    if (runtime.stepMode === "snapshot" && this.snapshotState) {
      for (let index = 0; index < this.pointSprites.length; index += 1) {
        if (this.snapshotState.contentPositions[index]) {
          this.contentCurrentPositions[index].copy(this.snapshotState.contentPositions[index]);
        }
        this.contentCurrentScales[index] = this.snapshotState.contentScales[index] ?? this.contentCurrentScales[index];
        this.contentCurrentOpacities[index] = this.snapshotState.contentOpacities[index] ?? this.contentCurrentOpacities[index];
      }
      return;
    }

    const target = new THREE.Vector3();
    const mode = this.contentConfig.layoutMode;
    const activeLayoutMode = runtime.stepMode === "media-space" || runtime.stepMode === "cinematic-export" || runtime.cinematic?.enabled || runtime.brand?.enabled
      ? "__content_step__"
      : mode;
    const mutationPhase = ((Math.sin(runtime.time * 0.9) + 1) * 0.5);
    const focusedIndex = this.focusedSpriteIndex !== -1 ? this.focusedSpriteIndex : this.hoveredSpriteIndex;

    for (let index = 0; index < this.pointSprites.length; index += 1) {
      const item = this.pointSprites[index];
      this.resolveContentTargetPosition(index, runtime, target);
      this.contentCurrentPositions[index].lerp(target, activeLayoutMode === "freeze" ? 1 : 0.12);

      let scaleBias = 1;
      let opacityBias = 1;
      let rotationBias = 0;

      if (runtime.brand?.enabled || this.brandMode) {
        const config = this.getResolvedBrandConfig(runtime);
        const heroIndices = this.getBrandHeroIndices(config);
        const isHero = heroIndices.includes(index);
        const isPrimaryHero = index === this.activeBrandIndex;
        const heroPosition = this.contentCurrentPositions[this.activeBrandIndex] || new THREE.Vector3();
        const position = this.contentCurrentPositions[index];
        const depthDistance = Math.max(0, -position.z);
        const heroDistance = position.distanceTo(heroPosition);
        const depthFade = 1 - depthDistance * config.opacityFalloffResolved * 0.24;
        const distanceFade = 1 - heroDistance * config.scaleFalloffResolved * 0.18;
        const minimalLimit = config.preset === "minimal-luxury"
          ? Math.max(3, Math.ceil((this.pointSprites.length - heroIndices.length) * 0.18))
          : this.pointSprites.length;
        const keptInMinimal = index < minimalLimit || isHero;
        const secondarySuppression = keptInMinimal ? 1 : 0.18;
        scaleBias = isHero
          ? (isPrimaryHero ? config.heroDominanceResolved * 1.18 : config.heroDominanceResolved * 0.92)
          : THREE.MathUtils.clamp(
              (config.secondaryEmphasisResolved * 0.86)
              * Math.max(0.42, distanceFade)
              * Math.max(0.55, 1 - config.backgroundSuppressionResolved * 0.38)
              * secondarySuppression,
              0.22,
              1.32
            );
        opacityBias = isHero
          ? THREE.MathUtils.clamp(config.heroOpacity ?? 1, 0, 1)
          : THREE.MathUtils.clamp(
              (1 - config.backgroundSuppressionResolved * 0.52)
              * Math.max(0.16, depthFade)
              * Math.max(0.22, 1 - heroDistance * 0.09)
              * secondarySuppression,
              0.08,
              0.92
            );
        rotationBias = isHero
          ? (config.mainRotateZ ?? 0) * 0.22
          : (((hash01(index * 1.23 + 0.41) + 1) % 1) - 0.5) * (config.orbitRandomRotation ? 0.22 : 0.08);

        if (config.preset === "explosion-focus") {
          scaleBias *= isHero ? 1.06 : 0.88;
        } else if (config.preset === "tunnel-brand") {
          opacityBias *= THREE.MathUtils.clamp(1 - depthDistance * 0.08, 0.26, 1);
        } else if (config.preset === "wall-brand") {
          opacityBias *= 0.92;
        } else if (config.preset === "data-axis-brand") {
          rotationBias *= 0.5;
        }
      } else if (runtime.cinematic?.enabled || runtime.stepMode === "cinematic-export") {
        scaleBias = THREE.MathUtils.clamp(1.52 - (this.contentCurrentPositions[index].z + 2.6) * 0.18, 0.54, 1.58);
        opacityBias = THREE.MathUtils.clamp(1.02 - Math.max(0, -this.contentCurrentPositions[index].z - 0.6) * 0.06, 0.62, 1);
        rotationBias = (((hash01(index * 1.23 + 0.41) + 1) % 1) - 0.5) * 0.1;
      } else if (runtime.stepMode === "media-space") {
        const preset = runtime.stepSettings?.mediaSpacePreset || "depth-field";
        scaleBias = THREE.MathUtils.clamp(1.34 - (this.contentCurrentPositions[index].z + 3.1) * 0.16, 0.52, 1.42);
        opacityBias = THREE.MathUtils.clamp(1.08 - Math.max(0, -this.contentCurrentPositions[index].z - 0.4) * 0.08, 0.58, 1);
        rotationBias = this.getMediaSpaceRotation(index, runtime);

        if (preset === "tunnel") {
          scaleBias *= THREE.MathUtils.clamp(1.08 - Math.abs(this.contentCurrentPositions[index].x) * 0.08, 0.7, 1.2);
        } else if (preset === "sphere-orbit") {
          scaleBias *= THREE.MathUtils.clamp(1.1 - this.contentCurrentPositions[index].length() * 0.08, 0.68, 1.16);
        } else if (preset === "walls") {
          opacityBias *= 0.94;
        } else if (preset === "stacked-cards") {
          scaleBias *= item.type === "text" ? 1.08 : 0.96;
        }
      } else if (mode === "constellation") {
        scaleBias = 0.82 + (((hash01(index * 0.71) + 1) % 1) * 0.42);
      } else if (mode === "perspective-wall" || mode === "perspective") {
        scaleBias = THREE.MathUtils.clamp(1.22 - Math.max(0, this.contentCurrentPositions[index].z + 1.2) * 0.32, 0.58, 1.24);
      } else if (mode === "radial") {
        scaleBias = THREE.MathUtils.clamp(1.22 - this.contentCurrentPositions[index].length() * 0.24, 0.52, 1.18);
      } else if (mode === "stacked-planes") {
        scaleBias = 1.1 - Math.max(0, -this.contentCurrentPositions[index].z) * 0.18;
      } else if (mode === "type-dominance") {
        scaleBias = item.type === "text" ? 1.32 : 0.72;
        opacityBias = item.type === "text" ? 1 : 0.56;
      } else if (mode === "image-dominance") {
        scaleBias = item.type === "image" ? 1.26 : 0.66;
        opacityBias = item.type === "image" ? 1 : 0.42;
      } else if (mode === "scan-lines") {
        scaleBias = item.type === "text" ? 0.92 : 0.78;
      } else if (mode === "axis") {
        scaleBias = item.type === "text" ? 1.08 : 0.84;
      } else if (mode === "mutation") {
        const band = (mutationPhase + index * 0.07) % 1;
        scaleBias = 0.7 + Math.sin(band * Math.PI) * 0.7;
        opacityBias = 0.28 + Math.sin(band * Math.PI) * 0.72;
      } else if (mode === "focus") {
        const isFocused = index === focusedIndex;
        scaleBias = isFocused ? 1.5 : 0.56;
        opacityBias = isFocused ? 1 : 0.16;
      }

      if (runtime.stepMode === "curation") {
        const isAnchor = this.curationAnchors.has(item.pointIndex);
        scaleBias *= isAnchor ? 1.46 : 1;
        opacityBias *= isAnchor ? 1 : 0.86;
      }

      this.contentCurrentScales[index] = THREE.MathUtils.lerp(this.contentCurrentScales[index], scaleBias, 0.14);
      this.contentCurrentOpacities[index] = THREE.MathUtils.lerp(this.contentCurrentOpacities[index], opacityBias, 0.14);
      this.contentCurrentRotations[index] = THREE.MathUtils.lerp(this.contentCurrentRotations[index], rotationBias, 0.14);
    }
  }

  getContentPosition(index, runtime, target) {
    if (!this.pointSprites[index]) {
      return target.set(9999, 9999, 9999);
    }

    return target.copy(this.contentCurrentPositions[index]);
  }

  getInteractivePosition(index, runtime, target) {
    if (this.pointSprites.length && index < this.pointSprites.length) {
      return this.getContentPosition(index, runtime, target);
    }

    return this.getBasePointPosition(this.interactiveIndices[index], target);
  }

  getStepFocusTarget(target) {
    if (!this.group.visible) {
      return null;
    }

    const focusIndex = this.brandMode && this.activeBrandIndex !== -1
      ? this.activeBrandIndex
      : (this.cameraDramaFocusIndex !== -1 ? this.cameraDramaFocusIndex : this.hoveredSpriteIndex);

    if (focusIndex !== -1 && this.pointSprites[focusIndex]) {
      return target.copy(this.pointSprites[focusIndex].sprite.position).applyMatrix4(this.group.matrixWorld);
    }

    if (this.hoveredInteractiveIndex !== -1) {
      return this.getInteractivePosition(this.hoveredInteractiveIndex, { stepMode: "none" }, target).applyMatrix4(this.group.matrixWorld);
    }

    return null;
  }

  handleCameraDramaClick() {
    if (this.hoveredSpriteIndex !== -1) {
      this.cameraDramaFocusIndex = this.cameraDramaFocusIndex === this.hoveredSpriteIndex ? -1 : this.hoveredSpriteIndex;
      return true;
    }

    this.cameraDramaFocusIndex = -1;
    return false;
  }

  hideRelationLayers() {
    for (const layer of Object.values(this.relationLayers)) {
      layer.object.visible = false;
      layer.material.opacity = 0;
    }
    this.stepConnectedIndices.clear();
  }

  updateRelationStep(runtime, hoveredInteractiveIndex) {
    this.stepConnectedIndices.clear();

    for (const layer of Object.values(this.relationLayers)) {
      layer.object.visible = true;
      for (let index = 0; index < layer.positions.length; index += 1) {
        layer.positions[index] = 9999;
      }
    }

    const offsets = { solid: 0, dashed: 0, emphasis: 0 };
    const maxDistance = 1.45;
    const anchorIndex = hoveredInteractiveIndex !== -1 ? this.interactiveIndices[hoveredInteractiveIndex] : -1;

    for (let a = 0; a < this.interactiveIndices.length; a += 1) {
      const aPointIndex = this.interactiveIndices[a];
      const aPosition = new THREE.Vector3().fromArray(this.pointCurrent, aPointIndex * 3);
      const aSpriteIndex = this.pointSpritePointIndexMap.get(aPointIndex);
      const aSprite = Number.isInteger(aSpriteIndex) ? this.pointSprites[aSpriteIndex] : null;
      const aCategory = aSprite ? getContentItemCategory(aSprite, aSpriteIndex) : this.pointAxisMeta.categories[aPointIndex];
      const aImportance = aSprite ? getContentImportance(aSprite) : this.pointAxisMeta.importances[aPointIndex];

      for (let b = a + 1; b < this.interactiveIndices.length; b += 1) {
        const bPointIndex = this.interactiveIndices[b];
        const bPosition = new THREE.Vector3().fromArray(this.pointCurrent, bPointIndex * 3);
        const distance = aPosition.distanceTo(bPosition);

        if (distance > maxDistance) {
          continue;
        }

        const bSpriteIndex = this.pointSpritePointIndexMap.get(bPointIndex);
        const bSprite = Number.isInteger(bSpriteIndex) ? this.pointSprites[bSpriteIndex] : null;
        const bCategory = bSprite ? getContentItemCategory(bSprite, bSpriteIndex) : this.pointAxisMeta.categories[bPointIndex];
        const bImportance = bSprite ? getContentImportance(bSprite) : this.pointAxisMeta.importances[bPointIndex];

        let layerName = "dashed";

        if (aCategory === bCategory) {
          layerName = "solid";
        } else if (Math.abs(aImportance - bImportance) < 0.12) {
          layerName = "emphasis";
        }

        const offset = offsets[layerName];
        const layer = this.relationLayers[layerName];

        if (offset + 6 > layer.positions.length) {
          continue;
        }

        layer.positions[offset] = aPosition.x;
        layer.positions[offset + 1] = aPosition.y;
        layer.positions[offset + 2] = aPosition.z;
        layer.positions[offset + 3] = bPosition.x;
        layer.positions[offset + 4] = bPosition.y;
        layer.positions[offset + 5] = bPosition.z;
        offsets[layerName] += 6;

        if (anchorIndex !== -1 && (aPointIndex === anchorIndex || bPointIndex === anchorIndex)) {
          this.stepConnectedIndices.add(aPointIndex);
          this.stepConnectedIndices.add(bPointIndex);
        }
      }
    }

    for (const [name, layer] of Object.entries(this.relationLayers)) {
      layer.attribute.needsUpdate = true;
      layer.geometry.computeBoundingSphere();

      if (layer.dashed) {
        layer.object.computeLineDistances();
      }

      if (name === "solid") {
        layer.material.opacity = anchorIndex !== -1 ? 0.46 : 0.24;
      } else if (name === "dashed") {
        layer.material.opacity = anchorIndex !== -1 ? 0.34 : 0.18;
      } else {
        layer.material.opacity = anchorIndex !== -1 ? 0.68 : 0.28;
      }
    }
  }

  updateInteraction(camera, pointer, runtime) {
    const cinematicActive = Boolean(runtime.cinematic?.enabled || this.cinematicMode || runtime.stepMode === "cinematic-export");
    const brandActive = Boolean(runtime.brand?.enabled || this.brandMode);
    const editorialActive = Boolean(this.editorialConfig?.enabled || this.editorialMode);
    const contentInteractionEnabled = this.pointSprites.length > 0
      && (this.mode === "points" || this.mode === "hybrid" || this.contentOnlyConfig.enabled || runtime.stepMode === "media-space" || cinematicActive || brandActive);
    const pointInteractionEnabled = !this.contentOnlyConfig.enabled
      && (!cinematicActive || this.cinematicShowPoints)
      && (this.mode === "points" || this.mode === "hybrid" || (brandActive && (runtime.brand?.showPoints ?? true)));

    if (editorialActive) {
      const editorialContext = this.editorialConfig?.context || runtime.editorial?.context || "standalone";
      const keepBrandBackdrop = editorialContext === "brand"
        && brandActive
        && !this.editorialConfig?.backdropCaptured;
      const editorialEntries = this.getEditorialInteractiveEntries();
      let hoveredKey = "";
      let hoveredDistance = Infinity;
      const projected = new THREE.Vector3();
      const world = new THREE.Vector3();

      for (const [key, sprite] of editorialEntries) {
        world.copy(sprite.position).applyMatrix4(this.group.matrixWorld);
        projected.copy(world).project(camera);
        const distance = Math.hypot(pointer.x - projected.x, pointer.y - projected.y);
        const hitRadius = THREE.MathUtils.clamp(
          0.06 + Math.max(sprite.scale.x, sprite.scale.y) * 0.028,
          0.08,
          0.34
        );
        if (distance < hitRadius && distance < hoveredDistance) {
          hoveredDistance = distance;
          hoveredKey = key;
        }
      }

      this.hoveredEditorialKey = hoveredKey;
      if (hoveredKey) {
        this.activationLines.visible = false;
        this.activationDots.visible = false;
        this.scanPoints.visible = false;
        this.connectionLines.visible = false;
        this.hideRelationLayers();
        this.trailLines.visible = false;
        if (keepBrandBackdrop) {
          this.updateBrandDecor(runtime);
        } else {
          this.updateBrandDecor({ brand: { enabled: false } });
        }
        return;
      }
    }

    if (!contentInteractionEnabled && !pointInteractionEnabled) {
      this.activationLines.visible = false;
      this.activationDots.visible = false;
      this.scanPoints.visible = false;
      this.connectionLines.visible = false;
      this.hideRelationLayers();
      this.trailLines.visible = false;
      return;
    }

    const vector = new THREE.Vector3();
    const worldVector = new THREE.Vector3();
    const localOffset = new THREE.Vector3();
    const toCameraWorld = new THREE.Vector3();
    const toCameraLocal = new THREE.Vector3();
    const inverseGroupQuaternion = new THREE.Quaternion();
    const activeMode = runtime.stepMode === "snapshot" ? "none" : (runtime.interactionMode || "none");
    let hoveredSpriteIndex = -1;
    let hoveredInteractiveIndex = -1;
    let hoveredDistance = 0.14;
    const previousHoveredSpriteIndex = this.hoveredSpriteIndex;

    this.group.updateMatrixWorld(true);
    this.updateContentLayout(runtime);
    this.group.getWorldQuaternion(inverseGroupQuaternion).invert();

    if (brandActive) {
      for (let index = 0; index < this.pointSprites.length; index += 1) {
        this.pointSprites[index].sprite.visible = this.isBrandSpriteVisible(this.pointSprites[index], runtime);
      }
    }

    if (contentInteractionEnabled) {
      const visibleSprites = [];

      for (let index = 0; index < this.pointSprites.length; index += 1) {
        const item = this.pointSprites[index];

        if (!item.sprite.visible) {
          continue;
        }

        const position = this.getContentPosition(index, runtime, worldVector);

        item.sprite.position.copy(position);
        visibleSprites.push(item.sprite);
      }

      if (visibleSprites.length) {
        this.group.updateMatrixWorld(true);
        const spriteRaycaster = this.contentRaycaster || (this.contentRaycaster = new THREE.Raycaster());
        spriteRaycaster.setFromCamera(pointer, camera);
        const spriteHits = spriteRaycaster.intersectObjects(visibleSprites, false);

        if (spriteHits.length) {
          hoveredSpriteIndex = Number(spriteHits[0].object?.userData?.contentIndex ?? -1);
          hoveredDistance = 0;
        } else {
          for (let index = 0; index < this.pointSprites.length; index += 1) {
            const item = this.pointSprites[index];

            if (!item.sprite.visible) {
              continue;
            }

            item.sprite.localToWorld(worldVector);
            vector.copy(worldVector).project(camera);
            const distance = Math.hypot(pointer.x - vector.x, pointer.y - vector.y);

            if (distance < hoveredDistance) {
              hoveredDistance = distance;
              hoveredSpriteIndex = index;
            }
          }
        }
      }
    }

    if (brandActive && previousHoveredSpriteIndex !== -1 && previousHoveredSpriteIndex < this.pointSprites.length) {
      const previousItem = this.pointSprites[previousHoveredSpriteIndex];

      if (previousItem?.sprite?.visible) {
        const previousPosition = this.getContentPosition(previousHoveredSpriteIndex, runtime, worldVector);
        previousItem.sprite.position.copy(previousPosition);
        previousItem.sprite.localToWorld(worldVector);
        vector.copy(worldVector).project(camera);
        const previousDistance = Math.hypot(pointer.x - vector.x, pointer.y - vector.y);

        if (previousDistance <= hoveredDistance + 0.045 || (hoveredSpriteIndex === -1 && previousDistance <= 0.18)) {
          hoveredDistance = previousDistance;
          hoveredSpriteIndex = previousHoveredSpriteIndex;
        }
      }
    }

    for (let index = 0; pointInteractionEnabled && index < this.interactiveIndices.length; index += 1) {
      this.getInteractivePosition(index, runtime, worldVector).applyMatrix4(this.group.matrixWorld);
      vector.copy(worldVector).project(camera);
      const distance = Math.hypot(pointer.x - vector.x, pointer.y - vector.y);

      if (distance < hoveredDistance) {
        hoveredDistance = distance;
        hoveredInteractiveIndex = index;
      }
    }

    this.hoveredSpriteIndex = hoveredSpriteIndex;
    this.hoveredInteractiveIndex = hoveredInteractiveIndex;

    if (runtime.stepMode === "snapshot") {
      hoveredSpriteIndex = -1;
      hoveredInteractiveIndex = -1;
      this.hoveredSpriteIndex = -1;
      this.hoveredInteractiveIndex = -1;
    }

    for (let index = 0; index < this.pointSprites.length; index += 1) {
      const item = this.pointSprites[index];
      const isFocused = this.focusedSpriteIndex === index;
      const isAnchor = runtime.stepMode === "curation" && this.curationAnchors.has(item.pointIndex);
      const filterMatch = runtime.stepMode === "filter"
        ? this.getFilterMatch(item, index, item.pointIndex, runtime)
        : true;
      const calmSystemHover = !cinematicActive && !brandActive && activeMode === "none";
      let targetHover = 0;

      if (activeMode === "activation") {
        targetHover = index === hoveredSpriteIndex || isFocused ? 1 : 0;
      } else if (activeMode === "scan") {
        targetHover = index === hoveredSpriteIndex || isFocused ? 0.85 : 0;
      } else if (activeMode === "connection") {
        targetHover = index === hoveredSpriteIndex || isFocused ? 0.9 : 0.1;
      } else {
        targetHover = index === hoveredSpriteIndex || isFocused
          ? (brandActive ? 0.5 : calmSystemHover ? 0.38 : 0.72)
          : 0;
      }

      item.hover = THREE.MathUtils.lerp(item.hover, targetHover, brandActive ? 0.08 : calmSystemHover ? 0.08 : 0.14);
      const layoutScale = this.contentCurrentScales[index] || 1;
      const layoutOpacity = this.contentCurrentOpacities[index] || 1;
      const hoverStrength = cinematicActive
        ? (runtime.cinematic?.hoverProximityStrength ?? 0.9)
        : brandActive
          ? 0.56
        : calmSystemHover
          ? 0.08
          : (runtime.stepSettings?.hoverProximityStrength ?? 0.75);
      const hoverDepth = item.hover * hoverStrength * (cinematicActive ? 1.35 : brandActive ? 0.72 : 0.8);
      const contentHoverScalePx = THREE.MathUtils.clamp(Number(this.contentConfig?.hoverScale ?? 220), 32, 15000);
      const contentHoverScale = Math.max(1, contentHoverScalePx / 64);
      const targetHoverScale = calmSystemHover
        ? item.baseScale * contentHoverScale
        : Math.max(item.fullScale, item.baseScale * contentHoverScale);
      let scale = THREE.MathUtils.lerp(
        item.baseScale,
        targetHoverScale,
        item.hover
      ) * layoutScale;
      let brandOpacityFactor = 1;
      item.sprite.material.rotation = this.contentCurrentRotations[index] || 0;
      item.sprite.material.color.setScalar(1 + item.hover * (brandActive ? 0.12 : 0.22) + (isAnchor ? 0.22 : 0));

      item.sprite.localToWorld(worldVector.copy(item.sprite.position));
      toCameraWorld.copy(camera.position).sub(worldVector).normalize();
      toCameraLocal.copy(toCameraWorld).applyQuaternion(inverseGroupQuaternion);
      localOffset.copy(toCameraLocal).multiplyScalar(hoverDepth);

      if (runtime.expansionRandomness > 0.001 && !calmSystemHover) {
        const randomStrength = hoverDepth * (cinematicActive ? 1.4 : brandActive ? 0.18 : 1);
        const xySpread = brandActive ? runtime.expansionRandomness * 0.18 : runtime.expansionRandomness;
        const zSpread = brandActive
          ? 0.14 + runtime.expansionRandomness * 0.32
          : 0.2 + runtime.expansionRandomness * 0.8;
        localOffset.x += this.contentRandomVectors[index].x * randomStrength * xySpread;
        localOffset.y += this.contentRandomVectors[index].y * randomStrength * xySpread;
        localOffset.z += this.contentRandomVectors[index].z * randomStrength * zSpread;
      }

      localOffset.x = THREE.MathUtils.clamp(localOffset.x, -1.4, 1.4);
      localOffset.y = THREE.MathUtils.clamp(localOffset.y, -1.2, 1.2);
      localOffset.z = THREE.MathUtils.clamp(localOffset.z, -1.8, 1.8);

      item.sprite.position.add(localOffset);

      if (runtime.stepMode === "filter") {
        scale *= filterMatch ? 1.14 : 0.64;
      }

      if (this.contentConfig.layoutMode === "mutation") {
        const phase = (((runtime.time * 0.24) + index * 0.17) % 1 + 1) % 1;
        const nextMap = phase < 0.33 ? item.baseMap : phase < 0.66 ? item.imageMap : item.textMap;

        if (item.sprite.material.map !== nextMap) {
          item.sprite.material.map = nextMap;
          item.sprite.material.needsUpdate = true;
        }
      }

      if (runtime.stepMode === "material-state") {
        const phase = (((runtime.time * 0.18) + index * 0.11 + item.hover * 0.2) % 1 + 1) % 1;
        const nextMap = phase < 0.25
          ? item.baseMap
          : phase < 0.5
            ? item.imageMap
            : phase < 0.75
              ? item.textMap
              : item.fragmentMap;

        if (item.sprite.material.map !== nextMap) {
          item.sprite.material.map = nextMap;
          item.sprite.material.needsUpdate = true;
        }

        const materialScale = THREE.MathUtils.lerp(0.72, 1.16, Math.sin(phase * Math.PI));
        scale *= materialScale;
      }

      if (brandActive) {
        const config = this.getResolvedBrandConfig(runtime);
        const heroIndices = this.getBrandHeroIndices(config);
        const isHero = heroIndices.includes(index);
        const isPrimaryHero = index === this.activeBrandIndex;
        const visual = isPrimaryHero
          ? this.resolveBrandActiveVisual(index, runtime)
          : this.resolveBrandOrbitVisual(index, runtime);
        const visualType = visual?.type || item.type;
        const brandVisible = this.isBrandSpriteVisible(item, runtime, visualType);
        item.sprite.visible = brandVisible;

        if (!brandVisible) {
          item.sprite.material.opacity = 0;
          continue;
        }

        if (visual?.texture && item.sprite.material.map !== visual.texture) {
          item.sprite.material.map = visual.texture;
          item.sprite.material.needsUpdate = true;
        }

        const visualAspect = visual?.texture?.image?.width && visual?.texture?.image?.height
          ? visual.texture.image.width / visual.texture.image.height
          : 1;
        item.aspect = visualAspect;

        const heroPosition = this.contentCurrentPositions[this.activeBrandIndex] || this.contentCurrentPositions[index];
        const heroDistance = this.contentCurrentPositions[index].distanceTo(heroPosition);
        const transition = this.getBrandTransition(runtime);

        if (isHero) {
          const mainScale = runtime.brand?.mainScale ?? 0;
          const tilt = runtime.brand?.mainTilt ?? 0;
          const rotateX = runtime.brand?.mainRotateX ?? 0;
          const rotateY = runtime.brand?.mainRotateY ?? 0;
          const rotateZ = runtime.brand?.mainRotateZ ?? 0;
          const skew = runtime.brand?.heroSkew ?? 0;
          const handFocusScale = runtime.handControl?.mode === "brand" ? (runtime.handControl.brandVariation ?? 0) : 0;
          const resolvedHeroScale = THREE.MathUtils.clamp(Math.exp(mainScale * 0.14), 0.18, 4.8);
          item.sprite.material.rotation = rotateZ + tilt * 0.5 + item.hover * 0.08;
          scale *= resolvedHeroScale * (isPrimaryHero ? 1 : THREE.MathUtils.lerp(0.78, 1.04, runtime.brand?.dualHeroBalance ?? 0.5)) * (1 + handFocusScale * 1.2) * (1 + item.hover * 0.2);
          item.sprite.position.x += Math.sin(rotateY) * 0.22 + skew * 0.18;
          item.sprite.position.y += Math.sin(rotateX + tilt) * 0.16;
          item.sprite.position.z += Math.sin(rotateX + rotateY) * 0.05;
          if (Math.abs(skew) > 0.001) {
            item.aspect *= 1 + Math.abs(skew) * 0.18;
          }

          if (transition.active) {
            if (index === transition.to && transition.style === "dissolve") {
              brandOpacityFactor *= transition.eased;
            } else if (index === transition.from && transition.style === "dissolve") {
              brandOpacityFactor *= 1 - transition.eased;
            } else if (index === transition.to && transition.style === "fade-through-points") {
              brandOpacityFactor *= THREE.MathUtils.lerp(0.2, 1, transition.eased);
            } else if (index === transition.from && transition.style === "fade-through-points") {
              brandOpacityFactor *= THREE.MathUtils.lerp(1, 0.1, transition.eased);
            }
          }
        } else {
          const minScale = runtime.brand?.orbitMinScale ?? 0.82;
          const maxScale = runtime.brand?.orbitMaxScale ?? 1.08;
          const orbitScale = THREE.MathUtils.lerp(minScale, maxScale, (((hash01(index * 0.93) + 1) % 1)));
          scale *= orbitScale * THREE.MathUtils.clamp(1 - heroDistance * (config.scaleFalloffResolved * 0.08), 0.4, 1) * (1 + item.hover * 0.08);
          item.sprite.position.z *= 1 + (runtime.brand?.orbitDepthSpread ?? 1.6) * 0.12;
          if (runtime.brand?.orbitRandomRotation) {
            item.sprite.material.rotation += (((hash01(index * 1.71 + 0.12) + 1) % 1) - 0.5) * 0.22;
          }
          brandOpacityFactor *= THREE.MathUtils.clamp(
            0.9 - config.backgroundSuppressionResolved * 0.38 - heroDistance * config.opacityFalloffResolved * 0.05,
            0.12,
            0.72
          );
          item.sprite.material.color.setScalar(0.8 + item.hover * 0.18);
        }

        item.sprite.renderOrder = isHero ? 26 : 18;
      } else if (cinematicActive || runtime.stepMode === "media-space") {
        item.sprite.renderOrder = 16;
      } else {
        item.sprite.renderOrder = 14;
      }

      item.sprite.scale.set(scale * item.aspect, scale, 1);

      item.sprite.material.opacity = (
        activeMode === "scan"
          ? THREE.MathUtils.lerp(0.04, 0.98, item.hover)
          : THREE.MathUtils.lerp(0.55, 1, item.hover)
      ) * layoutOpacity * brandOpacityFactor;

      if (runtime.stepMode === "filter") {
        item.sprite.material.opacity *= filterMatch ? 1 : 0.12;
      }
    }

    const brandPointOpacity = brandActive
      ? ((runtime.brand?.showPoints ?? true) ? (runtime.brand?.pointOpacity ?? 0.18) : 0)
      : 0.24;

    this.pointMaterial.opacity = (this.contentOnlyConfig.enabled
      ? 0
      : cinematicActive && this.cinematicShowPoints
        ? 0.16
        : brandActive
          ? brandPointOpacity
        : (activeMode === "scan" ? 0.05 : 1)) * this.pointOpacityFactor;

    if (runtime.stepMode === "filter") {
      this.pointMaterial.opacity = (this.contentOnlyConfig.enabled ? 0 : 0.18) * this.pointOpacityFactor;
    }

    this.activationLines.visible = pointInteractionEnabled && activeMode === "activation" && hoveredInteractiveIndex !== -1;
    this.activationDots.visible = this.activationLines.visible;
    this.scanPoints.visible = pointInteractionEnabled && activeMode === "scan";
    this.connectionLines.visible = pointInteractionEnabled && activeMode === "connection" && runtime.stepMode !== "relation";

    if (!pointInteractionEnabled) {
      this.hideRelationLayers();
    } else if (runtime.stepMode === "relation") {
      this.updateRelationStep(runtime, hoveredInteractiveIndex);
    } else {
      this.hideRelationLayers();
    }

    if (this.activationLines.visible) {
      const center = this.getInteractivePosition(hoveredInteractiveIndex, runtime, vector);
      const centerX = center.x;
      const centerY = center.y;
      const centerZ = center.z;

      for (let index = 0; index < 8; index += 1) {
        const angle = (index / 8) * Math.PI * 2 + runtime.time * 0.4;
        const radius = 0.18 + index * 0.018;
        const offset = index * 6;
        this.activationLinePositions[offset] = centerX;
        this.activationLinePositions[offset + 1] = centerY;
        this.activationLinePositions[offset + 2] = centerZ;
        this.activationLinePositions[offset + 3] = centerX + Math.cos(angle) * radius;
        this.activationLinePositions[offset + 4] = centerY + Math.sin(angle) * radius;
        this.activationLinePositions[offset + 5] = centerZ + Math.sin(angle * 1.7) * 0.08;
      }

      for (let index = 0; index < 12; index += 1) {
        const angle = (index / 12) * Math.PI * 2 - runtime.time * 0.55;
        const radius = 0.14 + (index % 3) * 0.04;
        const offset = index * 3;
        this.activationDotPositions[offset] = centerX + Math.cos(angle) * radius;
        this.activationDotPositions[offset + 1] = centerY + Math.sin(angle) * radius;
        this.activationDotPositions[offset + 2] = centerZ + Math.cos(angle * 2.0) * 0.05;
      }

      this.activationLineAttribute.needsUpdate = true;
      this.activationDotAttribute.needsUpdate = true;
      this.activationLineMaterial.opacity = 0.42;
      this.activationDotMaterial.opacity = 0.72;
    } else {
      this.activationLineMaterial.opacity = 0;
      this.activationDotMaterial.opacity = 0;
    }

    if (this.scanPoints.visible) {
      let visibleCount = 0;

      for (let index = 0; index < this.interactiveIndices.length; index += 1) {
        this.getInteractivePosition(index, runtime, worldVector).applyMatrix4(this.group.matrixWorld);
        vector.copy(worldVector).project(camera);
        const distance = Math.hypot(pointer.x - vector.x, pointer.y - vector.y);
        const falloff = THREE.MathUtils.clamp(1 - distance / 0.42, 0, 1);
        const target = visibleCount * 3;
        const local = this.getInteractivePosition(index, runtime, vector);
        this.scanPointPositions[target] = local.x;
        this.scanPointPositions[target + 1] = local.y;
        this.scanPointPositions[target + 2] = local.z;

        if (falloff > 0.02) {
          visibleCount += 1;
        } else {
          this.scanPointPositions[target] = 9999;
          this.scanPointPositions[target + 1] = 9999;
          this.scanPointPositions[target + 2] = 9999;
        }
      }

      for (let index = visibleCount * 3; index < this.scanPointPositions.length; index += 1) {
        this.scanPointPositions[index] = 9999;
      }

      this.scanPointAttribute.needsUpdate = true;
      this.scanPointMaterial.opacity = 0.95;
    } else {
      this.scanPointMaterial.opacity = 0;
    }

    if (this.connectionLines.visible) {
      let connectionOffset = 0;
      const maxDistance = 0.88;
      const hoveredPoint = hoveredInteractiveIndex !== -1 ? this.interactiveIndices[hoveredInteractiveIndex] : -1;

      for (let a = 0; a < this.interactiveIndices.length; a += 1) {
        const aPoint = this.getInteractivePosition(a, runtime, vector);
        const ax = aPoint.x;
        const ay = aPoint.y;
        const az = aPoint.z;

        for (let b = a + 1; b < this.interactiveIndices.length; b += 1) {
          const bPoint = this.getInteractivePosition(b, runtime, worldVector);
          const bx = bPoint.x;
          const by = bPoint.y;
          const bz = bPoint.z;
          const distance = Math.hypot(ax - bx, ay - by, az - bz);

          if (distance > maxDistance || connectionOffset + 6 > this.connectionPositions.length) {
            continue;
          }

          this.connectionPositions[connectionOffset] = ax;
          this.connectionPositions[connectionOffset + 1] = ay;
          this.connectionPositions[connectionOffset + 2] = az;
          this.connectionPositions[connectionOffset + 3] = bx;
          this.connectionPositions[connectionOffset + 4] = by;
          this.connectionPositions[connectionOffset + 5] = bz;
          connectionOffset += 6;
        }
      }

      for (let index = connectionOffset; index < this.connectionPositions.length; index += 1) {
        this.connectionPositions[index] = 9999;
      }

      this.connectionAttribute.needsUpdate = true;
      this.connectionMaterial.opacity = hoveredPoint !== -1 ? 0.55 : 0.24;
    } else {
      this.connectionMaterial.opacity = 0;
    }

    if (runtime.stepMode === "relation") {
      for (let index = 0; index < this.pointSprites.length; index += 1) {
        const item = this.pointSprites[index];
        const related = this.stepConnectedIndices.has(item.pointIndex);
        const hovered = index === hoveredSpriteIndex;
        item.sprite.material.opacity *= hovered || related ? 1 : 0.22;
      }
      this.pointMaterial.opacity = (hoveredInteractiveIndex !== -1 ? 0.14 : 0.28) * this.pointOpacityFactor;
    } else if (runtime.stepMode === "snapshot") {
      this.pointMaterial.opacity = 0.16 * this.pointOpacityFactor;
    } else if (runtime.stepMode === "camera-drama" && hoveredSpriteIndex !== -1) {
      this.pointMaterial.opacity = 0.26 * this.pointOpacityFactor;
    }

    if (brandActive && runtime.brand?.showPoints === false) {
      this.pointMaterial.opacity = 0;
    }

    this.updateBrandDecor(runtime);
  }

  handleEditorialClick() {
    if (!this.group.visible || !this.editorialMode) {
      return false;
    }

    if (!this.hoveredEditorialKey) {
      this.selectedEditorialKey = "";
      return false;
    }

    this.selectedEditorialKey = this.selectedEditorialKey === this.hoveredEditorialKey
      ? ""
      : this.hoveredEditorialKey;
    return true;
  }

  handleEditorialPointerDown(raycaster, camera, pointer, modifiers = {}) {
    if (!this.group.visible || !this.editorialMode) {
      return false;
    }

    const targetKey = this.pickEditorialKey(raycaster) || this.hoveredEditorialKey;

    if (!targetKey) {
      return false;
    }

    const sprite = this.getEditorialSpriteByKey(targetKey);
    const offsetTarget = this.getEditorialOffsetTarget(targetKey);

    if (!sprite?.visible || !offsetTarget) {
      return false;
    }

    const worldPosition = new THREE.Vector3();
    const planeNormal = new THREE.Vector3();
    const startWorld = new THREE.Vector3();
    const dragPlane = new THREE.Plane();

    sprite.getWorldPosition(worldPosition);
    camera.getWorldDirection(planeNormal);
    dragPlane.setFromNormalAndCoplanarPoint(planeNormal, worldPosition);

    if (!raycaster.ray.intersectPlane(dragPlane, startWorld)) {
      return false;
    }

    this.hoveredEditorialKey = targetKey;
    this.selectedEditorialKey = targetKey;
    this.editorialDrag = {
      key: targetKey,
      mode: modifiers.altKey ? "depth" : "plane",
      dragPlane,
      startWorld,
      startPointer: pointer?.clone?.() || new THREE.Vector2(),
      startOffset: offsetTarget.clone()
    };
    return true;
  }

  handleEditorialPointerMove(raycaster, camera, pointer, modifiers = {}) {
    if (!this.editorialDrag) {
      return false;
    }

    const offset = this.getEditorialOffsetTarget(this.editorialDrag.key);

    if (!offset) {
      return true;
    }

    if (this.editorialDrag.mode === "depth") {
      const startPointer = this.editorialDrag.startPointer || new THREE.Vector2();
      const currentPointer = pointer || startPointer;
      const deltaY = currentPointer.y - startPointer.y;
      offset.copy(this.editorialDrag.startOffset);
      offset.z = THREE.MathUtils.clamp(this.editorialDrag.startOffset.z + deltaY * 2.4, -2.4, 2.4);
      return true;
    }

    const currentWorld = new THREE.Vector3();

    if (!raycaster.ray.intersectPlane(this.editorialDrag.dragPlane, currentWorld)) {
      return true;
    }

    const startLocal = this.group.worldToLocal(this.editorialDrag.startWorld.clone());
    const currentLocal = this.group.worldToLocal(currentWorld.clone());
    const deltaLocal = currentLocal.sub(startLocal);

    offset.copy(this.editorialDrag.startOffset).add(deltaLocal);
    offset.x = THREE.MathUtils.clamp(offset.x, -3.2, 3.2);
    offset.y = THREE.MathUtils.clamp(offset.y, -2.4, 2.4);
    offset.z = THREE.MathUtils.clamp(offset.z, -2.4, 2.4);
    return true;
  }

  handleEditorialPointerUp() {
    this.editorialDrag = null;
  }

  handleContentClick() {
    if (!this.group.visible) {
      return;
    }

    if (this.mode !== "points" && this.mode !== "hybrid" && !this.contentOnlyConfig.enabled) {
      return;
    }

    if (this.hoveredSpriteIndex === -1) {
      this.focusedSpriteIndex = -1;
      return;
    }

    this.focusedSpriteIndex = this.focusedSpriteIndex === this.hoveredSpriteIndex
      ? -1
      : this.hoveredSpriteIndex;
  }

  handleMediaSpaceClick() {
    if (!this.group.visible) {
      return false;
    }

    if (!this.pointSprites.length) {
      return false;
    }

    if (this.hoveredSpriteIndex === -1) {
      this.cameraDramaFocusIndex = -1;
      return false;
    }

    this.cameraDramaFocusIndex = this.hoveredSpriteIndex;
    this.focusedSpriteIndex = this.hoveredSpriteIndex;
    return true;
  }

  handleBrandClick() {
    if (!this.group.visible || !this.brandMode || !this.pointSprites.length) {
      return false;
    }

    if (this.hoveredSpriteIndex === -1) {
      this.setActiveBrand(this.activeBrandIndex);
      return false;
    }

    this.setActiveBrand(this.hoveredSpriteIndex);
    return true;
  }

  handleBrandPointerDown(raycaster, camera) {
    if (!this.group.visible || !this.brandMode || !this.pointSprites.length) {
      return false;
    }

    if (this.activeBrandIndex === -1 || this.hoveredSpriteIndex !== this.activeBrandIndex) {
      return false;
    }

    const worldPosition = new THREE.Vector3();
    const planeNormal = new THREE.Vector3();
    const startWorld = new THREE.Vector3();
    const dragPlane = new THREE.Plane();
    const heroPosition = this.contentCurrentPositions[this.activeBrandIndex];

    if (!heroPosition) {
      return false;
    }

    worldPosition.copy(heroPosition).applyMatrix4(this.group.matrixWorld);
    camera.getWorldDirection(planeNormal);
    dragPlane.setFromNormalAndCoplanarPoint(planeNormal, worldPosition);

    if (!raycaster.ray.intersectPlane(dragPlane, startWorld)) {
      return false;
    }

    this.brandDrag = {
      dragPlane,
      startWorld,
      startOffset: this.brandHeroOffset.clone()
    };

    return true;
  }

  handleBrandPointerMove(raycaster) {
    if (!this.brandDrag) {
      return false;
    }

    const currentWorld = new THREE.Vector3();

    if (!raycaster.ray.intersectPlane(this.brandDrag.dragPlane, currentWorld)) {
      return true;
    }

    const startLocal = this.group.worldToLocal(this.brandDrag.startWorld.clone());
    const currentLocal = this.group.worldToLocal(currentWorld.clone());
    const deltaLocal = currentLocal.sub(startLocal);

    this.brandHeroOffset.copy(this.brandDrag.startOffset).add(deltaLocal);
    this.brandHeroOffset.x = THREE.MathUtils.clamp(this.brandHeroOffset.x, -2.8, 2.8);
    this.brandHeroOffset.y = THREE.MathUtils.clamp(this.brandHeroOffset.y, -2.4, 2.4);
    this.brandHeroOffset.z = THREE.MathUtils.clamp(this.brandHeroOffset.z, -0.9, 0.9);

    return true;
  }

  handleBrandPointerUp() {
    this.brandDrag = null;
  }

  handleCurationClick() {
    if (this.mode !== "points" && this.mode !== "hybrid") {
      return;
    }

    if (this.hoveredSpriteIndex !== -1) {
      const pointIndex = this.pointSprites[this.hoveredSpriteIndex].pointIndex;

      if (this.curationAnchors.has(pointIndex)) {
        this.curationAnchors.delete(pointIndex);
      } else {
        this.curationAnchors.add(pointIndex);
      }

      return;
    }

    if (this.hoveredInteractiveIndex === -1) {
      this.curationAnchors.clear();
      return;
    }

    const pointIndex = this.interactiveIndices[this.hoveredInteractiveIndex];

    if (this.curationAnchors.has(pointIndex)) {
      this.curationAnchors.delete(pointIndex);
    } else {
      this.curationAnchors.add(pointIndex);
    }
  }

  dispose() {
    this.pointGeometry.dispose();
    this.pointMaterial.dispose();
    for (const item of this.pointSprites) {
      item.sprite.material.dispose();
    }
    for (const texture of this.generatedContentTextures) {
      if (!texture?.userData?.sharedContentTexture) {
        texture.dispose();
      }
    }
    this.brandVisualCache.main?.dispose?.();
    for (const texture of this.brandVisualCache.orbit) {
      texture.dispose?.();
    }
    this.brandDecorCache.title?.dispose?.();
    this.brandDecorCache.subtitle?.dispose?.();
    this.brandDecorCache.tag?.dispose?.();
    this.brandDecorCache.backgroundWord?.dispose?.();
    this.brandBackdropSprite.material.dispose();
    this.brandTitleSprite.material.dispose();
    this.brandSubtitleSprite.material.dispose();
    this.brandTagSprite.material.dispose();
    this.brandMemorySprite.material.dispose();
    this.brandAuraGeometry.dispose();
    this.brandAuraMaterial.dispose();
    for (const texture of this.editorialTextureCache.heroBlocks || []) {
      texture?.dispose?.();
    }
    this.editorialTextureCache.labels?.dispose?.();
    for (const texture of this.editorialTextureCache.infoBlocks || []) {
      texture?.dispose?.();
    }
    for (const texture of this.editorialTextureCache.secondaryBlocks || []) {
      texture?.dispose?.();
    }
    for (const texture of this.editorialTextureCache.labelBlocks || []) {
      texture?.dispose?.();
    }
    for (const sprite of [...this.editorialHeroSprites, ...this.editorialInfoSprites, ...this.editorialSecondarySprites, ...this.editorialLabelSprites, this.editorialLabelsSprite, this.editorialMediaSprite]) {
      sprite.material.dispose();
    }
    this.editorialGuideGeometry.dispose();
    this.editorialGuideMaterial.dispose();
    this.activationLineGeometry.dispose();
    this.activationLineMaterial.dispose();
    this.activationDotGeometry.dispose();
    this.activationDotMaterial.dispose();
    this.scanPointGeometry.dispose();
    this.scanPointMaterial.dispose();
    this.connectionGeometry.dispose();
    this.connectionMaterial.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    for (const layer of Object.values(this.relationLayers)) {
      layer.geometry.dispose();
      layer.material.dispose();
    }
    for (const mesh of this.letterHitMeshes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    for (const mesh of this.letterSelectionMeshes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    for (const handle of this.letterStretchHandles) {
      handle.geometry.dispose();
      handle.material.dispose();
    }
    for (const child of this.localAxisGizmo.children) {
      child.geometry.dispose();
      child.material.dispose();
    }

    for (const layer of this.lineLayers) {
      layer.geometry.dispose();
      layer.material.dispose();
    }

    this.meshBaseGeometry.dispose();
    this.meshMaterial.dispose();
  }
}

function applyWorldMatrixToLinePositions(positions, matrixWorld) {
  const output = [];
  const vector = new THREE.Vector3();

  for (let index = 0; index < positions.length; index += 3) {
    vector.set(positions[index], positions[index + 1], positions[index + 2]).applyMatrix4(matrixWorld);
    output.push(vector.x, vector.y, vector.z);
  }

  return output;
}

export function buildProjectedSVGFromVariants(variants, camera, width, height) {
  const visibleVariants = variants.filter((variant) => variant.group.visible);

  if (!visibleVariants.length) {
    return "";
  }

  const vector = new THREE.Vector3();
  const lines = [];

  for (const variant of visibleVariants) {
    const positions = applyWorldMatrixToLinePositions(variant.wireCurrent, variant.group.matrixWorld);

    for (let index = 0; index < positions.length; index += 6) {
      vector.set(positions[index], positions[index + 1], positions[index + 2]);
      vector.project(camera);
      const x1 = ((vector.x + 1) * 0.5 * width).toFixed(2);
      const y1 = ((1 - vector.y) * 0.5 * height).toFixed(2);

      vector.set(positions[index + 3], positions[index + 4], positions[index + 5]);
      vector.project(camera);
      const x2 = ((vector.x + 1) * 0.5 * width).toFixed(2);
      const y2 = ((1 - vector.y) * 0.5 * height).toFixed(2);

      lines.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${variant.settings.color.getStyle()}" />`
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none" stroke-width="1.2" stroke-linecap="round">
${lines.join("\n")}
</svg>`;
}

export function buildExportGroupFromVariants(variants, mode) {
  const group = new THREE.Group();
  const matrix = new THREE.Matrix4();
  const worldMatrix = new THREE.Matrix4();

  for (const variant of variants) {
    if (!variant.group.visible) {
      continue;
    }

    if (mode === "outline") {
      const positions = applyWorldMatrixToLinePositions(variant.wireCurrent, variant.group.matrixWorld);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      group.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: variant.settings.color })));
      continue;
    }

    for (let index = 0; index < variant.meshObject.count; index += 1) {
      variant.meshObject.getMatrixAt(index, matrix);
      worldMatrix.multiplyMatrices(variant.group.matrixWorld, matrix);
      const geometry = variant.meshBaseGeometry.clone();
      geometry.applyMatrix4(worldMatrix);
      group.add(
        new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            color: variant.settings.color,
            emissive: variant.settings.color,
            emissiveIntensity: 0.12,
            metalness: 0.05,
            roughness: 0.4
          })
        )
      );
    }
  }

  return group;
}
