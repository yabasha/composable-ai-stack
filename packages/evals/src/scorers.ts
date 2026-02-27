import type { EvalScore } from './types';

export function scoreExact(output: string, expected?: string): EvalScore {
  if (!expected) {
    return { name: 'exact', value: 0, comment: 'No expected output provided' };
  }
  const value = output.trim() === expected.trim() ? 1 : 0;
  return {
    name: 'exact',
    value,
    comment: value === 1 ? 'Exact match' : 'Output does not match expected',
  };
}

export function scoreContains(output: string, expected?: string): EvalScore {
  if (!expected) {
    return { name: 'contains', value: 0, comment: 'No expected output provided' };
  }
  const value = output.toLowerCase().includes(expected.toLowerCase()) ? 1 : 0;
  return {
    name: 'contains',
    value,
    comment: value === 1 ? 'Output contains expected text' : 'Output missing expected text',
  };
}

export function scoreLengthRatio(output: string, expected?: string): EvalScore {
  if (!expected) {
    return { name: 'length_ratio', value: 0, comment: 'No expected output provided' };
  }
  const ratio = expected.length > 0 ? output.length / expected.length : 0;
  // Score is 1 when ratio is close to 1, decreasing as it deviates
  const value = Math.max(0, 1 - Math.abs(1 - ratio));
  return {
    name: 'length_ratio',
    value,
    comment: `Output length is ${(ratio * 100).toFixed(0)}% of expected`,
  };
}
