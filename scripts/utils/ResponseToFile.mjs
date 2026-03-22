import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Определение путей (чтобы скрипт всегда находил нужную папку)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Указываем путь к файлу input.json относительно текущего скрипта
const outputPath = path.resolve(__dirname, '../../src/data/input.json'); 

async function saveAiResponseToFile(rawText) {
  try {
    // 1. Очистка от "мусора" (иногда ИИ оборачивает JSON в кавычки ```json ... ```)
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    // 2. Валидация: проверяем, что это действительно валидный JSON
    const parsedData = JSON.parse(cleanJson);

    // 3. Запись в файл с красивыми отступами (для читаемости)
    fs.writeFileSync(outputPath, JSON.stringify(parsedData, null, 2), 'utf-8');

    console.log(`✅ Данные успешно записаны в: ${outputPath}`);
  } catch (error) {
    console.error("❌ Ошибка при обработке или записи JSON:", error.message);
    // В дипломе это можно описать как "слой обработки исключений при десериализации"
  }
}

export default saveAiResponseToFile;