import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import generateVideoSpecByTopic from './utils/GenerateVideoSpec.mjs';

const getTopicFromArgs = () => {
  return process.argv.slice(2).join(' ').trim();
};

const promptForTopic = async () => {
  const rl = readline.createInterface({ input, output });

  try {
    const topic = (await rl.question('Введите тему для видео: ')).trim();

    if (!topic) {
      throw new Error('Тема видео не может быть пустой.');
    }

    return topic;
  } finally {
    rl.close();
  }
};

const resolveTopic = async () => {
  const topicFromArgs = getTopicFromArgs();

  if (topicFromArgs) {
    return topicFromArgs;
  }

  return promptForTopic();
};

async function generateScript() {
  try {
    const topic = await resolveTopic();

    console.log(`Генерирую видео по теме: "${topic}"`);

    await generateVideoSpecByTopic(topic);
  } catch (error) {
    console.error('Ошибка:', error.message ?? error);
    process.exitCode = 1;
  }
}

generateScript();
