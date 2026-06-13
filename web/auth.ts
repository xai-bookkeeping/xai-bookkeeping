import NextAuth, { AuthError } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations";
import { generateToken, hashPassword, verifyPassword } from "@/lib/tokens";
import { isRateLimited, recordAttempt } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit";
import type { Account, Profile, User as AuthUser } from "next-auth";

export class EmailNotVerifiedError extends AuthError {
  static type = "EmailNotVerified";
}

const STANDARD_SESSION_SECONDS = 8 * 60 * 60;
const REMEMBER_SESSION_SECONDS = 30 * 24 * 60 * 60;

type GoogleProfile = Profile & {
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
  sub?: string;
};

function splitName(profile: Partial<GoogleProfile>) {
  const [first = "XAI", ...rest] = (profile.name ?? "XAI User").trim().split(/\s+/);
  return {
    firstName: profile.given_name?.trim() || first,
    lastName: profile.family_name?.trim() || rest.join(" ") || "User",
  };
}

function accountTypeFor(passwordLoginEnabled: boolean) {
  return passwordLoginEnabled ? "EMAIL_AND_GOOGLE" : "GOOGLE";
}

async function createTrackedSession(userId: string, remember = false) {
  const expiresAt = new Date(
    Date.now() + (remember ? REMEMBER_SESSION_SECONDS : STANDARD_SESSION_SECONDS) * 1000,
  );

  return db.userSession.create({
    data: {
      expiresAt,
      ip: "oauth",
      userAgent: "Google OAuth",
      userId,
    },
  });
}

async function resolveGoogleUser(account: Account | null, profile?: Profile): Promise<AuthUser | null> {
  if (account?.provider !== "google") return null;

  const googleProfile = profile as GoogleProfile | undefined;
  const email = googleProfile?.email?.trim().toLowerCase();
  const googleId = account.providerAccountId || googleProfile?.sub;

  if (!email || !googleId || googleProfile?.email_verified === false) return null;

  const [userByGoogleId, userByEmail] = await Promise.all([
    db.user.findUnique({ where: { googleId }, include: { company: true } }),
    db.user.findUnique({ where: { email }, include: { company: true } }),
  ]);

  if (userByGoogleId && userByEmail && userByGoogleId.id !== userByEmail.id) {
    await logAuditEvent({
      action: "LOGIN_FAILED",
      email,
      ip: "oauth",
      userAgent: "Google OAuth",
      metadata: { reason: "google_identity_conflict" },
    });
    return null;
  }

  const existing = userByGoogleId ?? userByEmail;
  const now = new Date();
  const { firstName, lastName } = splitName(googleProfile ?? {});
  const avatarUrl = googleProfile?.picture ?? null;

  if (existing) {
    const wasConnected = Boolean(existing.googleId);
    const updated = await db.user.update({
      where: { id: existing.id },
      data: {
        authProvider: accountTypeFor(existing.passwordLoginEnabled),
        avatarUrl: existing.avatarUrl ?? avatarUrl,
        emailVerified: true,
        emailVerifiedAt: existing.emailVerifiedAt ?? now,
        googleId,
        lastLoginAt: now,
        status: "ACTIVE",
        company:
          existing.companyName || existing.company
            ? undefined
            : {
                create: {
                  email,
                  name: `${firstName}'s Company`,
                },
              },
      },
      include: { company: true },
    });

    if (!updated.companyName && updated.company?.name) {
      await db.user.update({
        where: { id: updated.id },
        data: { companyName: updated.company.name },
      });
    }

    await logAuditEvent({
      action: wasConnected ? "LOGIN_SUCCEEDED" : "GOOGLE_ACCOUNT_CONNECTED",
      email,
      ip: "oauth",
      userAgent: "Google OAuth",
      userId: updated.id,
      metadata: { provider: "google" },
    });

    const activeSession = await createTrackedSession(updated.id);
    return {
      id: updated.id,
      email: updated.email,
      image: updated.avatarUrl ?? undefined,
      name: updated.displayName ?? `${updated.firstName} ${updated.lastName}`,
      role: updated.role,
      companyName: updated.companyName ?? updated.company?.name ?? "XAI Books workspace",
      remember: false,
      activeSessionId: activeSession.id,
      sessionVersion: updated.sessionVersion,
      avatarUrl: updated.avatarUrl ?? undefined,
      authProvider: updated.authProvider,
      onboardingRequired: !updated.onboardingCompleted,
    };
  }

  const passwordHash = await hashPassword(generateToken());
  const companyName = `${firstName}'s Company`;
  const created = await db.user.create({
    data: {
      authProvider: "GOOGLE",
      avatarUrl,
      companyName,
      displayName: googleProfile?.name ?? `${firstName} ${lastName}`,
      email,
      emailVerified: true,
      emailVerifiedAt: now,
      firstName,
      googleId,
      lastLoginAt: now,
      lastName,
      onboardingCompleted: false,
      passwordHash,
      passwordLoginEnabled: false,
      status: "ACTIVE",
      company: {
        create: {
          email,
          name: companyName,
        },
      },
    },
    include: { company: true },
  });

  await logAuditEvent({
    action: "USER_REGISTERED",
    email,
    ip: "oauth",
    userAgent: "Google OAuth",
    userId: created.id,
    metadata: { provider: "google" },
  });

  const activeSession = await createTrackedSession(created.id);
  return {
    id: created.id,
    email: created.email,
    image: created.avatarUrl ?? undefined,
    name: created.displayName ?? `${created.firstName} ${created.lastName}`,
    role: created.role,
    companyName: created.companyName ?? created.company?.name ?? "XAI Books workspace",
    remember: false,
    activeSessionId: activeSession.id,
    sessionVersion: created.sessionVersion,
    avatarUrl: created.avatarUrl ?? undefined,
    authProvider: created.authProvider,
    onboardingRequired: true,
  };
}

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
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
          scope: "openid email profile",
        },
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "checkbox" },
        selectedRole: { label: "Role", type: "text" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, remember, selectedRole } = parsed.data;

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
            avatarUrl: true,
            authProvider: true,
            onboardingCompleted: true,
            passwordLoginEnabled: true,
            roleAssignments: {
              where: { active: true },
              include: { role: true },
            },
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

        if (!user.emailVerified || user.status !== "ACTIVE" || !user.passwordLoginEnabled) {
          await logAuditEvent({
            action: "LOGIN_FAILED",
            email,
            ip,
            userAgent,
            userId: user.id,
            metadata: {
              reason: !user.passwordLoginEnabled
                ? "password_login_disabled"
                : user.emailVerified
                  ? "inactive_status"
                  : "email_not_verified",
            },
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

        const assignedRoles = user.roleAssignments.map((assignment) => assignment.role.name);
        const fallbackRole = `_${user.role}`;
        const availableRoles = [...new Set(assignedRoles.length > 0 ? assignedRoles : [fallbackRole])];
        const activeRoleName = selectedRole && availableRoles.includes(selectedRole) ? selectedRole : availableRoles[0];
        const activeRole = activeRoleName?.replace(/^_/, "") || user.role;

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
          role: activeRole,
          selectedRole: activeRoleName,
          assignedRoles: availableRoles,
          companyName: user.companyName ?? "XAI Books workspace",
          remember,
          activeSessionId: activeSession.id,
          sessionVersion: user.sessionVersion,
          avatarUrl: user.avatarUrl ?? undefined,
          authProvider: user.authProvider,
          onboardingRequired: !user.onboardingCompleted,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") return true;
      const googleUser = await resolveGoogleUser(account, profile);
      if (!googleUser) return false;
      Object.assign(user, googleUser);
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.selectedRole = user.selectedRole;
        token.assignedRoles = user.assignedRoles;
        token.companyName = user.companyName;
        token.remember = user.remember;
        token.activeSessionId = user.activeSessionId;
        token.sessionVersion = user.sessionVersion;
        token.avatarUrl = user.avatarUrl;
        token.authProvider = user.authProvider;
        token.onboardingRequired = user.onboardingRequired;
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
      session.user.selectedRole = token.selectedRole;
      session.user.assignedRoles = token.assignedRoles;
      session.user.companyName = token.companyName ?? "";
      session.user.image = token.avatarUrl;
      session.user.authProvider = token.authProvider;
      session.activeSessionId = token.activeSessionId;
      session.remember = Boolean(token.remember);
      session.sessionExpired = Boolean(token.sessionExpired);
      session.onboardingRequired = Boolean(token.onboardingRequired);
      if (typeof token.sessionExpiresAt === "number") {
        session.sessionExpiresAt = new Date(token.sessionExpiresAt).toISOString();
      }
      return session;
    },
  },
});
