import Link from "next/link";
import { registerUser } from "./actions";

const errorMessages: Record<string, string> = {
  email: "Bitte gib eine gültige E-Mail-Adresse ein.",
  password: "Das Passwort muss mindestens 8 Zeichen lang sein.",
  exists: "Für diese E-Mail-Adresse existiert bereits ein Konto.",
};

export default async function RegistrierenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? errorMessages[error] : undefined;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Konto erstellen</h1>
      <p className="mt-2 text-text-muted">
        Kostenlos registrieren, um Wohnprojekte einzutragen oder zu speichern.
      </p>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error"
        >
          {errorMessage}
        </p>
      ) : null}

      <form action={registerUser} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            className="min-h-12 rounded-xl border border-text/20 bg-surface px-4 text-text"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="font-medium">
            E-Mail-Adresse
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="min-h-12 rounded-xl border border-text/20 bg-surface px-4 text-text"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="font-medium">
            Passwort
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="min-h-12 rounded-xl border border-text/20 bg-surface px-4 text-text"
          />
          <span className="text-sm text-text-muted">Mindestens 8 Zeichen.</span>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">Ich möchte (optional):</legend>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="role-suchende" className="h-5 w-5" />
            eine Wohngemeinschaft finden
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="role-anbieter" className="h-5 w-5" />
            ein Projekt präsentieren
          </label>
        </fieldset>

        <button
          type="submit"
          className="mt-2 min-h-12 rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Konto erstellen
        </button>
      </form>

      <p className="mt-6 text-text-muted">
        Schon ein Konto?{" "}
        <Link href="/anmelden" className="font-medium text-primary">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
