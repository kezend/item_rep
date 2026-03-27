import * as THREE from "three";

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

function getAxisDistortion(global, name, fallbackName, multiplier) {
  return (global[name] ?? global[fallbackName] ?? 0) * multiplier;
}

function transformPoint(base, origin, random, revealOffset, runtime, multipliers, bounds) {
  const intro = THREE.MathUtils.clamp((runtime.intro - revealOffset) / Math.max(0.22, 1 - revealOffset), 0, 1);
  const assemble = THREE.MathUtils.lerp(1 - runtime.animation.scatter, runtime.animation.assemble, intro);
  const global = runtime.globalDistortion;

  const bendX = getAxisDistortion(global, "bendX", "bend", multipliers.bendX);
  const bendY = getAxisDistortion(global, "bendY", "bend", multipliers.bendY);
  const bendZ = getAxisDistortion(global, "bendZ", "bend", multipliers.bendZ);
  const twistX = getAxisDistortion(global, "twistX", "twist", multipliers.twistX);
  const twistY = getAxisDistortion(global, "twistY", "twist", multipliers.twistY);
  const twistZ = getAxisDistortion(global, "twistZ", "twist", multipliers.twistZ);
  const waveBase = global.waveAmplitude ?? global.wave ?? 0;
  const waveX = waveBase * multipliers.waveX;
  const waveY = waveBase * multipliers.waveY;
  const waveZ = waveBase * multipliers.waveZ;
  const noiseBase = global.noiseIntensity ?? global.noise ?? 0;
  const noiseLow = noiseBase * multipliers.noiseLow;
  const noiseHigh = noiseBase * multipliers.noiseHigh;

  let x = base.x;
  let y = base.y;
  let z = base.z;

  const nx = bounds.width ? x / Math.max(bounds.width * 0.5, 0.001) : 0;
  const ny = bounds.height ? y / Math.max(bounds.height * 0.5, 0.001) : 0;
  const nz = bounds.depth ? z / Math.max(bounds.depth * 0.5, 0.001) : 0;

  x *= 1 + multipliers.axisScale.x * multipliers.axisPriority.x * (0.7 + Math.abs(ny) * 0.8);
  y *= 1 + multipliers.axisScale.y * multipliers.axisPriority.y * (0.7 + Math.abs(nz) * 0.8);
  z *= 1 + multipliers.axisScale.z * multipliers.axisPriority.z * (0.7 + Math.abs(nx) * 0.8);

  const skewX = multipliers.shear.xy * y + multipliers.shear.xz * z;
  const skewY = multipliers.shear.yx * x + multipliers.shear.yz * z;
  const skewZ = multipliers.shear.zx * x + multipliers.shear.zy * y;

  x += skewX;
  y += skewY;
  z += skewZ;

  x += bendX * (y * y * 0.22 + z * z * 0.11) * (x >= 0 ? 1 : -1);
  y += bendY * (x * x * 0.2 + z * z * 0.1) * (y >= 0 ? 1 : -1);
  z += bendZ * (x * x * 0.24 + y * y * 0.12) * (z >= 0 ? 1 : -1);

  const fieldX = multipliers.rotationField.x * Math.sin((ny + nz) * 2.8 + runtime.time * 0.75 + random * 7.0);
  const fieldY = multipliers.rotationField.y * Math.cos((nx + nz) * 2.6 - runtime.time * 0.65 + random * 9.0);
  const fieldZ = multipliers.rotationField.z * Math.sin((nx + ny) * 3.1 + runtime.time * 0.55 + random * 13.0);

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

export class TypographyVariant {
  constructor(data, settings, width, height) {
    this.data = data;
    this.settings = settings;
    this.group = new THREE.Group();
    this.group.position.copy(settings.position);
    this.group.rotation.copy(settings.rotation);
    this.group.scale.setScalar(settings.scale);

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
    this.pointGeometry.computeBoundingSphere();

    this.pointMaterial = new THREE.PointsMaterial({
      color: settings.color,
      size: 0.055,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.pointObject = new THREE.Points(this.pointGeometry, this.pointMaterial);
    this.group.add(this.pointObject);

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
      color: settings.color,
      emissive: settings.color,
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
    this.setMode("outline");
  }

  setResolution() {}

  setMode(mode) {
    this.mode = mode;
    this.pointObject.visible = mode === "points";
    for (const layer of this.lineLayers) {
      layer.object.visible = mode === "outline";
    }
    this.meshObject.visible = mode === "mesh";
  }

  setAppearance({ strokeWidth, opacity, glowEnabled }) {
    const widthFactor = THREE.MathUtils.clamp((strokeWidth || 1.6) / 6, 0.1, 1.4);
    this.outlineScaleBoost = widthFactor;

    for (let index = 0; index < this.lineLayers.length; index += 1) {
      const layer = this.lineLayers[index];
      layer.material.opacity = layer.opacity * opacity;
      layer.object.scale.setScalar(layer.baseScale + widthFactor * index * 0.012);
      layer.object.position.copy(layer.baseOffset).multiplyScalar(1 + widthFactor * 0.18);
    }

    this.pointMaterial.opacity = opacity;
    this.meshMaterial.opacity = opacity * 0.9;
    this.meshMaterial.emissiveIntensity = glowEnabled ? 0.22 : 0.05;
  }

  update(runtime) {
    const bounds = this.data.bounds || { width: 4, height: 1.4, depth: 0.6 };

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
      this.pointCurrent[offset] = result.x;
      this.pointCurrent[offset + 1] = result.y;
      this.pointCurrent[offset + 2] = result.z;
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
      this.outlineCurrent[offset] = result.x;
      this.outlineCurrent[offset + 1] = result.y;
      this.outlineCurrent[offset + 2] = result.z;
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

      this.meshCurrent[offset] = result.x;
      this.meshCurrent[offset + 1] = result.y;
      this.meshCurrent[offset + 2] = result.z;

      this.meshDummy.position.set(result.x, result.y, result.z);
      this.meshDummy.scale.setScalar(this.data.meshScales[index] * (1 + runtime.animation.pulse * 0.08));
      this.meshDummy.updateMatrix();
      this.meshObject.setMatrixAt(index, this.meshDummy.matrix);
    }

    this.pointAttribute.needsUpdate = true;

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

    this.meshObject.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.pointGeometry.dispose();
    this.pointMaterial.dispose();

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
  if (!variants.length) {
    return "";
  }

  const vector = new THREE.Vector3();
  const lines = [];

  for (const variant of variants) {
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
