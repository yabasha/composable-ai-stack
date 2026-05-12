import { aiJobWorker } from "./workers/ai-job.worker.js";
import { aiJobQueue } from "./queues/index.js";

// ── Graceful shutdown ───────────────────────────────────────────

async function shutdown() {
  console.log("\n🛑 Shutting down workers…");
  await aiJobWorker.close();
  await aiJobQueue.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ── Startup ─────────────────────────────────────────────────────

console.log("🚀 Worker service starting…");
console.log(`   ├─ ai-job worker  (queue: ${aiJobQueue.name}, concurrency: 5)`);
console.log("   └─ Ready. Waiting for jobs…");
