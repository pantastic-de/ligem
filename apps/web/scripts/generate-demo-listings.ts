// CLI wrapper around src/lib/demo-data/listings.ts. The same generator now
// also runs from /admin/demo-daten in the app itself; this script remains
// for scripting/bulk use from the command line.
//
// Usage (inside the web container):
//   pnpm exec tsx scripts/generate-demo-listings.ts --count=30
//   pnpm exec tsx scripts/generate-demo-listings.ts --count=100
//
// See src/lib/demo-data/cleanup.ts (or /admin/demo-daten) for removing the
// generated data again.

import { generateDemoListings } from "@/lib/demo-data/listings";
import { prisma } from "@/lib/demo-data/shared";

async function main() {
  const args = process.argv.slice(2);
  const countArg = args.find((a) => a.startsWith("--count="));
  const count = Number(countArg?.split("=")[1] ?? 20);

  console.log(`Generiere Demo-Wohnprojekte ...`);
  const { created } = await generateDemoListings(count, (msg) => console.log(`  ${msg}`));
  console.log(`Fertig. ${created} Projekte erstellt.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
