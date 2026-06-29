const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 256;
const JPEG_QUALITY = 0.85;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read image file."));
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function resizeDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(
        MAX_DIMENSION / image.width,
        MAX_DIMENSION / image.height,
        1
      );
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Failed to process image."));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    image.onerror = () => reject(new Error("Invalid image file."));
    image.src = dataUrl;
  });
}

export async function readProfileImageFile(file: File): Promise<string> {
  if (
    !ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])
  ) {
    throw new Error("Use a JPG, PNG, or WebP image.");
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Image must be under 5 MB.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  return resizeDataUrl(dataUrl);
}

export const PROFILE_IMAGE_ACCEPT = ACCEPTED_TYPES.join(",");
