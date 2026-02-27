import { tracedGenerate, openai, DEFAULT_MODELS } from '@acme/ai';

const model = openai(DEFAULT_MODELS.openai);

async function runEvalFlow() {
  const { text, traceId } = await tracedGenerate(
    model,
    'Summarize the purpose of the Composable AI Stack in one sentence.',
    { name: 'eval-runner-demo', maxTokens: 256 },
  );
  console.log('[eval runner] Output:', text);
  console.log('[eval runner] Langfuse trace ID:', traceId);
}

runEvalFlow().catch(console.error);
