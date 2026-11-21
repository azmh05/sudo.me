// Runs once when the Hub's server starts: launches the reminder scheduler.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/notify/scheduler");
    startScheduler();
  }
}
