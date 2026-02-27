export interface EvalCase {
  id: string;
  input: string;
  expectedOutput?: string;
  metadata?: Record<string, unknown>;
}

export interface EvalScore {
  name: string;
  value: number;
  comment?: string;
}

export interface EvalResult {
  caseId: string;
  output: string;
  scores: EvalScore[];
  traceId: string;
  durationMs: number;
}

export interface EvalDefinition {
  name: string;
  cases: EvalCase[];
  prompt: (input: string) => string;
  scorers: Array<(output: string, expected?: string) => EvalScore>;
}
