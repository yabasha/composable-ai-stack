import { Worker, type Job } from "bullmq";
import { getRedisConnection, AI_JOB_QUEUE } from "../queues/index.js";

// ── Job payload types ───────────────────────────────────────────

export interface AiJobData {
  /** The prompt to send to the AI model. */
  prompt: string;
  /** Optional model identifier (defaults to a sensible model at runtime). */
  model?: string;
  /** Arbitrary metadata forwarded to tracing / logging. */
  meta?: Record<string, unknown>;
}

export interface AiJobResult {
  text: string;
  model: string;
  durationMs: number;
}

// ── Processor ───────────────────────────────────────────────────

/**
 * Process an AI generation job.
 *
 * Currently a standalone stub that simulates the AI call.
 * Once `packages/ai` is merged (PRs #5-#7) replace the body
 * with a real call, e.g.:
 *
 *   import { generateText } from "@acme/ai";
 *   const result = await generateText({ prompt: data.prompt, model: data.model });
 */
async function processAiJob(job: Job<AiJobData, AiJobResult>): Promise<AiJobResult> {
  const start = Date.now();
  const { prompt, model = "gpt-4o-mini" } = job.data;

  job.log(`Starting AI generation — model=${model}`);

  // ── Stub: replace with real AI SDK call once packages/ai lands ──
  // Simulate latency so we can observe the worker in action.
  await new Promise((r) => setTimeout(r, 500));
  const text = `[stub] AI response for: "${prompt.slice(0, 80)}"`;
  // ── End stub ────────────────────────────────────────────────────

  const durationMs = Date.now() - start;
  job.log(`Completed in ${durationMs}ms`);

  return { text, model, durationMs };
}

// ── Worker instance ─────────────────────────────────────────────

export const aiJobWorker = new Worker<AiJobData, AiJobResult>(
  AI_JOB_QUEUE,
  processAiJob,
  {
    connection: getRedisConnection(),
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 60_000, // max 10 jobs per minute (respect API rate limits)
    },
  },
);

// Lifecycle events
aiJobWorker.on("completed", (job) => {
  console.log(`✅ [ai-job] ${job.id} completed`);
});

aiJobWorker.on("failed", (job, err) => {
  console.error(`❌ [ai-job] ${job?.id} failed:`, err.message);
});

aiJobWorker.on("error", (err) => {
  console.error("🔴 [ai-job] worker error:", err);
});
