import { mitDatenbank, testdatenAnlegen, testdatenEntfernen } from "./support/testdaten";

// Fresh test data for every run: leftovers of an aborted run are removed first.
export default async function globalSetup(): Promise<void> {
  await mitDatenbank(async (db) => {
    await testdatenEntfernen(db);
    await testdatenAnlegen(db);
  });
}
