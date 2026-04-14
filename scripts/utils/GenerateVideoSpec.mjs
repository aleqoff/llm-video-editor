import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import buildPrompt from './BuildPrompt.mjs';
import saveAiResponseToFile from './ResponseToFile.mjs';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('API key GEMINI_API_KEY was not found in .env');
}

const genAI = new GoogleGenerativeAI(apiKey);

const createImagePart = (asset) => {
  return {
    inlineData: {
      mimeType: asset.mimeType,
      data: asset.base64Data,
    },
  };
};

const createAssetSummary = (asset) => {
  return {
    id: asset.id,
    type: 'image',
    src: asset.src,
    alt: asset.alt,
  };
};

export const generateVideoSpecByTopic = async (topic, assets = []) => {
  const normalizedTopic = topic.trim();

  if (!normalizedTopic) {
    throw new Error('Video topic cannot be empty.');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = buildPrompt({
    topic: normalizedTopic,
    assets: assets.map(createAssetSummary),
  });

  const parts = [
    ...assets.map(createImagePart),
    {
      text: prompt,
    },
  ];

  const result = await model.generateContent(parts);
  const rawResponseText = result.response.text();

  console.log('\nRaw Gemini response:\n');
  console.log(rawResponseText);
  console.log('\nEnd of raw Gemini response.\n');

  const rawPayload = JSON.parse(rawResponseText);
  rawPayload.assets = assets.map(createAssetSummary);

  console.log(
    `Generated JSON for topic "${normalizedTopic}" with ${assets.length} image asset(s).`,
  );

  return saveAiResponseToFile(rawPayload);
};

export default generateVideoSpecByTopic;
