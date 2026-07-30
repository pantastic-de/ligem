// CLI wrapper around src/lib/demo-data/events.ts. The same generator now
// also runs from /admin/demo-daten in the app itself; this script remains
// for scripting/bulk use from the command line.
//
// Usage (inside the web container, after generate-demo-listings.ts has run
// at least once):
//   pnpm exec tsx scripts/generate-demo-events.ts --count=50

import { generateDemoEvents } from "@/lib/demo-data/events";
import { prisma } from "@/lib/demo-data/shared";

async function main() {
  const args = process.argv.slice(2);
  const countArg = args.find((a) => a.startsWith("--count="));
  const count = Number(countArg?.split("=")[1] ?? 30);

  console.log(`Generiere Demo-Termine ...`);
  const { created } = await generateDemoEvents(count, (msg) => console.log(`  ${msg}`));
  console.log(`Fertig. ${created} Termine erstellt.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
