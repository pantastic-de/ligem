"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireAdminAction } from "@/lib/authz";
import { generateDemoListings } from "@/lib/demo-data/listings";
import { generateDemoEvents } from "@/lib/demo-data/events";
import { deleteAllDemoData } from "@/lib/demo-data/cleanup";
import {
  completeJob,
  createJob,
  failJob,
  getJob,
  scheduleJobCleanup,
  updateJob,
  type ProgressState,
} from "@/lib/demo-data/progress-store";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unbekannter Fehler.";
}

// Generating a full batch (each listing/event fetches a photo and writes
// several rows) can take minutes, far too long to hold a single request
// open — so this returns a job id right away and does the actual work via
// `after()`, Next's sanctioned way to keep running background work past the
// point the response was sent (see DemoDataGenerateForm, which polls
// getGenerateProgress for this job id until it's done).
export async function startGenerateListings(count: number): Promise<{ jobId: string }> {
  await requireAdminAction();
  const clamped = Math.min(100, Math.max(1, Math.floor(count)));
  const jobId = createJob(clamped);

  after(async () => {
    try {
      await generateDemoListings(clamped, (current, _total, message) => {
        updateJob(jobId, current, message);
      });
      completeJob(jobId);
    } catch (err) {
      failJob(jobId, errorMessage(err));
    } finally {
      scheduleJobCleanup(jobId);
    }
  });

  return { jobId };
}

export async function startGenerateEvents(count: number): Promise<{ jobId: string }> {
  await requireAdminAction();
  const clamped = Math.min(200, Math.max(1, Math.floor(count)));
  const jobId = createJob(clamped);

  after(async () => {
    try {
      await generateDemoEvents(clamped, (current, _total, message) => {
        updateJob(jobId, current, message);
      });
      completeJob(jobId);
    } catch (err) {
      failJob(jobId, errorMessage(err));
    } finally {
      scheduleJobCleanup(jobId);
    }
  });

  return { jobId };
}

export async function getGenerateProgress(jobId: string): Promise<ProgressState> {
  await requireAdminAction();
  return (
    getJob(jobId) ?? {
      total: 0,
      completed: 0,
      done: true,
      error: "Job nicht gefunden.",
      label: "",
    }
  );
}

export async function deleteAllDemoDataAction(): Promise<void> {
  await requireAdminAction();

  let target: string;
  try {
    const { deletedUsers } = await deleteAllDemoData();
    target = `/admin/demo-daten?ok=${encodeURIComponent(`${deletedUsers} Demo-Konten und alle zugehörigen Projekte/Termine gelöscht.`)}`;
  } catch (err) {
    target = `/admin/demo-daten?error=${encodeURIComponent(errorMessage(err))}`;
  }

  revalidatePath("/admin/demo-daten");
  revalidatePath("/admin/projekte");
  redirect(target);
}
