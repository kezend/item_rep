import * as THREE from "three";
import { pointFragmentShader, pointVertexShader } from "./shaders.js";

const TEXT_CANVAS_WIDTH = 1400;
const TEXT_CANVAS_HEIGHT = 420;

function randomSigned(scale) {
  return (Math.random() - 0.5) * scale;
}

function pickFontSize(context, text) {
  let fontSize = 280;

  while (fontSize > 72) {
    context.font = `700 ${fontSize}px "Arial Black", "Helvetica Neue", sans-serif`;
    if (context.measureText(text).width <= TEXT_CANVAS_WIDTH * 0.84) {
      return fontSize;
    }

    fontSize -= 10;
  }

  return 72;
}

function createScatterPosition(target, spread) {
  const radius = spread * (0.45 + Math.random() * 0.95);
  const theta = Math.random() * Math.PI * 2.0;
  const phi = Math.acos(2.0 * Math.random() - 1.0);

  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta) * radius + randomSigned(spread * 0.24),
    Math.cos(phi) * radius + randomSigned(spread * 0.18),
    Math.sin(phi) * Math.sin(theta) * radius + randomSigned(spread * 0.4)
  ).addScaledVector(target, 0.08);
}

function buildPointCloudData(text) {
  const canvas = document.createElement("canvas");
  canvas.width = TEXT_CANVAS_WIDTH;
  canvas.height = TEXT_CANVAS_HEIGHT;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Unable to create a 2D canvas context for text sampling.");
  }

  const normalizedText = (text || "ANIMA").toUpperCase().trim() || "ANIMA";
  const fontSize = pickFontSize(context, normalizedText);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${fontSize}px "Arial Black", "Helvetica Neue", sans-serif`;
  context.fillText(normalizedText, canvas.width / 2, canvas.height / 2 + fontSize * 0.04);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const sampleStep = normalizedText.length > 10 ? 6 : 5;
  const scale = 0.09;
  const thickness = THREE.MathUtils.clamp(24 - normalizedText.length * 0.65, 14, 24);

  const positions = [];
  const origins = [];
  const sizes = [];
  const randoms = [];
  const delays = [];
  const center = new THREE.Vector3();
  let pointCount = 0;

  for (let y = 0; y < canvas.height; y += sampleStep) {
    for (let x = 0; x < canvas.width; x += sampleStep) {
      const alpha = pixels[(y * canvas.width + x) * 4 + 3];

      if (alpha < 150 || Math.random() < 0.08) {
        continue;
      }

      const layers = 4 + Math.floor(Math.random() * 3);
      const baseX = (x - canvas.width / 2) * scale;
      const baseY = (canvas.height / 2 - y) * scale;

      for (let layer = 0; layer < layers; layer += 1) {
        const depthT = layers === 1 ? 0.5 : layer / (layers - 1);
        const target = new THREE.Vector3(
          baseX + randomSigned(0.28),
          baseY + randomSigned(0.28),
          (depthT - 0.5) * thickness + randomSigned(0.7)
        );

        const origin = createScatterPosition(target, 110);

        positions.push(target.x, target.y, target.z);
        origins.push(origin.x, origin.y, origin.z);
        sizes.push(2.3 + Math.random() * 2.7);
        randoms.push(Math.random());
        delays.push(Math.random() * 0.62);

        center.add(target);
        pointCount += 1;
      }
    }
  }

  if (pointCount === 0) {
    return buildPointCloudData("ANIMA");
  }

  center.multiplyScalar(1 / pointCount);

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] -= center.x;
    positions[i + 1] -= center.y;
    positions[i + 2] -= center.z;
    origins[i] -= center.x;
    origins[i + 1] -= center.y;
    origins[i + 2] -= center.z;
  }

  return {
    positions: new Float32Array(positions),
    origins: new Float32Array(origins),
    sizes: new Float32Array(sizes),
    randoms: new Float32Array(randoms),
    delays: new Float32Array(delays),
    pointCount
  };
}

export function createParticleText(text) {
  const data = buildPointCloudData(text);
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute("aOrigin", new THREE.BufferAttribute(data.origins, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(data.sizes, 1));
  geometry.setAttribute("aRandom", new THREE.BufferAttribute(data.randoms, 1));
  geometry.setAttribute("aDelay", new THREE.BufferAttribute(data.delays, 1));
  geometry.computeBoundingSphere();

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAssemble: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uWaveStrength: { value: 0.85 },
      uChaosStrength: { value: 0.15 },
      uHoverStrength: { value: 0.75 },
      uPointer: { value: new THREE.Vector2(3, 3) },
      uColor: { value: new THREE.Color("#00ff66") },
      uOpacity: { value: 1 }
    },
    vertexShader: pointVertexShader,
    fragmentShader: pointFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  points.rotation.x = 0.06;

  return {
    points,
    pointCount: data.pointCount,
    dispose() {
      geometry.dispose();
      material.dispose();
    }
  };
}
