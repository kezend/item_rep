import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { OBJExporter } from "three/addons/exporters/OBJExporter.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

let activeRecording = null;
const GIF_WORKER_PROXY_PATH = "./src/gif.worker.local.js";

function downloadBlob(fileName, blob) {
  if (!blob) {
    throw new Error(`Unable to generate ${fileName}.`);
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
}

function ensureExportReady(studio) {
  if (!studio?.canvas || !studio?.renderer || !studio?.camera) {
    throw new Error("Scene is not ready for export yet.");
  }
}

async function waitForRenderableFrame(studio, frames = 2) {
  for (let index = 0; index < frames; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    studio.renderFrame?.(studio.clock?.getElapsedTime?.() ?? 0);
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`Unable to encode ${type}.`));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}

function resolveExportSize(stage, options = {}) {
  const ratio = options.ratio || "current";
  const base = Math.max(256, Number(options.size) || 1080);
  const currentWidth = Math.max(1, stage.clientWidth || 1);
  const currentHeight = Math.max(1, stage.clientHeight || 1);

  if (ratio === "1:1") {
    return { width: base, height: base };
  }

  if (ratio === "4:5") {
    return { width: Math.round(base * 0.8), height: base };
  }

  if (ratio === "16:9") {
    return { width: base, height: Math.round((base * 9) / 16) };
  }

  if (ratio === "9:16") {
    return { width: Math.round((base * 9) / 16), height: base };
  }

  const aspect = currentWidth / currentHeight;

  if (aspect >= 1) {
    return {
      width: base,
      height: Math.max(1, Math.round(base / aspect))
    };
  }

  return {
    width: Math.max(1, Math.round(base * aspect)),
    height: base
  };
}

function applyStudioRenderSize(studio, width, height, pixelRatio) {
  studio.camera.aspect = width / Math.max(height, 1);
  studio.camera.updateProjectionMatrix();
  studio.renderer.setPixelRatio(pixelRatio);
  studio.renderer.setSize(width, height, false);
  studio.composer.setSize(width, height);
  studio.bloomPass.resolution.set(width, height);

  for (const variant of studio.variants || []) {
    variant.setResolution?.(width, height);
  }
}

async function withTemporaryRenderSize(studio, options, renderTask) {
  const { width, height } = resolveExportSize(studio.stage, options);
  const previousPixelRatio = studio.renderer.getPixelRatio();
  const previousCanvasWidth = studio.canvas.width;
  const previousCanvasHeight = studio.canvas.height;
  const previousDisplayWidth = Math.max(1, Math.round(previousCanvasWidth / Math.max(previousPixelRatio, 1)));
  const previousDisplayHeight = Math.max(1, Math.round(previousCanvasHeight / Math.max(previousPixelRatio, 1)));

  applyStudioRenderSize(studio, width, height, 1);

  try {
    return await renderTask({ width, height });
  } finally {
    applyStudioRenderSize(studio, previousDisplayWidth, previousDisplayHeight, previousPixelRatio);
    studio.resize?.();
    studio.renderFrame(studio.clock.getElapsedTime());
  }
}

function cloneExportCamera(studio, width, height) {
  const camera = studio.camera.clone();
  camera.position.copy(studio.camera.position);
  camera.quaternion.copy(studio.camera.quaternion);
  camera.scale.copy(studio.camera.scale);
  camera.zoom = studio.camera.zoom;
  camera.fov = studio.camera.fov;
  camera.near = studio.camera.near;
  camera.far = studio.camera.far;
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

function hasIsolatedContentLayer(studio) {
  return (studio.variants || []).some((variant) => variant.hasNonBloomContentLayer?.());
}

function renderSceneWithOptionalIsolatedLayer({
  renderer,
  scene,
  camera,
  width,
  height,
  glowEnabled,
  glowSource,
  excludeLayer2FromBloom = false
}) {
  const useGlow = Boolean(glowEnabled && glowSource);
  const isolatedLayer = Boolean(excludeLayer2FromBloom);

  if (useGlow) {
    const composer = new EffectComposer(renderer);
    composer.setSize(width, height);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      { x: width, y: height },
      glowSource.strength,
      glowSource.radius,
      glowSource.threshold
    );
    composer.addPass(bloom);

    const previousMask = camera.layers.mask;

    try {
      if (isolatedLayer) {
        camera.layers.disable(2);
      }

      composer.render();

      if (isolatedLayer) {
        renderer.clearDepth();
        const previousAutoClear = renderer.autoClear;
        renderer.autoClear = false;
        camera.layers.set(2);
        renderer.render(scene, camera);
        renderer.autoClear = previousAutoClear;
      }
    } finally {
      camera.layers.mask = previousMask;
      composer.dispose?.();
    }

    return;
  }

  renderer.render(scene, camera);
}

function compositeGlowCanvasOntoTransparentOutput(outputCanvas, glowCanvas) {
  const outputContext = outputCanvas.getContext("2d");
  const glowContext = glowCanvas.getContext("2d");

  if (!outputContext || !glowContext) {
    return;
  }

  const imageData = glowContext.getImageData(0, 0, glowCanvas.width, glowCanvas.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = Math.max(data[index], data[index + 1], data[index + 2]);
    data[index + 3] = alpha;
  }

  const glowAlphaCanvas = document.createElement("canvas");
  glowAlphaCanvas.width = glowCanvas.width;
  glowAlphaCanvas.height = glowCanvas.height;
  const glowAlphaContext = glowAlphaCanvas.getContext("2d");

  if (!glowAlphaContext) {
    return;
  }

  glowAlphaContext.putImageData(imageData, 0, 0);
  outputContext.save();
  outputContext.globalCompositeOperation = "lighter";
  outputContext.drawImage(glowAlphaCanvas, 0, 0);
  outputContext.restore();
}

function compositeGlowCanvasOntoTransparentOutputFast(outputCanvas, glowCanvas) {
  const outputContext = outputCanvas.getContext("2d");

  if (!outputContext) {
    return;
  }

  outputContext.save();
  outputContext.globalCompositeOperation = "lighter";
  outputContext.drawImage(glowCanvas, 0, 0);
  outputContext.restore();
}

function extractGlowOnlyCanvas(baseCanvas, bloomCanvas) {
  const width = bloomCanvas.width;
  const height = bloomCanvas.height;
  const result = document.createElement("canvas");
  result.width = width;
  result.height = height;

  const baseContext = baseCanvas.getContext("2d");
  const bloomContext = bloomCanvas.getContext("2d");
  const resultContext = result.getContext("2d");

  if (!baseContext || !bloomContext || !resultContext) {
    return bloomCanvas;
  }

  const baseData = baseContext.getImageData(0, 0, width, height);
  const bloomData = bloomContext.getImageData(0, 0, width, height);
  const output = resultContext.createImageData(width, height);

  for (let index = 0; index < output.data.length; index += 4) {
    const r = Math.max(0, bloomData.data[index] - baseData.data[index]);
    const g = Math.max(0, bloomData.data[index + 1] - baseData.data[index + 1]);
    const b = Math.max(0, bloomData.data[index + 2] - baseData.data[index + 2]);
    const a = Math.max(r, g, b);

    output.data[index] = r;
    output.data[index + 1] = g;
    output.data[index + 2] = b;
    output.data[index + 3] = a;
  }

  resultContext.putImageData(output, 0, 0);
  return result;
}

async function renderSceneToCanvas(studio, width, height, options = {}) {
  await waitForRenderableFrame(studio, 2);

  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;

  const transparentBackground = Boolean(options.transparentBackground);
  const usePostprocessing = !options.forceDirect;
  const isolateContentLayer = hasIsolatedContentLayer(studio);
  const tempRenderer = new studio.renderer.constructor({
    canvas: output,
    antialias: true,
    alpha: transparentBackground,
    preserveDrawingBuffer: true
  });

  tempRenderer.outputColorSpace = studio.renderer.outputColorSpace;
  tempRenderer.setPixelRatio(1);
  tempRenderer.setSize(width, height, false);
  tempRenderer.setClearColor(studio.config?.backgroundColor || "#000000", transparentBackground ? 0 : 1);

  const camera = cloneExportCamera(studio, width, height);
  const previousBackground = studio.scene.background;
  const previousPlaneVisible = studio.backgroundPlane?.visible;
  const glowSource = studio.bloomPass
    ? {
        strength: studio.bloomPass.strength,
        radius: studio.bloomPass.radius,
        threshold: studio.bloomPass.threshold
      }
    : null;

  try {
    if (transparentBackground) {
      studio.scene.background = null;

      if (studio.backgroundPlane) {
        studio.backgroundPlane.visible = false;
      }
    }

    if (transparentBackground && usePostprocessing && studio.config?.glow?.enabled) {
      const fastHugeGlowComposite = Math.max(width, height) >= 6144;
      const baseRenderer = tempRenderer;
      baseRenderer.setClearColor(studio.config?.backgroundColor || "#000000", 0);
      baseRenderer.render(studio.scene, camera);

      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = width;
      glowCanvas.height = height;
      const glowRenderer = new studio.renderer.constructor({
        canvas: glowCanvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
      });
      glowRenderer.outputColorSpace = studio.renderer.outputColorSpace;
      glowRenderer.setPixelRatio(1);
      glowRenderer.setSize(width, height, false);
      glowRenderer.setClearColor("#000000", 0);

      try {
        renderSceneWithOptionalIsolatedLayer({
          renderer: glowRenderer,
          scene: studio.scene,
          camera,
          width,
          height,
          glowEnabled: true,
          glowSource,
          excludeLayer2FromBloom: isolateContentLayer
        });
        if (fastHugeGlowComposite) {
          compositeGlowCanvasOntoTransparentOutputFast(output, glowCanvas);
        } else {
          compositeGlowCanvasOntoTransparentOutput(output, glowCanvas);
        }
      } finally {
        glowRenderer.dispose();
      }
    } else if (usePostprocessing) {
      renderSceneWithOptionalIsolatedLayer({
        renderer: tempRenderer,
        scene: studio.scene,
        camera,
        width,
        height,
        glowEnabled: Boolean(studio.config?.glow?.enabled),
        glowSource,
        excludeLayer2FromBloom: isolateContentLayer
      });
    } else {
      tempRenderer.render(studio.scene, camera);
    }

    return output;
  } finally {
    studio.scene.background = previousBackground;

    if (studio.backgroundPlane) {
      studio.backgroundPlane.visible = previousPlaneVisible;
    }
    tempRenderer.dispose();
  }
}

async function renderStillCanvas(studio, options = {}) {
  const { width, height } = resolveExportSize(studio.stage, options);
  const forceDirect = Math.max(width, height) >= 6144;
  return renderSceneToCanvas(studio, width, height, {
    ...options,
    forceDirect,
    transparentBackground: false
  });
}

async function renderTransparentStillCanvas(studio, options = {}) {
  const { width, height } = resolveExportSize(studio.stage, options);
  return renderSceneToCanvas(studio, width, height, {
    ...options,
    forceDirect: false,
    transparentBackground: true
  });
}

function getGifQuality(options = {}) {
  const quality = Number(options.quality ?? 0.9);
  return Math.max(1, Math.min(30, Math.round(30 - quality * 24)));
}

function getVideoBitrate(options = {}) {
  const quality = Number(options.quality ?? 0.9);
  return Math.round(4_000_000 + quality * 12_000_000);
}

function buildVideoAttemptPlans(options = {}) {
  const requestedFps = Math.max(1, Number(options.fps) || 24);
  const requestedBitrate = getVideoBitrate(options);
  return Array.from(new Map([
    {
      fps: requestedFps,
      bitrate: requestedBitrate
    },
    {
      fps: Math.min(requestedFps, 30),
      bitrate: Math.round(requestedBitrate * 0.68)
    },
    {
      fps: Math.min(requestedFps, 24),
      bitrate: Math.round(requestedBitrate * 0.45)
    },
    {
      fps: 24,
      bitrate: null
    }
  ].filter((plan) => Number.isFinite(plan.fps) && plan.fps >= 1).map((plan) => [
    `${plan.fps}:${plan.bitrate || 0}`,
    {
      fps: plan.fps,
      bitrate: plan.bitrate && plan.bitrate > 0 ? plan.bitrate : null
    }
  ])).values());
}

function getCaptureConfig(options = {}) {
  const durationSeconds = Math.max(0.25, Number(options.duration) || 4);
  const fps = Math.max(1, Number(options.fps) || 24);
  const requestedFrames = Math.max(1, Math.round(Number(options.frames) || durationSeconds * fps));
  const frameIntervalMs = durationSeconds * 1000 / requestedFrames;

  return {
    durationSeconds,
    durationMs: durationSeconds * 1000,
    fps,
    frameIntervalMs,
    frameCount: requestedFrames
  };
}

function getVideoMimeCandidates() {
  const candidates = [
    { mimeType: "video/mp4;codecs=h264", extension: "mp4" },
    { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" }
  ];

  return candidates.filter((candidate) => window.MediaRecorder?.isTypeSupported?.(candidate.mimeType));
}

function createCountdownReporter(setStatus, prefix, durationMs) {
  let rafId = 0;
  let active = true;
  const startedAt = performance.now();

  const tick = () => {
    if (!active) {
      return;
    }

    const remaining = Math.max(0, durationMs - (performance.now() - startedAt));
    setStatus(`${prefix} ${remaining <= 0 ? "0.0" : (remaining / 1000).toFixed(1)}s`);
    rafId = requestAnimationFrame(tick);
  };

  tick();

  return () => {
    active = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
  };
}

function ensureRecordingAvailable() {
  if (activeRecording?.active) {
    throw new Error("A recording is already in progress.");
  }
}

async function recordLiveGif(studio, options, setStatus) {
  if (!window.GIF) {
    throw new Error("GIF export is unavailable because gif.js did not load.");
  }

  const capture = getCaptureConfig(options);

  return withTemporaryRenderSize(studio, options, async ({ width, height }) => {
    await waitForRenderableFrame(studio, 2);

    const gif = new window.GIF({
      workers: 2,
      quality: getGifQuality(options),
      width,
      height,
      workerScript: GIF_WORKER_PROXY_PATH,
      transparent: options.transparentBackground ? "rgba(0,0,0,0)" : undefined
    });

    const stopCountdown = createCountdownReporter(setStatus, "Recording GIF...", capture.durationMs);
    const startedAt = performance.now();
    let lastFrameAt = -Infinity;
    let capturedFrames = 0;

    await new Promise((resolve, reject) => {
      const grab = (now) => {
        if (!activeRecording?.active) {
          reject(new Error(activeRecording?.reason || "Recording cancelled."));
          return;
        }

        const elapsed = now - startedAt;

        if (now - lastFrameAt >= capture.frameIntervalMs - 2) {
          gif.addFrame(studio.canvas, { copy: true, delay: capture.frameIntervalMs });
          lastFrameAt = now;
          capturedFrames += 1;
        }

        if (elapsed >= capture.durationMs || capturedFrames >= capture.frameCount) {
          resolve();
          return;
        }

        requestAnimationFrame(grab);
      };

      requestAnimationFrame(grab);
    });

    stopCountdown();
    setStatus("Encoding GIF...");

    return await new Promise((resolve) => {
      gif.on("finished", resolve);
      gif.render();
    });
  });
}

async function recordLiveVideo(studio, options, setStatus) {
  if (!window.MediaRecorder) {
    throw new Error("Video export is unavailable because MediaRecorder is not supported.");
  }

  const mimeCandidates = getVideoMimeCandidates();

  if (!mimeCandidates.length) {
    throw new Error("Video export is unavailable in this browser.");
  }

  const capture = getCaptureConfig(options);
  const attemptPlans = buildVideoAttemptPlans(options);

  let lastError = null;

  for (const mimeInfo of mimeCandidates) {
    for (const attempt of attemptPlans) {
      try {
        return await withTemporaryRenderSize(studio, options, async () => {
          await waitForRenderableFrame(studio, 2);

          const stream = studio.canvas.captureStream(attempt.fps);
          const chunks = [];
          let recorder;
          let finalizeTimeoutId = 0;

          try {
            recorder = new MediaRecorder(stream, {
              mimeType: mimeInfo.mimeType,
              ...(attempt.bitrate ? { videoBitsPerSecond: attempt.bitrate } : {})
            });
          } catch (error) {
            for (const track of stream.getTracks()) {
              track.stop();
            }
            throw error;
          }

          activeRecording.recorder = recorder;
          activeRecording.stream = stream;

          recorder.ondataavailable = (event) => {
            if (event.data?.size) {
              chunks.push(event.data);
            }
          };

          let encoderInitError = null;
          const stopped = new Promise((resolve, reject) => {
            recorder.onstop = () => {
              if (finalizeTimeoutId) {
                clearTimeout(finalizeTimeoutId);
              }
              if (encoderInitError) {
                reject(encoderInitError);
                return;
              }
              resolve();
            };
            recorder.onerror = (event) => {
              const error = event.error || new Error("Video recording failed.");
              encoderInitError = error;
              reject(error);
            };
          });

          const stopCountdown = createCountdownReporter(
            setStatus,
            `Recording Video (${mimeInfo.extension.toUpperCase()} ${attempt.fps}fps)...`,
            capture.durationMs
          );

          try {
            recorder.start();
          } catch (error) {
            stopCountdown();
            for (const track of stream.getTracks()) {
              track.stop();
            }
            throw error;
          }

          try {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(resolve, capture.durationMs);
              activeRecording.cancel = () => {
                clearTimeout(timeout);
                reject(new Error(activeRecording?.reason || "Recording cancelled."));
              };
            });
          } catch (error) {
            stopCountdown();
            try {
              if (recorder.state !== "inactive") {
                recorder.stop();
              }
            } catch {}
            throw error;
          }

          stopCountdown();
          setStatus(`Finalizing Video (${mimeInfo.extension.toUpperCase()} ${attempt.fps}fps)...`);
          activeRecording.cancel = null;

          if (recorder.state !== "inactive") {
            try {
              recorder.requestData?.();
            } catch {}
            recorder.stop();
          }

          await Promise.race([
            stopped,
            new Promise((_, reject) => {
              finalizeTimeoutId = window.setTimeout(() => {
                reject(new Error("Video recorder did not finalize."));
              }, 4000);
            })
          ]);

          const blob = new Blob(chunks, { type: mimeInfo.mimeType });

          if (!blob.size) {
            throw new Error("Recorded video is empty.");
          }

          return {
            blob,
            extension: mimeInfo.extension
          };
        }).finally(() => {
          for (const track of activeRecording?.stream?.getTracks?.() || []) {
            track.stop();
          }
        });
      } catch (error) {
        lastError = error;
        const message = String(error?.message || error || "");
        const canRetry = /encoder initialization failed|not supported|failed to initialize|could not start|starting|empty|did not finalize/i.test(message);

        if (!canRetry) {
          throw error;
        }

        setStatus(`Encoder ${mimeInfo.extension.toUpperCase()} failed at ${attempt.fps}fps. Trying fallback...`);
      }
    }
  }

  throw lastError || new Error("Video export encoder initialization failed.");
}

export function cancelActiveRecording(reason = "Recording stopped.") {
  if (!activeRecording?.active) {
    return;
  }

  activeRecording.active = false;
  activeRecording.reason = reason;

  try {
    activeRecording.cancel?.();
  } catch {}

  try {
    if (activeRecording.recorder && activeRecording.recorder.state !== "inactive") {
      activeRecording.recorder.stop();
    }
  } catch {}

  try {
    for (const track of activeRecording.stream?.getTracks?.() || []) {
      track.stop();
    }
  } catch {}
}

export async function exportPNG(studio, fileName, options = {}) {
  ensureExportReady(studio);
  const wantsTransparent = Boolean(options.transparentBackground);
  const canvas = wantsTransparent
    ? await renderTransparentStillCanvas(studio, options)
    : await renderStillCanvas(studio, {
        ...options,
        transparentBackground: false
      });
  const blob = await canvasToBlob(canvas, "image/png");
  downloadBlob(fileName, blob);
}

export async function exportJPG(studio, fileName, options = {}) {
  ensureExportReady(studio);
  const canvas = await renderStillCanvas(studio, {
    ...options,
    transparentBackground: false
  });
  const blob = await canvasToBlob(canvas, "image/jpeg", Number(options.quality ?? 0.92));
  downloadBlob(fileName, blob);
}

export async function exportGif(studio, fileName, setStatus, options = {}) {
  ensureExportReady(studio);
  ensureRecordingAvailable();
  activeRecording = {
    active: true,
    reason: "",
    recorder: null,
    stream: null,
    cancel: null
  };

  try {
    const blob = await recordLiveGif(studio, options, setStatus);
    downloadBlob(fileName, blob);
  } finally {
    activeRecording = null;
  }
}

export async function exportMP4(studio, fileName, setStatus, options = {}) {
  ensureExportReady(studio);
  ensureRecordingAvailable();
  activeRecording = {
    active: true,
    reason: "",
    recorder: null,
    stream: null,
    cancel: null
  };

  try {
    const { blob, extension } = await recordLiveVideo(studio, options, setStatus);
    const outputName = extension === "webm" ? fileName.replace(/\.mp4$/i, ".webm") : fileName;
    downloadBlob(outputName, blob);
  } finally {
    activeRecording = null;
  }
}

export const exportVideo = exportMP4;

export function exportSVG(studio, fileName) {
  ensureExportReady(studio);
  const svg = studio.getProjectedSVG();

  if (!svg) {
    throw new Error("Switch to wireframe mode or generate type before exporting SVG.");
  }

  downloadBlob(fileName, new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
}

export async function exportGLTF(studio, fileName) {
  ensureExportReady(studio);
  const exporter = new GLTFExporter();
  const object = studio.createExportGroup();

  await new Promise((resolve, reject) => {
    exporter.parse(
      object,
      (result) => {
        if (result instanceof ArrayBuffer) {
          downloadBlob(fileName, new Blob([result], { type: "model/gltf-binary" }));
        } else {
          downloadBlob(fileName, new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
        }
        resolve();
      },
      (error) => reject(error),
      { binary: false }
    );
  });
}

export function exportOBJ(studio, fileName) {
  ensureExportReady(studio);
  const exporter = new OBJExporter();
  const object = studio.createExportGroup();
  const contents = exporter.parse(object);
  downloadBlob(fileName, new Blob([contents], { type: "text/plain;charset=utf-8" }));
}
