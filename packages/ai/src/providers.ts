import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

export const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
} as const;
