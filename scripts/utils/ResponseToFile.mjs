import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import normalizeVideoModule from '../../src/domain/normalize-video.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const generatedOutputPath = path.resolve(__dirname, '../../generated/latest-video.json');
const demoOutputPath = path.resolve(__dirname, '../../src/data/input.json');
const { normalizeVideoSpec } = normalizeVideoModule;

const parseRawPayload = (input) => {
  if (typeof input === 'string') {
    const cleanJson = input.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  }

  return input;
};

async function saveAiResponseToFile(rawInput) {
  const parsedData = parseRawPayload(rawInput);
  const normalizedSpec = normalizeVideoSpec(parsedData);
  const output = JSON.stringify(normalizedSpec, null, 2);

  fs.mkdirSync(path.dirname(generatedOutputPath), { recursive: true });
  fs.writeFileSync(generatedOutputPath, output, 'utf-8');
  fs.writeFileSync(demoOutputPath, output, 'utf-8');

  console.log(`Saved normalized video spec to: ${generatedOutputPath}`);

  return normalizedSpec;
}

export default saveAiResponseToFile;
