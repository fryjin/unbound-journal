import { LOGICAL_PAGE_SIZE, type Size } from '@unbound-journal/editor-core';
import type {
  PaperLayerTexture,
  PaperMaskStroke,
  PaperRuntimeAsset,
} from '@unbound-journal/paper-engine';

const DEG_TO_RAD = Math.PI / 180;

export function configureLogicalCanvas(canvas: HTMLCanvasElement, pageSize: Size = LOGICAL_PAGE_SIZE) {
  if (canvas.width !== pageSize.width) canvas.width = pageSize.width;
  if (canvas.height !== pageSize.height) canvas.height = pageSize.height;
}

export function drawPaperTexture(
  context: CanvasRenderingContext2D,
  asset: PaperRuntimeAsset,
  image: HTMLImageElement,
  pageSize: Size = LOGICAL_PAGE_SIZE,
  textureOverride?: PaperLayerTexture,
) {
  const { renderMode } = asset.manifest;
  const texture: PaperLayerTexture = textureOverride ?? {
    scale: asset.manifest.texture.defaultScale,
    rotation: asset.manifest.texture.rotation,
    offsetX: asset.manifest.texture.offsetX,
    offsetY: asset.manifest.texture.offsetY,
  };
  context.save();
  context.clearRect(0, 0, pageSize.width, pageSize.height);

  if (renderMode === 'tile') {
    drawPatternTexture(context, image, pageSize, texture);
  } else {
    drawFullSheetTexture(context, image, pageSize, texture);
  }

  context.restore();
}

function drawPatternTexture(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  pageSize: Size,
  texture: PaperLayerTexture,
) {
  const scale = Math.max(0.01, texture.scale);
  const tileWidth = Math.max(1, (image.naturalWidth || image.width) * scale);
  const tileHeight = Math.max(1, (image.naturalHeight || image.height) * scale);
  const diagonal = Math.hypot(pageSize.width, pageSize.height);
  const coverage = diagonal / scale + Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height) * 2;

  context.translate(texture.offsetX, texture.offsetY);
  context.rotate(texture.rotation * DEG_TO_RAD);
  context.scale(scale, scale);

  const nativeTileWidth = Math.max(1, image.naturalWidth || image.width);
  const nativeTileHeight = Math.max(1, image.naturalHeight || image.height);
  const logicalCoverage = coverage;
  const startX = Math.floor((-logicalCoverage - texture.offsetX / scale) / nativeTileWidth) * nativeTileWidth;
  const startY = Math.floor((-logicalCoverage - texture.offsetY / scale) / nativeTileHeight) * nativeTileHeight;
  const endX = logicalCoverage + pageSize.width / scale + tileWidth;
  const endY = logicalCoverage + pageSize.height / scale + tileHeight;

  for (let y = startY; y <= endY; y += nativeTileHeight) {
    for (let x = startX; x <= endX; x += nativeTileWidth) {
      context.drawImage(image, x, y, nativeTileWidth, nativeTileHeight);
    }
  }
}

function drawFullSheetTexture(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  pageSize: Size,
  texture: PaperLayerTexture,
) {
  const naturalWidth = Math.max(1, image.naturalWidth || image.width);
  const naturalHeight = Math.max(1, image.naturalHeight || image.height);
  const coverScale = Math.max(pageSize.width / naturalWidth, pageSize.height / naturalHeight);
  const renderedWidth = naturalWidth * coverScale;
  const renderedHeight = naturalHeight * coverScale;
  const textureScale = Math.max(0.01, texture.scale);

  context.translate(pageSize.width / 2 + texture.offsetX, pageSize.height / 2 + texture.offsetY);
  context.rotate(texture.rotation * DEG_TO_RAD);
  context.scale(textureScale, textureScale);
  context.drawImage(
    image,
    -renderedWidth / 2,
    -renderedHeight / 2,
    renderedWidth,
    renderedHeight,
  );
}

export function drawPaperMask(
  context: CanvasRenderingContext2D,
  strokes: readonly PaperMaskStroke[],
  pageSize: Size = LOGICAL_PAGE_SIZE,
) {
  context.clearRect(0, 0, pageSize.width, pageSize.height);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const stroke of strokes) {
    const points = stroke.points;
    if (points.length === 0) continue;

    context.save();
    context.globalCompositeOperation = stroke.operation === 'erase' ? 'destination-out' : 'source-over';
    context.strokeStyle = '#fff';
    context.fillStyle = '#fff';
    context.lineWidth = Math.max(1, stroke.size);

    if (points.length === 1) {
      context.beginPath();
      context.arc(points[0].x, points[0].y, Math.max(0.5, stroke.size / 2), 0, Math.PI * 2);
      context.fill();
    } else {
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y);
      }
      context.stroke();
    }

    context.restore();
  }
}

export function renderMaskedPaperToCanvas(
  outputCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
  asset: PaperRuntimeAsset,
  image: HTMLImageElement,
  strokes: readonly PaperMaskStroke[],
  pageSize: Size = LOGICAL_PAGE_SIZE,
  textureOverride?: PaperLayerTexture,
) {
  configureLogicalCanvas(outputCanvas, pageSize);
  configureLogicalCanvas(maskCanvas, pageSize);

  const output = outputCanvas.getContext('2d');
  const mask = maskCanvas.getContext('2d');
  if (!output || !mask) return;

  drawPaperMask(mask, strokes, pageSize);
  drawPaperTexture(output, asset, image, pageSize, textureOverride);
  output.save();
  output.globalCompositeOperation = 'destination-in';
  output.drawImage(maskCanvas, 0, 0, pageSize.width, pageSize.height);
  output.restore();
}

export function renderTextureSourceCanvas(
  canvas: HTMLCanvasElement,
  asset: PaperRuntimeAsset,
  image: HTMLImageElement,
  pageSize: Size = LOGICAL_PAGE_SIZE,
) {
  configureLogicalCanvas(canvas, pageSize);
  const context = canvas.getContext('2d');
  if (!context) return;
  drawPaperTexture(context, asset, image, pageSize);
}
