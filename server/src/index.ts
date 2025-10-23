// server/src/index.ts
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';

import { healthRouter } from './routes/health';
import { addressSuggestRouter } from './routes/addressSuggest';

// ---------- Paths / env ----------
const DATA_ROOT = process.env.DATA_ROOT || path.join(__dirname, '../data');

// ensure the data directory exists so routes depending on it won't crash
try {
  fs.mkdirSync(DATA_ROOT, { recursive: true });
  console.log('DATA_ROOT:', DATA_ROOT);
} catch (e) {
  console.error('Failed to create DATA_ROOT', DATA_ROOT, e);
}

// ---------- App ----------
const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    /\.vercel\.app$/,               // any Vercel preview
  ],
}));
app.use(express.json());

// ---------- Routes ----------
app.use('/api/health', healthRouter);
app.use('/api/address-suggest', addressSuggestRouter);

// ---------- Start ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});
