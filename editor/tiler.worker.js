let cancelToken = null;

self.onmessage = async (event) => {
  const message = event.data;
  if (message.type === 'cancel') {
    if (cancelToken && cancelToken.requestId === message.requestId) {
      cancelToken.cancelled = true;
    }
    return;
  }

  if (message.type === 'pause') {
    if (cancelToken && cancelToken.requestId === message.requestId) {
      cancelToken.paused = true;
    }
    return;
  }

  if (message.type === 'resume') {
    if (cancelToken && cancelToken.requestId === message.requestId) {
      cancelToken.paused = false;
    }
    return;
  }

  if (message.type !== 'start') return;

  const { requestId, sceneId, dataUrl, faceSize, tileSize } = message;

  try {
    if (!self.OffscreenCanvas || !self.createImageBitmap) {
      self.postMessage({ type: 'error', requestId, reason: 'OffscreenCanvas not available' });
      return;
    }

    const sourceData = await decodeImageData(dataUrl);
    cancelToken = { requestId, cancelled: false, paused: false };
    const tiles = await buildCubemapTiles(
      sceneId,
      sourceData,
      faceSize,
      tileSize,
      cancelToken,
      (progress) => self.postMessage({ type: 'progress', requestId, value: progress })
    );

    self.postMessage({ type: 'result', requestId, tiles });
  } catch (error) {
    if (cancelToken?.cancelled) {
      self.postMessage({ type: 'cancelled', requestId });
    } else {
      self.postMessage({ type: 'error', requestId, reason: error?.message || 'unknown' });
    }
  }
};

async function decodeImageData(dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
  return {
    data: imageData.data,
    width: imageBitmap.width,
    height: imageBitmap.height,
    imageData
  };
}

async function buildCubemapTiles(sceneId, source, faceSize, tileSize, cancelToken, onProgress) {
  const faces = ['f', 'b', 'l', 'r', 'u', 'd'];
  const tiles = {};

  const totalSteps = faces.length * faceSize;
  let completed = 0;

  const faceCanvases = await Promise.all(
    faces.map((face) =>
      renderFace(source, face, faceSize, cancelToken, async () => {
        completed += 1;
        const progress = (completed / totalSteps) * 90;
        onProgress(progress);
        await throttle(cancelToken);
      })
    )
  );

  const sourceCanvas = new OffscreenCanvas(source.width, source.height);
  const sctx = sourceCanvas.getContext('2d');
  sctx.putImageData(source.imageData, 0, 0);
  const preview = new OffscreenCanvas(512, 256);
  const pctx = preview.getContext('2d');
  pctx.drawImage(sourceCanvas, 0, 0, 512, 256);
  tiles[`${sceneTilePath(sceneId)}/preview.jpg`] = await canvasToDataUrl(preview, 0.8);

  const tilesPerSide = Math.ceil(faceSize / tileSize);
  let tileIndex = 0;
  const tileTotal = faces.length * tilesPerSide * tilesPerSide;

  for (let faceIndex = 0; faceIndex < faces.length; faceIndex += 1) {
    const faceCanvas = faceCanvases[faceIndex];
    for (let y = 0; y < tilesPerSide; y += 1) {
      for (let x = 0; x < tilesPerSide; x += 1) {
        if (cancelToken.cancelled) {
          throw new Error('cancelled');
        }
        if (cancelToken.paused) {
          await waitForResume(cancelToken);
        }
        const tile = new OffscreenCanvas(tileSize, tileSize);
        const tctx = tile.getContext('2d');
        tctx.drawImage(
          faceCanvas,
          x * tileSize,
          y * tileSize,
          tileSize,
          tileSize,
          0,
          0,
          tileSize,
          tileSize
        );
        const path = `${sceneTilePath(sceneId)}/0/${faces[faceIndex]}/${y}/${x}.jpg`;
        tiles[path] = await canvasToDataUrl(tile, 0.85);
        tileIndex += 1;
        onProgress(90 + (tileIndex / tileTotal) * 10);
        await throttle(cancelToken);
      }
    }
  }

  return tiles;
}

async function renderFace(source, face, size, cancelToken, onRow) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y += 1) {
    if (cancelToken.cancelled) {
      throw new Error('cancelled');
    }
    if (cancelToken.paused) {
      await waitForResume(cancelToken);
    }
    for (let x = 0; x < size; x += 1) {
      const u = (2 * (x + 0.5) / size) - 1;
      const v = (2 * (y + 0.5) / size) - 1;
      const dir = faceDirection(face, u, v);
      const theta = Math.atan2(dir.z, dir.x);
      const phi = Math.acos(dir.y);

      const uf = (theta + Math.PI) / (2 * Math.PI);
      const vf = phi / Math.PI;

      const ix = Math.floor(uf * (source.width - 1));
      const iy = Math.floor(vf * (source.height - 1));

      const pixel = samplePixel(source, ix, iy);
      const idx = (y * size + x) * 4;
      data[idx] = pixel[0];
      data[idx + 1] = pixel[1];
      data[idx + 2] = pixel[2];
      data[idx + 3] = 255;
    }
    await onRow();
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function faceDirection(face, u, v) {
  switch (face) {
    case 'f': return normalize({ x: 1, y: -v, z: -u });
    case 'b': return normalize({ x: -1, y: -v, z: u });
    case 'l': return normalize({ x: u, y: -v, z: 1 });
    case 'r': return normalize({ x: -u, y: -v, z: -1 });
    case 'u': return normalize({ x: u, y: 1, z: v });
    case 'd': return normalize({ x: u, y: -1, z: -v });
    default: return normalize({ x: 1, y: -v, z: -u });
  }
}

function normalize(vec) {
  const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
  return {
    x: vec.x / length,
    y: vec.y / length,
    z: vec.z / length
  };
}

function samplePixel(source, x, y) {
  const idx = (y * source.width + x) * 4;
  return [
    source.data[idx],
    source.data[idx + 1],
    source.data[idx + 2]
  ];
}

function sceneTilePath(sceneId) {
  return `tiles/${sceneId}`;
}

async function canvasToDataUrl(canvas, quality) {
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  return await blobToDataUrl(blob);
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function waitForResume(cancelToken) {
  while (cancelToken.paused && !cancelToken.cancelled) {
    await sleep(50);
  }
  if (cancelToken.cancelled) {
    throw new Error('cancelled');
  }
}

async function throttle(cancelToken) {
  if (cancelToken.paused) {
    await waitForResume(cancelToken);
  }
  await sleep(0);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
