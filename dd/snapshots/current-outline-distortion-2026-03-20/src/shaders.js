export const pointVertexShader = `
  attribute vec3 aOrigin;
  attribute float aSize;
  attribute float aRandom;
  attribute float aDelay;

  uniform float uTime;
  uniform float uAssemble;
  uniform float uPixelRatio;
  uniform float uWaveStrength;
  uniform float uChaosStrength;
  uniform float uHoverStrength;
  uniform vec2 uPointer;

  varying float vAlpha;
  varying float vPulse;

  void main() {
    float duration = max(0.22, 1.0 - aDelay);
    float assemble = clamp((uAssemble - aDelay) / duration, 0.0, 1.0);
    assemble = smoothstep(0.0, 1.0, assemble);

    vec3 pos = mix(aOrigin, position, assemble);

    float wave = sin(pos.x * 0.085 + uTime * 1.35 + aRandom * 6.2831);
    wave *= cos(pos.y * 0.06 + uTime * 0.72 + aRandom * 4.0);
    pos.z += wave * (2.8 * uWaveStrength);
    pos.y += sin(pos.z * 0.13 + uTime + aRandom * 8.0) * (0.75 * uWaveStrength);

    float organic = sin((pos.x + pos.y) * 0.11 + uTime * 2.4 + aRandom * 17.0);
    organic *= cos(pos.z * 0.17 + uTime * 1.9 + aRandom * 13.0);
    pos += vec3(
      sin(aRandom * 41.0 + uTime * 1.8),
      cos(aRandom * 29.0 + uTime * 1.35),
      sin(aRandom * 37.0 + uTime * 1.55)
    ) * organic * (1.3 * uChaosStrength);

    float pointerDistance = distance(pos.xy * 0.018, uPointer);
    float pointerLift = exp(-pointerDistance * 9.0) * uHoverStrength;
    pos.z += pointerLift * 6.0;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float perspectiveSize = aSize * uPixelRatio * (260.0 / max(24.0, -mvPosition.z));
    gl_PointSize = max(1.5, perspectiveSize);
    gl_Position = projectionMatrix * mvPosition;

    vAlpha = mix(0.3, 1.0, assemble);
    vPulse = pointerLift + abs(wave) * 0.35 + uChaosStrength * 0.18;
  }
`;

export const pointFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vAlpha;
  varying float vPulse;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv);

    float core = 1.0 - smoothstep(0.0, 0.26, dist);
    float halo = 1.0 - smoothstep(0.08, 0.5, dist);
    float alpha = (core * 0.88 + halo * 0.52) * uOpacity * vAlpha;

    if (alpha < 0.015) {
      discard;
    }

    vec3 color = uColor;
    color += vec3(0.18, 0.42, 0.24) * halo * 0.45;
    color += vec3(0.06, 0.12, 0.08) * vPulse;

    gl_FragColor = vec4(color, alpha);
  }
`;
