import OpenAI from 'openai';
import { requireEnvironmentValue } from '@/lib/environment';

let client: OpenAI | undefined;

export function getOpenAIClient() {
  if (!client) {
    const apiKey = requireEnvironmentValue('OPENAI_API_KEY', process.env.OPENAI_API_KEY);
    client = new OpenAI({ apiKey });
  }
  return client;
}
