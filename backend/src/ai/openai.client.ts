import OpenAI from 'openai';
import { env } from '../config/env.js';

export const openAiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});
