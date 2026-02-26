import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envCandidates = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server/.env'),
];

const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
dotenv.config(envPath ? { path: envPath } : undefined);

const PORT = Number(process.env.PORT) || 9000;

async function bootstrap() {
  const { createApp } = await import('./src/app');
  const app = await createApp();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

void bootstrap();
