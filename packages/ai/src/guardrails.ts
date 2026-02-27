import { z } from 'zod';
import { langfuse } from './tracing';
import type { LanguageModelV1 } from 'ai';
import { generateObject } from 'ai';

export interface GuardrailOptions<TInput, TOutput> {
  name: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  maxTokens?: number;
  moderationHook?: (input: TInput) => Promise<boolean>; // true = safe
}

export async function runWithGuardrails<TInput, TOutput>(
  model: LanguageModelV1,
  prompt: string,
  input: TInput,
  options: GuardrailOptions<TInput, TOutput>,
): Promise<{ output: TOutput; traceId: string }> {
  const validatedInput = options.inputSchema.parse(input);
  if (options.moderationHook) {
    const safe = await options.moderationHook(validatedInput);
    if (!safe) throw new Error(`[guardrail] Input failed moderation for: ${options.name}`);
  }
  const trace = langfuse.trace({ name: options.name, input: validatedInput });
  const generation = trace.generation({ name: 'llm-call', model: String(model), input: prompt });
  try {
    const { object } = await generateObject({ model, schema: options.outputSchema, prompt, maxTokens: options.maxTokens ?? 2048 });
    const validatedOutput = options.outputSchema.parse(object);
    generation.end({ output: validatedOutput, level: 'DEFAULT' });
    trace.update({ output: validatedOutput });
    await langfuse.flushAsync();
    return { output: validatedOutput, traceId: trace.id };
  } catch (err) {
    generation.end({ level: 'ERROR', statusMessage: String(err) });
    await langfuse.flushAsync();
    throw err;
  }
}
