import NextAuth, { AuthError } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations";
import { verifyPassword } from "@/lib/tokens";
import { isRateLimited, recordAttempt } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit";

export class EmailNotVerifiedError extends AuthError {
  static type = "EmailNotVerified";
}

const STANDARD_SESSION_SECONDS = 8 * 60 * 60;
const REMEMBER_SESSION_SECONDS = 30 * 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: REMEMBER_SESSION_SECONDS,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "checkbox" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, remember } = parsed.data;

        const ip =
          (request as Request).headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          (request as Request).headers.get("x-real-ip") ??
          "unknown";
        const userAgent = (request as Request).headers.get("user-agent") ?? undefined;

        const blocked = await isRateLimited(email, ip);
        if (blocked) return null;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            passwordHash: true,
            emailVerified: true,
            emailVerifiedAt: true,
            role: true,
            status: true,
            companyName: true,
            sessionVersion: true,
          },
        });

        if (!user) {
          // Constant-time dummy check to prevent timing attacks
          await verifyPassword(password, "$2b$12$placeholder.hash.for.timing");
          await recordAttempt(email, ip, false);
          await logAuditEvent({
            action: "LOGIN_FAILED",
            email,
            ip,
            userAgent,
            metadata: { reason: "invalid_credentials" },
          });
          return null;
        }

        if (!user.emailVerified || user.status !== "ACTIVE") {
          await logAuditEvent({
            action: "LOGIN_FAILED",
            email,
            ip,
            userAgent,
            userId: user.id,
            metadata: { reason: user.emailVerified ? "inactive_status" : "email_not_verified" },
          });
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        await recordAttempt(email, ip, valid, user.id);

        await logAuditEvent({
          action: valid ? "LOGIN_SUCCEEDED" : "LOGIN_FAILED",
          email,
          ip,
          userAgent,
          userId: user.id,
          metadata: valid ? { remember } : { reason: "invalid_credentials" },
        });

        if (!valid) return null;

        const sessionExpiresAt = new Date(
          Date.now() + (remember ? REMEMBER_SESSION_SECONDS : STANDARD_SESSION_SECONDS) * 1000,
        );
        const activeSession = await db.userSession.create({
          data: {
            expiresAt: sessionExpiresAt,
            ip,
            userAgent,
            userId: user.id,
          },
        });

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          companyName: user.companyName ?? "XAI Books workspace",
          remember,
          activeSessionId: activeSession.id,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.companyName = user.companyName;
        token.remember = user.remember;
        token.activeSessionId = user.activeSessionId;
        token.sessionVersion = user.sessionVersion;
        token.sessionExpiresAt =
          Date.now() +
          (user.remember ? REMEMBER_SESSION_SECONDS : STANDARD_SESSION_SECONDS) * 1000;
      }
      if (token.id && token.activeSessionId && !token.sessionExpired) {
        const session = await db.userSession.findFirst({
          where: {
            id: token.activeSessionId,
            userId: token.id,
          },
          select: {
            expiresAt: true,
            revokedAt: true,
            user: { select: { sessionVersion: true } },
          },
        });
        token.sessionExpired =
          !session ||
          Boolean(session.revokedAt) ||
          session.expiresAt.getTime() < Date.now() ||
          session.user.sessionVersion !== token.sessionVersion;
        if (!token.sessionExpired) {
          await db.userSession.update({
            where: { id: token.activeSessionId },
            data: { lastSeenAt: new Date() },
          });
        }
      }
      token.sessionExpired =
        Boolean(token.sessionExpired) ||
        (typeof token.sessionExpiresAt === "number" && Date.now() > token.sessionExpiresAt);
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id ?? "";
      session.user.role = token.role ?? "USER";
      session.user.companyName = token.companyName ?? "";
      session.activeSessionId = token.activeSessionId;
      session.remember = Boolean(token.remember);
      session.sessionExpired = Boolean(token.sessionExpired);
      if (typeof token.sessionExpiresAt === "number") {
        session.sessionExpiresAt = new Date(token.sessionExpiresAt).toISOString();
      }
      return session;
    },
  },
});
