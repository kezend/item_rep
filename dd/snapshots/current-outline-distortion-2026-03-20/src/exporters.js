import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { OBJExporter } from "three/addons/exporters/OBJExporter.js";

function downloadBlob(fileName, blob) {
  if (!blob) {
    throw new Error(`Unable to generate ${fileName}.`);
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function captureStage(stage, backgroundColor) {
  if (!window.html2canvas) {
    throw new Error("html2canvas is unavailable, so image export is disabled.");
  }

  return window.html2canvas(stage, {
    backgroundColor,
    scale: 2,
    useCORS: true,
    logging: false
  });
}

export async function exportPNG(stage, fileName) {
  stage.classList.add("is-export-transparent");
  let canvas;

  try {
    canvas = await captureStage(stage, null);
  } finally {
    stage.classList.remove("is-export-transparent");
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  downloadBlob(fileName, blob);
}

export async function exportJPG(stage, fileName) {
  const canvas = await captureStage(stage, "#000000");
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  downloadBlob(fileName, blob);
}

export async function exportGif(studio, fileName, setStatus) {
  if (!window.GIF) {
    throw new Error("GIF export is unavailable because gif.js did not load.");
  }

  const gif = new window.GIF({
    workers: 2,
    quality: 8,
    workerScript: "https://cdn.jsdelivr.net/npm/gif.js.optimized/dist/gif.worker.js",
    transparent: "rgba(0,0,0,0)"
  });

  const fps = 12;
  const totalFrames = 24;
  const startTime = studio.clock.getElapsedTime();

  for (let frame = 0; frame < totalFrames; frame += 1) {
    setStatus(`Capturing GIF frame ${frame + 1}/${totalFrames}…`);
    studio.renderFrame(startTime + frame / fps);
    gif.addFrame(studio.canvas, { copy: true, delay: 1000 / fps });
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  const blob = await new Promise((resolve) => {
    gif.on("finished", resolve);
    gif.render();
    setStatus("Encoding GIF…");
  });

  downloadBlob(fileName, blob);
}

export function exportSVG(studio, fileName) {
  const svg = studio.getProjectedSVG();

  if (!svg) {
    throw new Error("Switch to wireframe mode or generate type before exporting SVG.");
  }

  downloadBlob(fileName, new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
}

export async function exportGLTF(studio, fileName) {
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
  const exporter = new OBJExporter();
  const object = studio.createExportGroup();
  const contents = exporter.parse(object);
  downloadBlob(fileName, new Blob([contents], { type: "text/plain;charset=utf-8" }));
}
