
import { GoogleGenAI, Modality } from "@google/genai";

const getAiClient = () => {
    const key = process.env.API_KEY;
    if (!key) {
        throw new Error("API_KEY is not available in process.env. Please select an API key.");
    }
    return new GoogleGenAI({ apiKey: key });
};

export const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            reject(new Error("Failed to read file as base64 string."));
        }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
  
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const editImage = async (imageFile: File, prompt: string): Promise<string> => {
    const ai = getAiClient();
    const imagePart = await fileToGenerativePart(imageFile);
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [imagePart, textPart],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }

    throw new Error("No image data found in the API response.");
};

export const generateVideo = async (
    startImageFile: File,
    endImageFile: File,
    prompt: string,
    onProgress: (message: string) => void
): Promise<string> => {
    const ai = getAiClient();

    onProgress("Preparing images for video generation...");
    const startImageBase64 = (await fileToGenerativePart(startImageFile)).inlineData.data;
    const endImageBase64 = (await fileToGenerativePart(endImageFile)).inlineData.data;

    onProgress("Initiating video generation with Veo model...");
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
            imageBytes: startImageBase64,
            mimeType: startImageFile.type,
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            lastFrame: {
                imageBytes: endImageBase64,
                mimeType: endImageFile.type,
            },
            aspectRatio: '16:9' // Aspect ratio is often inferred but good to be explicit
        }
    });

    onProgress("Video generation in progress... This may take a few minutes.");
    let pollCount = 0;
    while (!operation.done) {
        pollCount++;
        onProgress(`Checking status (attempt ${pollCount})... Please be patient.`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    onProgress("Finalizing video...");
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
        throw new Error("Video generation completed, but no download link was found.");
    }

    return `${downloadLink}&key=${process.env.API_KEY}`;
};
