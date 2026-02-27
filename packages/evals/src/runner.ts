import { tracedGenerate } from '@acme/ai';
import { langfuse } from '@acme/ai';
import type { LanguageModelV1 } from 'ai';
import type { EvalDefinition, EvalResult } from './types';

export async function runEval(
  model: LanguageModelV1,
  definition: EvalDefinition,
): Promise<EvalResult[]> {
  const results: EvalResult[] = [];

  for (const testCase of definition.cases) {
    const startTime = Date.now();

    try {
      const { text, traceId } = await tracedGenerate(
        model,
        definition.prompt(testCase.input),
        { name: `eval-${definition.name}-${testCase.id}`, maxTokens: 1024 },
      );

      const durationMs = Date.now() - startTime;

      // Score the output
      const scores = definition.scorers.map((scorer) =>
        scorer(text, testCase.expectedOutput),
      );

      // Log scores to Langfuse
      for (const score of scores) {
        langfuse.score({
          traceId,
          name: `${definition.name}-${score.name}`,
          value: score.value,
          comment: score.comment,
        });
      }

      results.push({
        caseId: testCase.id,
        output: text,
        scores,
        traceId,
        durationMs,
      });

      console.log(`✓ Case ${testCase.id}: ${scores.map((s) => `${s.name}=${s.value}`).join(', ')}`);
    } catch (err) {
      const durationMs = Date.now() - startTime;
      console.error(`✗ Case ${testCase.id}:`, err);

      // Create a Langfuse trace for the failed case so it appears in the dashboard
      const failTrace = langfuse.trace({
        name: `eval-${definition.name}-${testCase.id}`,
        input: testCase.input,
        metadata: { error: String(err), evalCase: testCase.id },
      });
      failTrace.update({ output: null, level: 'ERROR', statusMessage: String(err) });

      // Log explicit failure score to Langfuse
      langfuse.score({
        traceId: failTrace.id,
        name: `${definition.name}-error`,
        value: 0,
        comment: String(err),
      });

      results.push({
        caseId: testCase.id,
        output: '',
        scores: [{ name: 'error', value: 0, comment: String(err) }],
        traceId: failTrace.id,
        durationMs,
      });
    }
  }

  // Flush all scores to Langfuse
  await langfuse.flushAsync();

  return results;
}

export function summarizeResults(results: EvalResult[]): void {
  const totalCases = results.length;
  const passedCases = results.filter((r) =>
    r.scores.every((s) => s.value >= 0.5),
  ).length;

  console.log(`\n📊 Summary: ${passedCases}/${totalCases} cases passed`);

  const avgDuration =
    results.reduce((sum, r) => sum + r.durationMs, 0) / totalCases;
  console.log(`⏱️  Average duration: ${avgDuration.toFixed(0)}ms`);
}
