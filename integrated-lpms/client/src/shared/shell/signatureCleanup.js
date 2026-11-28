const INK = [17, 24, 39];

export const removeBackground = (rgba, width, height, strength = 50) => {
  const cut = 120 + Math.round(strength * 1.2);
  const soft = 40;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const light = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
      const ink = light >= cut ? 0 : light <= cut - soft ? 1 : (cut - light) / soft;
      const alpha = Math.round(ink * (rgba[i + 3] / 255) * 255);
      rgba[i] = INK[0];
      rgba[i + 1] = INK[1];
      rgba[i + 2] = INK[2];
      rgba[i + 3] = alpha;
      if (alpha > 24) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  return right < 0 ? null : { left, top, right, bottom };
};

export const padBox = (box, width, height, pad = 8) => ({
  left: Math.max(0, box.left - pad),
  top: Math.max(0, box.top - pad),
  right: Math.min(width - 1, box.right + pad),
  bottom: Math.min(height - 1, box.bottom + pad),
});

export const cleanSignatureFile = async (file, strength = 50, maxSide = 1400) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, width, height);
  const image = context.getImageData(0, 0, width, height);
  const box = removeBackground(image.data, width, height, strength);
  if (!box) return null;
  context.putImageData(image, 0, 0);
  const crop = padBox(box, width, height);
  const out = document.createElement('canvas');
  out.width = crop.right - crop.left + 1;
  out.height = crop.bottom - crop.top + 1;
  out
    .getContext('2d')
    .drawImage(canvas, crop.left, crop.top, out.width, out.height, 0, 0, out.width, out.height);
  return new Promise((resolve) => out.toBlob(resolve, 'image/png'));
};
