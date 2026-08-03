import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const hasGoogleOAuth = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
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
    // User row — which only ever happens for an OAuth (Google) first sign-
    // in; a Credentials registration creates its User row directly in
    // registerUser (src/app/registrieren/actions.ts), bypassing the adapter
    // entirely, so this never double-fires for that path. Google already
    // verified this address itself before ever handing it to us, so there's
    // no separate confirmation link needed here the way a fresh Credentials
    // account needs one (see src/lib/verification-token.ts) — this is what
    // lets a Google sign-in skip the contact form's CAPTCHA immediately.
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
    // Only registered when Google OAuth env vars are configured, so the
    // provider list stays valid without requiring secrets in every environment.
    ...(hasGoogleOAuth ? [Google] : []),
  ],
});
