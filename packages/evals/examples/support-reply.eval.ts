import type { EvalDefinition } from '../src/types';
import { scoreContains, scoreLengthRatio } from '../src/scorers';

const supportReplyPrompt = (input: string) => `SYSTEM:
You are a helpful support agent. Be concise, friendly, and accurate.

USER MESSAGE:
${input}

TASK:
Draft a helpful reply.`;

export const supportReplyEval: EvalDefinition = {
  name: 'support-reply',
  cases: [
    {
      id: 'simple-greeting',
      input: 'Hi there, I just wanted to say hello!',
      expectedOutput: 'Hello',
    },
    {
      id: 'thank-you-response',
      input: 'Thanks for your help with my issue.',
      expectedOutput: 'you\'re welcome',
    },
    {
      id: 'question-about-product',
      input: 'How do I reset my password?',
      expectedOutput: 'password',
    },
  ],
  prompt: supportReplyPrompt,
  scorers: [scoreContains, scoreLengthRatio],
};
