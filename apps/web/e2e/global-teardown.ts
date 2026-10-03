import { mitDatenbank, testdatenEntfernen } from "./support/testdaten";

// Set E2E_KEEP=1 to keep the test data after a run, e.g. to look at it in the browser.
export default async function globalTeardown(): Promise<void> {
  if (process.env.E2E_KEEP === "1") return;
  await mitDatenbank(testdatenEntfernen);
}
