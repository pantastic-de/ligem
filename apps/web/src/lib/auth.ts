import NextAuth, { type Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const hasGoogleOAuth = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
const hasAppleOAuth = Boolean(
  process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET,
);
const hasMicrosoftOAuth = Boolean(
  process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Required behind a reverse proxy (Caddy/Nginx in production, see
  // DEPLOYMENT.md) — without it Auth.js rejects the request's Host header
  // ("UntrustedHost") since it can't verify the proxy forwarded it honestly.
  // The app isn't reachable directly from the internet (only via the proxy
  // in front of it), so trusting the Host header here is safe.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/anmelden",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.mustChangePassword = user.mustChangePassword ?? false;
      }
      return token;
    },
    // Explicitly typed params (not inferred from NextAuth's own contextual
    // callback signature): without this, TypeScript resolves the write
    // target for `session.user.mustChangePassword = ...` as `{}` instead of
    // `boolean` and fails `next build`'s full project type-check — a
    // reproducible TS quirk with writing (not reading) a custom property
    // that's genuinely new to the intersection NextAuth's own `Session`
    // type builds up from `AdapterUser & User`. Verified with a from-empty
    // `pnpm build` (not just `tsc --noEmit`, which had shown this
    // inconsistently depending on incremental-build cache state) —
    // reproduced the failure, confirmed this annotation is what fixes it.
    session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
        session.user.mustChangePassword = token.mustChangePassword ?? false;
      }
      return session;
    },
  },
  events: {
    // Fires on every successful sign-in (Credentials and Google alike) —
    // deliberately just this one timestamp, not a full login-history log,
    // matching this app's otherwise lightweight trust/safety footprint
    // (see User.lastLoginAt in schema.prisma).
    async signIn({ user }) {
      if (!user.id) return;
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    },
    // Fires only once, when the PrismaAdapter itself creates a brand-new
    // User row — which only ever happens for an OAuth (Google/Apple/
    // Microsoft) first sign-in; a Credentials registration creates its User
    // row directly in registerUser (src/app/registrieren/actions.ts),
    // bypassing the adapter entirely, so this never double-fires for that
    // path. Every OAuth provider here already verified this address itself
    // before ever handing it to us, so there's no separate confirmation
    // link needed the way a fresh Credentials account needs one (see
    // src/lib/verification-token.ts) — this is what lets any OAuth sign-in
    // skip the contact form's CAPTCHA immediately.
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },
  providers: [
    Credentials({
      credentials: {
        // A single field accepting either — see User.username in
        // schema.prisma (currently only set for the seeded installation
        // admin, see prisma/seed.ts). Deliberately `type: "text"`, not
        // `"email"`: the login page's native email-format validation would
        // otherwise reject a plain username like "admin" before the form
        // could even submit.
        identifier: { label: "E-Mail-Adresse oder Benutzername", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      authorize: async (credentials) => {
        const identifier = credentials?.identifier;
        const password = credentials?.password;
        if (typeof identifier !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: { OR: [{ email: identifier }, { username: identifier }] },
        });
        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
    // Each OAuth provider is only registered when its env vars are
    // configured, so the provider list stays valid without requiring
    // secrets in every environment. Explicit clientId/clientSecret here —
    // not just a bare `Google` — is required: Auth.js's built-in providers
    // only auto-infer credentials from its own `AUTH_GOOGLE_ID`/
    // `AUTH_GOOGLE_SECRET` env var convention, not this app's
    // `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` naming (matching every other
    // env var in this app, see docker-compose.yml) — a bare `Google` here
    // silently ended up with an undefined client_id (reported directly: the
    // initial Google consent screen failed with "invalid_client"/"OAuth
    // client was not found", and the callback failed with `TypeError:
    // "client.client_id" must be a string"). Apple/Microsoft below were
    // already configured explicitly and never had this bug.
    ...(hasGoogleOAuth
      ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
    // Apple's clientSecret is not a plain string but a JWT signed with a
    // private key (Team ID/Key ID/`.p8` file from the Apple Developer
    // portal) — that JWT generation happens outside this app, whatever
    // value ends up in APPLE_CLIENT_SECRET just needs to already be that
    // signed token (regenerated periodically, since Apple's own JWTs expire
    // after at most 6 months).
    ...(hasAppleOAuth
      ? [Apple({ clientId: process.env.APPLE_CLIENT_ID, clientSecret: process.env.APPLE_CLIENT_SECRET })]
      : []),
    // No `issuer` override — defaults to the "common" tenant, which allows
    // any Microsoft account (personal, school, or work) to sign in, not
    // just accounts from one specific organization.
    ...(hasMicrosoftOAuth
      ? [MicrosoftEntraID({ clientId: process.env.MICROSOFT_CLIENT_ID, clientSecret: process.env.MICROSOFT_CLIENT_SECRET })]
      : []),
  ],
});
