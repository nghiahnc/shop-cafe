import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { verifyPassword, PasswordServiceError } from '@/lib/passwords';
import { findUserByEmail, findUserByGoogleSub, createGoogleUser } from "@/modules/auth/repository";

class PasswordServiceSigninError extends CredentialsSignin {
  code = 'password_service_unavailable';
}

const providers = [
  Credentials({
    credentials: { email: { type: "email" }, password: { type: "password" } },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");
      const user = await findUserByEmail(email);
      if (!user?.password_hash) return null;
      try { if (!(await verifyPassword(password, user.password_hash))) return null; }
      catch (error) {
        if (error instanceof PasswordServiceError) throw new PasswordServiceSigninError();
        throw error;
      }
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  }),
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google] : []),
];

// Read runtime bindings inside the request, after OpenNext initializes env.
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const secure = process.env.APP_RUNTIME === 'cloudflare' || Boolean(process.env.VERCEL) || process.env.AUTH_URL?.startsWith('https:') === true;
  return ({
  cookies: {
    sessionToken: { name: "shop-cafe.session-token", options: { httpOnly: true, sameSite: "lax", path: "/", secure } },
    csrfToken: { name: "shop-cafe.csrf-token", options: { httpOnly: true, sameSite: "lax", path: "/", secure } },
    callbackUrl: { name: "shop-cafe.callback-url", options: { sameSite: "lax", path: "/", secure } },
  },
  trustHost: true,
  providers,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      const google = profile as { email?: string; email_verified?: boolean; sub?: string; name?: string } | undefined;
      if (!google?.email_verified || !google.email || !google.sub) return false;
      let stored = await findUserByGoogleSub(google.sub);
      if (!stored) {
        // Never silently join a Google identity to an existing password account by email.
        if (await findUserByEmail(google.email)) return false;
        stored = await createGoogleUser(google.name || google.email, google.email, google.sub);
      }
      user.id = stored.id;
      (user as typeof user & { role: string }).role = stored.role;
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google") {
        const stored = await findUserByGoogleSub(account.providerAccountId);
        if (stored) { token.userId = stored.id; token.role = stored.role; }
      } else if (user) {
        token.userId = user.id;
        token.role = (user as typeof user & { role?: string }).role ?? "customer";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { id: string; role: string }).id = String(token.userId ?? "");
        (session.user as typeof session.user & { id: string; role: string }).role = String(token.role ?? "customer");
      }
      return session;
    },
  },
});
});
