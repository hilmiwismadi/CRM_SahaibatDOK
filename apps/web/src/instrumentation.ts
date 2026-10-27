// Runs once when the Next.js server process starts (see
// node_modules/next/dist/docs/01-app/02-guides/instrumentation.md).
// Starts the worker that sends messages held in the scheduled-send queue.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { startScheduledDispatcher } = await import("@/lib/scheduledDispatcher");
    startScheduledDispatcher();
  }
}
