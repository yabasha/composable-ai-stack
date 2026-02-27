import { openai, DEFAULT_MODELS } from '@acme/ai';
import { runEval, summarizeResults } from './runner';
import { supportReplyEval } from '../examples/support-reply.eval';

const model = openai(DEFAULT_MODELS.openai);

async function main() {
  console.log(`🚀 Running eval: ${supportReplyEval.name}\n`);

  const results = await runEval(model, supportReplyEval);

  summarizeResults(results);
}

main().catch((err) => {
  console.error('[evals] Fatal error:', err);
  process.exit(1);
});
