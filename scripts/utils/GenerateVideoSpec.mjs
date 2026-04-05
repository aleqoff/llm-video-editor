import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import buildPrompt from './BuildPrompt.mjs';
import saveAiResponseToFile from './ResponseToFile.mjs';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('API ключ не найден в файле .env');
}

const genAI = new GoogleGenerativeAI(apiKey);

export const generateVideoSpecByTopic = async (topic) => {
  const normalizedTopic = topic.trim();

  if (!normalizedTopic) {
    throw new Error('Тема видео не может быть пустой.');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = buildPrompt(normalizedTopic);
  const result = await model.generateContent(prompt);

  console.log(`Успешно получил JSON от модели для темы: "${normalizedTopic}"`);

  return saveAiResponseToFile(result.response.text());
};

export default generateVideoSpecByTopic;
