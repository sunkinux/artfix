import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API 密钥缺失。");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Uses Gemini to restore the image: fix perspective, lighting, wrinkles.
 * It asks Gemini to output a clean version on a white background.
 */
export const restoreArtwork = async (base64Image: string): Promise<string> => {
  const ai = getGeminiClient();
  const model = 'gemini-3-pro-image-preview'; // Using high-quality image model

  // Remove data URL prefix if present for the API call
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  // Note: Keeping prompt in English as it often yields better adherence to technical instructions for image generation models.
  const prompt = `
    You are an expert art conservator. 
    I will provide a photograph of a flat physical artwork (like calligraphy, ink painting, or watercolor).
    
    Please perform the following restoration tasks strictly:
    1. **Perspective Correction**: Make the artwork perfectly rectangular and flat, as if scanned. Crop out any background table or wall.
    2. **Lighting Correction**: Remove uneven lighting, shadows, camera flash glare, and gradients. The background paper should be uniform.
    3. **Physical Repair**: Digitally iron out any wrinkles, creases, or folds in the paper.
    4. **Output**: Return ONLY the restored artwork on a clean, high-contrast white background. Do not alter the artistic strokes, signature, or ink details. Preserve the original resolution as much as possible.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            text: prompt
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          }
        ]
      },
      config: {
        // We use the image preview model's default configs, focusing on high fidelity
        temperature: 0.4, // Lower temperature for more faithful restoration
      }
    });

    // Extract the image from the response
    // Check multiple parts for the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("生成内容为空");

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("响应中未找到图片数据");

  } catch (error) {
    console.error("Gemini Restoration Failed:", error);
    throw error;
  }
};