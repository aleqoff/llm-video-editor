import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import normalizeVideoModule from '../../src/domain/normalize-video.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const generatedOutputPath = path.resolve(__dirname, '../../generated/latest-video.json');
const demoOutputPath = path.resolve(__dirname, '../../src/data/input.json');
const { normalizeVideoSpec } = normalizeVideoModule;

async function saveAiResponseToFile(rawText) {
  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsedData = JSON.parse(cleanJson);
  const normalizedSpec = normalizeVideoSpec(parsedData);
  const output = JSON.stringify(normalizedSpec, null, 2);

  fs.mkdirSync(path.dirname(generatedOutputPath), { recursive: true });
  fs.writeFileSync(generatedOutputPath, output, 'utf-8');
  fs.writeFileSync(demoOutputPath, output, 'utf-8');

  console.log(`Saved normalized video spec to: ${generatedOutputPath}`);

  return normalizedSpec;
}

export default saveAiResponseToFile;
