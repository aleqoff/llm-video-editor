import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('API key GEMINI_API_KEY was not found in .env');
}

const ai = new GoogleGenAI({ apiKey });

const getImageUrlFromArgs = () => {
  return process.argv.slice(2).join(' ').trim();
};

const promptForImageUrl = async () => {
  const rl = readline.createInterface({ input, output });

  try {
    const imageUrl = (await rl.question('Enter image URL: ')).trim();

    if (!imageUrl) {
      throw new Error('Image URL cannot be empty.');
    }

    return imageUrl;
  } finally {
    rl.close();
  }
};

const resolveImageUrl = async () => {
  const imageUrlFromArgs = getImageUrlFromArgs();

  if (imageUrlFromArgs) {
    return imageUrlFromArgs;
  }

  return promptForImageUrl();
};

const assertHttpUrl = (value) => {
  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error('Invalid URL. Expected a full http/https image URL.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only http/https image URLs are supported.');
  }

  return parsedUrl.toString();
};

const bufferToBase64 = (arrayBuffer) => {
  return Buffer.from(arrayBuffer).toString('base64');
};

const detectMimeType = (contentType, imageUrl) => {
  const normalizedContentType = contentType?.split(';')[0]?.trim().toLowerCase();

  if (normalizedContentType?.startsWith('image/')) {
    return normalizedContentType;
  }

  const lowerUrl = imageUrl.toLowerCase();

  if (lowerUrl.endsWith('.png')) {
    return 'image/png';
  }

  if (lowerUrl.endsWith('.webp')) {
    return 'image/webp';
  }

  if (lowerUrl.endsWith('.gif')) {
    return 'image/gif';
  }

  return 'image/jpeg';
};

const downloadImage = async (imageUrl) => {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const mimeType = detectMimeType(response.headers.get('content-type'), imageUrl);

  if (!mimeType.startsWith('image/')) {
    throw new Error(`URL did not return an image. Received content-type: ${mimeType}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  return {
    mimeType,
    data: bufferToBase64(arrayBuffer),
  };
};

const describeImageByUrl = async (imageUrl) => {
  const { mimeType, data } = await downloadImage(imageUrl);

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data } },
          {
            text: [
              'Describe this image in Russian.',
              'Return a concise but informative description.',
              'Mention the main subjects, setting, visible actions, mood, and notable objects.',
            ].join(' '),
          },
        ],
      },
    ],
  });

  return result.text.trim();
};

async function run() {
  try {
    const imageUrl = assertHttpUrl(await resolveImageUrl());

    console.log(`Analyzing image: ${imageUrl}`);

    const description = await describeImageByUrl(imageUrl);

    console.log('\nImage description:\n');
    console.log(description);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

run();
