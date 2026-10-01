// Next.js calls register() once when the server starts. Used to start the
// daily view-log maintenance (src/lib/view-retention.ts) inside the app
// process, so the server needs no separate cron job. Node runtime only: the
// edge runtime has no database driver or timers that outlive a request.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startViewMaintenanceSchedule } = await import("@/lib/view-retention");
  startViewMaintenanceSchedule();
}
