const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;

function randomSigned(scale) {
  return (Math.random() - 0.5) * scale;
}

function measureTrackedLine(context, line, tracking) {
  let width = 0;

  for (const character of line) {
    width += context.measureText(character).width + tracking;
  }

  return Math.max(0, width - tracking);
}

function drawTrackedLine(context, line, startX, baselineY, tracking) {
  let cursorX = startX;

  for (const character of line) {
    context.fillText(character, cursorX, baselineY);
    cursorX += context.measureText(character).width + tracking;
  }
}

async function ensureFontLoaded(fontFamily, fontSize) {
  if (!document.fonts?.load) {
    return;
  }

  await document.fonts.load(`700 ${fontSize}px "${fontFamily}"`);
  await document.fonts.ready;
}

function getAlphaAt(imageData, width, x, y) {
  return imageData[(y * width + x) * 4 + 3];
}

function cellHasInk(imageData, width, height, startX, startY, step) {
  const endX = Math.min(width - 1, startX + step - 1);
  const endY = Math.min(height - 1, startY + step - 1);

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      if (getAlphaAt(imageData, width, x, y) > 20) {
        return true;
      }
    }
  }

  return false;
}

function buildOutlineDataFromSegments(wirePositions) {
  const pointMap = new Map();
  const points = [];
  const origins = [];
  const randoms = [];
  const delays = [];
  const segments = [];

  function getPointIndex(x, y, z) {
    const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;

    if (pointMap.has(key)) {
      return pointMap.get(key);
    }

    const index = points.length / 3;
    pointMap.set(key, index);
    points.push(x, y, z);
    origins.push(x + randomSigned(0.9), y + randomSigned(0.9), z + randomSigned(0.9));
    randoms.push(Math.random());
    delays.push(Math.random() * 0.2);
    return index;
  }

  for (let index = 0; index < wirePositions.length; index += 6) {
    const a = getPointIndex(wirePositions[index], wirePositions[index + 1], wirePositions[index + 2]);
    const b = getPointIndex(wirePositions[index + 3], wirePositions[index + 4], wirePositions[index + 5]);
    segments.push(a, b);
  }

  return {
    outlinePoints: new Float32Array(points),
    outlineOrigins: new Float32Array(origins),
    outlineRandoms: new Float32Array(randoms),
    outlineDelays: new Float32Array(delays),
    outlineSegments: new Uint32Array(segments)
  };
}

export async function loadFontFromFile(file) {
  const fileName = file.name.replace(/\.[^/.]+$/, "").trim() || "Uploaded Font";
  const family = `Uploaded-${Date.now()}`;
  const buffer = await file.arrayBuffer();
  const fontFace = new FontFace(family, buffer);
  await fontFace.load();
  document.fonts.add(fontFace);
  return { family, label: fileName };
}

export function buildFallbackTypographyData(text = "TEST") {
  const width = 2.8;
  const height = 1.2;
  const depth = 0.55;
  const pointPositions = [];
  const pointOrigins = [];
  const pointSizes = [];
  const pointRandoms = [];
  const pointDelays = [];
  const wirePositions = [];
  const wireOrigins = [];
  const wireRandoms = [];
  const wireDelays = [];
  const meshPositions = [];
  const meshOrigins = [];
  const meshRandoms = [];
  const meshDelays = [];
  const meshScales = [];

  for (let x = -width / 2; x <= width / 2; x += 0.1) {
    for (let y = -height / 2; y <= height / 2; y += 0.1) {
      const z = Math.sin((x + y) * 2.4) * 0.04;
      pointPositions.push(x, y, z);
      pointOrigins.push(x + randomSigned(1.1), y + randomSigned(1.1), z + randomSigned(1.1));
      pointSizes.push(1);
      pointRandoms.push(Math.random());
      pointDelays.push(Math.random() * 0.1);

      if (((pointPositions.length / 3) | 0) % 2 === 0) {
        meshPositions.push(x, y, z);
        meshOrigins.push(x + randomSigned(0.8), y + randomSigned(0.8), z + randomSigned(0.8));
        meshRandoms.push(Math.random());
        meshDelays.push(Math.random() * 0.1);
        meshScales.push(0.8 + Math.random() * 0.3);
      }
    }
  }

  const corners = [
    [-width / 2, -height / 2, depth / 2],
    [width / 2, -height / 2, depth / 2],
    [width / 2, height / 2, depth / 2],
    [-width / 2, height / 2, depth / 2],
    [-width / 2, -height / 2, -depth / 2],
    [width / 2, -height / 2, -depth / 2],
    [width / 2, height / 2, -depth / 2],
    [-width / 2, height / 2, -depth / 2]
  ];
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];

  for (const [a, b] of edges) {
    const start = corners[a];
    const end = corners[b];
    wirePositions.push(...start, ...end);
    wireOrigins.push(
      start[0] + randomSigned(0.9), start[1] + randomSigned(0.9), start[2] + randomSigned(0.9),
      end[0] + randomSigned(0.9), end[1] + randomSigned(0.9), end[2] + randomSigned(0.9)
    );
    wireRandoms.push(Math.random(), Math.random());
    wireDelays.push(Math.random() * 0.1, Math.random() * 0.1);
  }

  const outlineData = buildOutlineDataFromSegments(wirePositions);

  return {
    label: text,
    pointPositions: new Float32Array(pointPositions),
    pointOrigins: new Float32Array(pointOrigins),
    pointSizes: new Float32Array(pointSizes),
    pointRandoms: new Float32Array(pointRandoms),
    pointDelays: new Float32Array(pointDelays),
    wirePositions: new Float32Array(wirePositions),
    wireOrigins: new Float32Array(wireOrigins),
    wireRandoms: new Float32Array(wireRandoms),
    wireDelays: new Float32Array(wireDelays),
    outlinePoints: outlineData.outlinePoints,
    outlineOrigins: outlineData.outlineOrigins,
    outlineRandoms: outlineData.outlineRandoms,
    outlineDelays: outlineData.outlineDelays,
    outlineSegments: outlineData.outlineSegments,
    meshPositions: new Float32Array(meshPositions),
    meshOrigins: new Float32Array(meshOrigins),
    meshRandoms: new Float32Array(meshRandoms),
    meshDelays: new Float32Array(meshDelays),
    meshScales: new Float32Array(meshScales),
    bounds: { width, height, depth }
  };
}

export async function buildTypographyData(config) {
  const text = (config?.text || "TEST").trim() || "TEST";
  const fontFamily = config?.fontFamily || "Space Grotesk";
  const rawFontSize = Number(config?.fontSize) || 250;
  const tracking = Number(config?.tracking) || 0;
  const lineHeight = Number(config?.lineHeight) || 1;

  await ensureFontLoaded(fontFamily, rawFontSize);

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return buildFallbackTypographyData(text);
  }

  const lines = text.toUpperCase().split("\n");
  context.font = `700 ${rawFontSize}px "${fontFamily}", sans-serif`;

  const widestLine = Math.max(...lines.map((line) => measureTrackedLine(context, line, tracking)));
  const totalHeight = rawFontSize * lineHeight * lines.length;
  const fitScale = Math.min(
    1,
    (CANVAS_WIDTH * 0.82) / Math.max(widestLine, 1),
    (CANVAS_HEIGHT * 0.7) / Math.max(totalHeight, 1)
  );
  const fontSize = rawFontSize * fitScale;
  const scaledTracking = tracking * fitScale;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.font = `700 ${fontSize}px "${fontFamily}", sans-serif`;

  const lineMetrics = lines.map((line) => measureTrackedLine(context, line, scaledTracking));
  const firstLineY = canvas.height / 2 - ((lines.length - 1) * fontSize * lineHeight) / 2;

  lines.forEach((line, index) => {
    const width = lineMetrics[index];
    const startX = canvas.width / 2 - width / 2;
    const baselineY = firstLineY + index * fontSize * lineHeight;
    drawTrackedLine(context, line, startX, baselineY, scaledTracking);
  });

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const sampleStep = Math.max(6, Math.round(fontSize / 22));
  const columns = Math.ceil(canvas.width / sampleStep);
  const rows = Math.ceil(canvas.height / sampleStep);
  const filledCells = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (cellHasInk(imageData, canvas.width, canvas.height, column * sampleStep, row * sampleStep, sampleStep)) {
        filledCells.push([column, row]);
      }
    }
  }

  if (!filledCells.length) {
    return buildFallbackTypographyData(text);
  }

  let minColumn = Infinity;
  let maxColumn = -Infinity;
  let minRow = Infinity;
  let maxRow = -Infinity;

  for (const [column, row] of filledCells) {
    minColumn = Math.min(minColumn, column);
    maxColumn = Math.max(maxColumn, column);
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
  }

  const rawWidth = maxColumn - minColumn + 1;
  const rawHeight = maxRow - minRow + 1;
  const baseScale = 4.2 / Math.max(rawWidth, rawHeight, 1);
  const thickness = Math.max(0.28, Math.min(0.76, Math.max(rawWidth, rawHeight) * baseScale * 0.12));
  const depthLayers = 4;

  const pointPositions = [];
  const pointOrigins = [];
  const pointSizes = [];
  const pointRandoms = [];
  const pointDelays = [];
  const wirePositions = [];
  const wireOrigins = [];
  const wireRandoms = [];
  const wireDelays = [];
  const meshPositions = [];
  const meshOrigins = [];
  const meshRandoms = [];
  const meshDelays = [];
  const meshScales = [];

  const filledSet = new Set(filledCells.map(([column, row]) => `${column}:${row}`));
  const hasFilled = (column, row) => filledSet.has(`${column}:${row}`);
  const wireSegmentSet = new Set();

  function addWireSegment(ax, ay, az, bx, by, bz) {
    const aKey = `${ax.toFixed(4)},${ay.toFixed(4)},${az.toFixed(4)}`;
    const bKey = `${bx.toFixed(4)},${by.toFixed(4)},${bz.toFixed(4)}`;
    const key = aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;

    if (wireSegmentSet.has(key)) {
      return;
    }

    wireSegmentSet.add(key);
    wirePositions.push(ax, ay, az, bx, by, bz);
  }

  function toWorld(column, row) {
    return {
      x: (column - (minColumn + maxColumn) / 2) * baseScale,
      y: ((minRow + maxRow) / 2 - row) * baseScale
    };
  }

  function toCornerWorld(column, row) {
    return {
      x: (column - (minColumn + maxColumn + 1) / 2) * baseScale,
      y: ((minRow + maxRow + 1) / 2 - row) * baseScale
    };
  }

  for (const [column, row] of filledCells) {
    const { x, y } = toWorld(column, row);
    const frontZ = thickness * 0.5;
    const backZ = -thickness * 0.5;

    for (let layer = 0; layer < depthLayers; layer += 1) {
      const z = ((layer / (depthLayers - 1)) - 0.5) * thickness + randomSigned(0.02);
      pointPositions.push(x + randomSigned(0.02), y + randomSigned(0.02), z);
      pointOrigins.push(x + randomSigned(1.1), y + randomSigned(1.1), z + randomSigned(1.1));
      pointSizes.push(1);
      pointRandoms.push(Math.random());
      pointDelays.push(Math.random() * 0.2);

      if ((column + row + layer) % 2 === 0) {
        meshPositions.push(x, y, z);
        meshOrigins.push(x + randomSigned(0.85), y + randomSigned(0.85), z + randomSigned(0.85));
        meshRandoms.push(Math.random());
        meshDelays.push(Math.random() * 0.2);
        meshScales.push(0.8 + Math.random() * 0.3);
      }
    }

    const topLeft = toCornerWorld(column, row);
    const topRight = toCornerWorld(column + 1, row);
    const bottomLeft = toCornerWorld(column, row + 1);
    const bottomRight = toCornerWorld(column + 1, row + 1);

    if (!hasFilled(column, row - 1)) {
      addWireSegment(topLeft.x, topLeft.y, frontZ, topRight.x, topRight.y, frontZ);
      addWireSegment(topLeft.x, topLeft.y, backZ, topRight.x, topRight.y, backZ);
      addWireSegment(topLeft.x, topLeft.y, frontZ, topLeft.x, topLeft.y, backZ);
      addWireSegment(topRight.x, topRight.y, frontZ, topRight.x, topRight.y, backZ);
    }

    if (!hasFilled(column + 1, row)) {
      addWireSegment(topRight.x, topRight.y, frontZ, bottomRight.x, bottomRight.y, frontZ);
      addWireSegment(topRight.x, topRight.y, backZ, bottomRight.x, bottomRight.y, backZ);
      addWireSegment(topRight.x, topRight.y, frontZ, topRight.x, topRight.y, backZ);
      addWireSegment(bottomRight.x, bottomRight.y, frontZ, bottomRight.x, bottomRight.y, backZ);
    }

    if (!hasFilled(column, row + 1)) {
      addWireSegment(bottomLeft.x, bottomLeft.y, frontZ, bottomRight.x, bottomRight.y, frontZ);
      addWireSegment(bottomLeft.x, bottomLeft.y, backZ, bottomRight.x, bottomRight.y, backZ);
      addWireSegment(bottomLeft.x, bottomLeft.y, frontZ, bottomLeft.x, bottomLeft.y, backZ);
      addWireSegment(bottomRight.x, bottomRight.y, frontZ, bottomRight.x, bottomRight.y, backZ);
    }

    if (!hasFilled(column - 1, row)) {
      addWireSegment(topLeft.x, topLeft.y, frontZ, bottomLeft.x, bottomLeft.y, frontZ);
      addWireSegment(topLeft.x, topLeft.y, backZ, bottomLeft.x, bottomLeft.y, backZ);
      addWireSegment(topLeft.x, topLeft.y, frontZ, topLeft.x, topLeft.y, backZ);
      addWireSegment(bottomLeft.x, bottomLeft.y, frontZ, bottomLeft.x, bottomLeft.y, backZ);
    }
  }

  if (!wirePositions.length) {
    return buildFallbackTypographyData(text);
  }

  for (let index = 0; index < wirePositions.length; index += 3) {
    wireOrigins.push(
      wirePositions[index] + randomSigned(0.9),
      wirePositions[index + 1] + randomSigned(0.9),
      wirePositions[index + 2] + randomSigned(0.9)
    );
    wireRandoms.push(Math.random());
    wireDelays.push(Math.random() * 0.2);
  }

  const outlineData = buildOutlineDataFromSegments(wirePositions);

  return {
    label: text,
    pointPositions: new Float32Array(pointPositions),
    pointOrigins: new Float32Array(pointOrigins),
    pointSizes: new Float32Array(pointSizes),
    pointRandoms: new Float32Array(pointRandoms),
    pointDelays: new Float32Array(pointDelays),
    wirePositions: new Float32Array(wirePositions),
    wireOrigins: new Float32Array(wireOrigins),
    wireRandoms: new Float32Array(wireRandoms),
    wireDelays: new Float32Array(wireDelays),
    outlinePoints: outlineData.outlinePoints,
    outlineOrigins: outlineData.outlineOrigins,
    outlineRandoms: outlineData.outlineRandoms,
    outlineDelays: outlineData.outlineDelays,
    outlineSegments: outlineData.outlineSegments,
    meshPositions: new Float32Array(meshPositions),
    meshOrigins: new Float32Array(meshOrigins),
    meshRandoms: new Float32Array(meshRandoms),
    meshDelays: new Float32Array(meshDelays),
    meshScales: new Float32Array(meshScales),
    bounds: {
      width: rawWidth * baseScale,
      height: rawHeight * baseScale,
      depth: thickness
    }
  };
}
