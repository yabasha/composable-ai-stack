import { Queue, type ConnectionOptions } from "bullmq";

/**
 * Parse REDIS_URL into IORedis-compatible connection options.
 * Supports redis:// and rediss:// URLs.
 */
export function getRedisConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

// ── Queues ──────────────────────────────────────────────────────

export const AI_JOB_QUEUE = "ai-jobs";

export const aiJobQueue = new Queue(AI_JOB_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1_000 },
    removeOnComplete: { age: 86_400 }, // keep completed jobs for 24 h
    removeOnFail: { age: 604_800 },    // keep failed jobs for 7 d
  },
});
