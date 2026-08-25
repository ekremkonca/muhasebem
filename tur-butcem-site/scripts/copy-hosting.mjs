import fs from 'node:fs/promises';

try {
  await fs.mkdir('dist/.openai', { recursive: true });
  await fs.copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
