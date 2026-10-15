import OpenAI from 'openai';

let client: OpenAI | undefined;

export function getOpenAIClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing required environment variable: OPENAI_API_KEY');
    client = new OpenAI({ apiKey });
  }
  return client;
}
