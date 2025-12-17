import { MattingSettings } from "../types";

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

/**
 * Removes background using a threshold-based algorithm.
 * Excellent for calligraphy (Luminance mode) or simple illustrations.
 */
export const removeBackground = async (
  imageSrc: string,
  settings: MattingSettings
): Promise<string> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not get canvas context");

  canvas.width = img.width;
  canvas.height = img.height;

  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const { threshold, smoothing, mode } = settings;

  // Threshold logic
  // 0 to 255. High threshold means more background is removed (considers more pixels "white")
  const cutoff = threshold; 
  const fade = smoothing; 

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    let brightness = 0;

    if (mode === 'luminance') {
      // Perceived brightness for white background removal
      brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    } else {
      // Color mode: simplistic approach assuming white background
      // Find how close to white it is (255,255,255)
      const dist = Math.sqrt((255-r)**2 + (255-g)**2 + (255-b)**2);
      // Map distance to a "brightness" equivalent where white is high
      brightness = Math.max(0, 255 - dist);
    }

    // Alpha calculation
    // If brightness > cutoff, it is background (alpha 0)
    // If brightness < cutoff - fade, it is foreground (alpha 255)
    // In between is smooth transition
    
    if (brightness > cutoff) {
      data[i + 3] = 0; // Transparent
    } else if (brightness > cutoff - fade) {
      // Smooth edge
      const alpha = 255 * (1 - (brightness - (cutoff - fade)) / fade);
      data[i + 3] = alpha;
    } else {
      // Keep opacity, but maybe enhance darkness for ink
       data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
};
