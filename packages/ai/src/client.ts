import { generateText, streamText } from 'ai';
import { langfuse } from './tracing';
import type { LanguageModelV1 } from 'ai';

export async function tracedGenerate(
  model: LanguageModelV1,
  prompt: string,
  options?: { name?: string; maxTokens?: number },
): Promise<{ text: string; traceId: string }> {
  const trace = langfuse.trace({ name: options?.name ?? 'generate' });
  const generation = trace.generation({ name: 'llm-call', model: String(model), input: prompt });
  try {
    const { text } = await generateText({ model, prompt, maxTokens: options?.maxTokens ?? 1024 });
    generation.end({ output: text });
    trace.update({ output: text });
    await langfuse.flushAsync();
    return { text, traceId: trace.id };
  } catch (err) {
    generation.end({ level: 'ERROR', statusMessage: String(err) });
    trace.update({ output: null, metadata: { error: String(err) } });
    await langfuse.flushAsync();
    throw err;
  }
}

export { streamText };
