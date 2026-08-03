import NextAuth from "next-auth";
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
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
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
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    // Each OAuth provider is only registered when its env vars are
    // configured, so the provider list stays valid without requiring
    // secrets in every environment.
    ...(hasGoogleOAuth ? [Google] : []),
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
