// OpenAI standard pricing checked 15 October 2026.
// https://developers.openai.com/api/docs/pricing
const LUNA_INPUT_PER_MILLION_USD = 0.20;
const LUNA_OUTPUT_PER_MILLION_USD = 1.00;
const WEB_SEARCH_ACTION_USD = 0.01;

export function estimateLunaTokenCost(inputTokens: number, outputTokens: number) {
  return (inputTokens * LUNA_INPUT_PER_MILLION_USD + outputTokens * LUNA_OUTPUT_PER_MILLION_USD) / 1_000_000;
}

export function estimateWebSearchCost(searchActions: number) {
  return searchActions * WEB_SEARCH_ACTION_USD;
}
