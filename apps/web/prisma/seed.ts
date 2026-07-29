import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Local-dev-only admin account so the admin area is reachable without a
// separate promotion step. Never rely on this fixed password outside local
// development.
const DEV_ADMIN_EMAIL = "admin@ligem.local";
const DEV_ADMIN_PASSWORD = "admin12345";

// Initial listing taxonomy. This table is meant to stay freely extensible
// from the admin backend later — this seed only covers the categories named
// explicitly in the requirements questionnaire.
const categories = [
  { slug: "zimmer", name: "Freies Zimmer", nameEn: "Room available" },
  { slug: "ganze-einheit", name: "Ganze Einheit", nameEn: "Whole unit" },
  { slug: "projektgruendung", name: "Projektgründung", nameEn: "Founding a project" },
  { slug: "mitgruender-gesucht", name: "Mitgründer gesucht", nameEn: "Co-founder wanted" },
  { slug: "probewohnen", name: "Probewohnen", nameEn: "Trial living" },
  { slug: "retreat", name: "Retreat", nameEn: "Retreat" },
  { slug: "zwischennutzung", name: "Zwischennutzung", nameEn: "Temporary use" },
];

// Generic filter-attribute groups (Projekt Typ, Grundwerte, ...). Extendable
// any time by adding rows here or from an admin backend later — no migration
// needed for new groups or new options within a group.
const attributeGroups: {
  slug: string;
  name: string;
  nameEn?: string;
  appliesTo?: "LISTING" | "EVENT";
  allowMultiple: boolean;
  sortOrder: number;
  options: { slug: string; name: string; nameEn?: string }[];
}[] = [
  {
    slug: "projekt-typ",
    name: "Projekt Typ",
    allowMultiple: false,
    sortOrder: 10,
    options: [
      { slug: "haus", name: "Haus" },
      { slug: "wohnwagen", name: "Wohnwagen" },
      { slug: "tipi", name: "Tipi" },
      { slug: "zimmer", name: "Zimmer" },
      { slug: "seminarhaus", name: "Seminarhaus" },
      { slug: "bauernhaus", name: "Bauernhaus" },
    ],
  },
  {
    slug: "projekt-status",
    name: "Projekt Status",
    allowMultiple: false,
    sortOrder: 20,
    options: [
      { slug: "in-gruendung", name: "In Gründung" },
      { slug: "im-aufbau", name: "Wohnprojekt im Aufbau" },
      { slug: "etabliert", name: "Etabliert" },
      { slug: "sucht-neuen-standort", name: "Sucht neuen Standort" },
    ],
  },
  {
    slug: "geschlechterverteilung",
    name: "Geschlechterverteilung der Gruppe",
    allowMultiple: false,
    sortOrder: 30,
    options: [
      { slug: "gemischt", name: "Gemischt" },
      { slug: "ueberwiegend-weiblich", name: "Überwiegend weiblich" },
      { slug: "ueberwiegend-maennlich", name: "Überwiegend männlich" },
      { slug: "nur-frauen", name: "Nur Frauen" },
      { slug: "nur-maenner", name: "Nur Männer" },
      { slug: "divers-offen", name: "Divers/offen" },
    ],
  },
  {
    slug: "organisationsform",
    name: "Organisationsform",
    allowMultiple: true,
    sortOrder: 40,
    options: [
      { slug: "cluster-wg", name: "Cluster-Wohngemeinschaft" },
      { slug: "gemeinschaftseigentum", name: "Gemeinschaftseigentum" },
      { slug: "genossenschaft", name: "Genossenschaft" },
    ],
  },
  {
    slug: "gemeinschaftsbereiche",
    name: "Gemeinschaftliche Aufgaben",
    allowMultiple: true,
    sortOrder: 50,
    options: [
      { slug: "leben", name: "Gemeinschaftlich leben" },
      { slug: "arbeiten", name: "Gemeinschaftlich arbeiten" },
    ],
  },
  {
    slug: "grundwerte",
    name: "Grundwerte",
    allowMultiple: true,
    sortOrder: 60,
    options: [
      { slug: "gegenseitige-hilfe", name: "Gegenseitige Hilfe" },
      { slug: "gemeinsame-aktivitaeten", name: "Gemeinsame Aktivitäten" },
      { slug: "gesundheitliche-vorsorge", name: "Gesundheitliche Vorsorge" },
      { slug: "teilen-von-ressourcen", name: "Teilen von Ressourcen" },
      { slug: "inklusion", name: "Inklusion" },
    ],
  },
  {
    slug: "wohnlage",
    name: "Wohnlage",
    allowMultiple: true,
    sortOrder: 70,
    options: [
      { slug: "garten", name: "Garten" },
      { slug: "laendlich", name: "Ländlich" },
    ],
  },
  {
    slug: "zielgruppe",
    name: "Zielgruppe",
    allowMultiple: true,
    sortOrder: 80,
    options: [
      { slug: "50-plus", name: "50 Plus" },
      { slug: "familien", name: "Familien" },
      { slug: "singles", name: "Singles" },
    ],
  },
  // Event-Attribute (Kalender)
  {
    slug: "veranstaltungsart",
    name: "Veranstaltungsart",
    appliesTo: "EVENT",
    allowMultiple: false,
    sortOrder: 100,
    options: [
      { slug: "infotag", name: "Infotag" },
      { slug: "besuchstag", name: "Besuchstag" },
      { slug: "workshop", name: "Workshop" },
      { slug: "vortrag", name: "Vortrag" },
      { slug: "fest", name: "Fest/Feier" },
      { slug: "mitmachtag", name: "Mitmachtag/Arbeitseinsatz" },
      { slug: "online", name: "Online-Veranstaltung" },
    ],
  },
  {
    slug: "veranstaltung-zielgruppe",
    name: "Zielgruppe",
    appliesTo: "EVENT",
    allowMultiple: true,
    sortOrder: 110,
    options: [
      { slug: "alle-willkommen", name: "Alle willkommen" },
      { slug: "familien-mit-kindern", name: "Familien mit Kindern" },
      { slug: "nur-mitglieder", name: "Nur Mitglieder/Interessent:innen" },
      { slug: "fachpublikum", name: "Fachpublikum" },
    ],
  },
  {
    slug: "veranstaltung-merkmale",
    name: "Merkmale",
    appliesTo: "EVENT",
    allowMultiple: true,
    sortOrder: 120,
    options: [
      { slug: "barrierefrei", name: "Barrierefrei zugänglich" },
      { slug: "kostenlos", name: "Kostenlos" },
      { slug: "kinderfreundlich", name: "Kinderfreundlich" },
    ],
  },
];

async function main() {
  for (const category of categories) {
    await prisma.listingCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, nameEn: category.nameEn },
      create: category,
    });
  }
  console.log(`Seeded ${categories.length} listing categories.`);

  for (const group of attributeGroups) {
    const { options, appliesTo, ...groupData } = group;
    const data = { ...groupData, appliesTo: appliesTo ?? "LISTING" } as const;
    const savedGroup = await prisma.attributeGroup.upsert({
      where: { slug: group.slug },
      update: data,
      create: data,
    });

    for (const [index, option] of options.entries()) {
      await prisma.attributeOption.upsert({
        where: { groupId_slug: { groupId: savedGroup.id, slug: option.slug } },
        update: { name: option.name, nameEn: option.nameEn, sortOrder: index },
        create: { ...option, groupId: savedGroup.id, sortOrder: index },
      });
    }
  }
  console.log(
    `Seeded ${attributeGroups.length} attribute groups with ${attributeGroups.reduce((sum, g) => sum + g.options.length, 0)} options.`,
  );

  if (process.env.NODE_ENV === "production") {
    console.log(
      "NODE_ENV=production: skipping the fixed-password dev admin seed. " +
        "Promote an existing account to ADMIN instead, e.g. via `pnpm db:studio` " +
        "or the admin Nutzerverwaltung once at least one admin exists.",
    );
  } else {
    const adminPasswordHash = await bcrypt.hash(DEV_ADMIN_PASSWORD, 12);
    const adminUser = await prisma.user.upsert({
      where: { email: DEV_ADMIN_EMAIL },
      update: {},
      create: {
        email: DEV_ADMIN_EMAIL,
        name: "Ligem Admin",
        passwordHash: adminPasswordHash,
      },
    });
    await prisma.userRoleAssignment.upsert({
      where: { userId_role: { userId: adminUser.id, role: "ADMIN" } },
      update: {},
      create: { userId: adminUser.id, role: "ADMIN" },
    });
    console.log(
      `Seeded local dev admin: ${DEV_ADMIN_EMAIL} / ${DEV_ADMIN_PASSWORD} (change or remove for anything beyond local dev).`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
