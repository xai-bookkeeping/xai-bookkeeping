"use server";

import { auth, signIn, signOut } from "@/auth";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "@/lib/email";
import { getLockoutEnd, getRemainingAttempts, isRateLimited } from "@/lib/rate-limit";
import {
  consumePasswordResetToken,
  consumeVerificationToken,
  createPasswordResetToken,
  createVerificationToken,
  hashPassword,
  validateUserInvitationToken,
  validatePasswordResetToken,
} from "@/lib/tokens";
import { acceptInvitationSchema } from "@/lib/user-management-validations";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordFormData,
  type LoginFormData,
  type RegisterFormData,
  type ResetPasswordFormData,
} from "@/lib/validations";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ActionResult<T = never> = {
  error?: string;
  code?: string;
  data?: T;
};

async function getRequestContext(): Promise<{ ip: string; userAgent?: string }> {
  const headersList = await headers();

  return {
    ip:
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      "unknown",
    userAgent: headersList.get("user-agent") ?? undefined,
  };
}

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export async function loginAction(formData: LoginFormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { email, password, remember } = parsed.data;
  const { ip, userAgent } = await getRequestContext();

  const blocked = await isRateLimited(email, ip);
  if (blocked) {
    const lockoutEnd = await getLockoutEnd(email);
    const minutes = lockoutEnd
      ? Math.ceil((lockoutEnd.getTime() - Date.now()) / 60000)
      : 15;
    await logAuditEvent({
      action: "LOGIN_FAILED",
      email,
      ip,
      userAgent,
      metadata: { reason: "rate_limited" },
    });
    return {
      error: `Too many failed attempts. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
      code: "rate_limited",
    };
  }

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { emailVerified: true, id: true, status: true },
  });

  if (existingUser && (!existingUser.emailVerified || existingUser.status !== "ACTIVE")) {
    return {
      error: "Please verify your email address before signing in.",
      code: "email_not_verified",
      data: { email } as never,
    };
  }

  const remaining = await getRemainingAttempts(email);

  try {
    await signIn("credentials", {
      email,
      password,
      remember,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const hint =
        remaining > 1
          ? ` ${remaining - 1} attempt${remaining - 1 !== 1 ? "s" : ""} remaining.`
          : " Your account will be temporarily locked.";
      return { error: `Invalid email or password.${hint}` };
    }

    throw error;
  }

  return {};
}

export async function registerAction(formData: RegisterFormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { email, password, firstName, lastName } = parsed.data;
  const { ip, userAgent } = await getRequestContext();

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return {
      error: "An account with this email already exists.",
      code: "email_exists",
    };
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      email,
      firstName,
      lastName,
      passwordHash,
      status: "PENDING",
    },
  });

  await logAuditEvent({
    action: "USER_REGISTERED",
    email,
    ip,
    userAgent,
    userId: user.id,
  });

  const token = await createVerificationToken(user.id);

  try {
    await sendVerificationEmail(email, fullName(firstName, lastName), token);
    await logAuditEvent({
      action: "EMAIL_VERIFICATION_SENT",
      email,
      ip,
      userAgent,
      userId: user.id,
    });
  } catch {
    // Non-fatal. The user can request a resend from the verification page.
  }

  redirect(`/verify-email?sent=true&email=${encodeURIComponent(email)}`);
}

export async function resendVerificationAction(email: string): Promise<ActionResult> {
  const normalizedEmail = email.toLowerCase();
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      emailVerified: true,
      firstName: true,
      id: true,
      lastName: true,
    },
  });

  if (!user || user.emailVerified) {
    return {};
  }

  const token = await createVerificationToken(user.id);

  try {
    await sendVerificationEmail(normalizedEmail, fullName(user.firstName, user.lastName), token);
    const { ip, userAgent } = await getRequestContext();
    await logAuditEvent({
      action: "EMAIL_VERIFICATION_SENT",
      email: normalizedEmail,
      ip,
      userAgent,
      userId: user.id,
      metadata: { resend: true },
    });
  } catch {
    return { error: "Failed to send email. Please try again." };
  }

  return {};
}

export async function verifyEmailAction(token: string): Promise<ActionResult> {
  const { ip, userAgent } = await getRequestContext();
  const result = await consumeVerificationToken(token);

  if (!result) {
    return {
      error: "This verification link is invalid or has expired.",
      code: "invalid_token",
    };
  }

  await db.user.update({
    where: { id: result.userId },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      status: "ACTIVE",
    },
  });

  const user = await db.user.findUnique({
    where: { id: result.userId },
    select: { email: true, firstName: true, lastName: true },
  });

  if (user) {
    await logAuditEvent({
      action: "EMAIL_VERIFIED",
      email: user.email,
      ip,
      userAgent,
      userId: result.userId,
    });

    try {
      await sendWelcomeEmail(user.email, fullName(user.firstName, user.lastName));
    } catch {
      // Non-fatal.
    }
  }

  return {};
}

export async function forgotPasswordAction(
  formData: ForgotPasswordFormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { email } = parsed.data;
  const { ip, userAgent } = await getRequestContext();

  const user = await db.user.findUnique({
    where: { email },
    select: {
      emailVerified: true,
      firstName: true,
      id: true,
      lastName: true,
      status: true,
    },
  });

  if (!user || !user.emailVerified || user.status !== "ACTIVE") {
    return {};
  }

  const token = await createPasswordResetToken(user.id);

  try {
    await sendPasswordResetEmail(email, fullName(user.firstName, user.lastName), token);
    await logAuditEvent({
      action: "PASSWORD_RESET_REQUESTED",
      email,
      ip,
      userAgent,
      userId: user.id,
    });
  } catch {
    return { error: "Failed to send reset email. Please try again." };
  }

  return {};
}

export async function validateResetTokenAction(token: string): Promise<ActionResult> {
  const valid = await validatePasswordResetToken(token);
  if (!valid) {
    return { error: "This reset link is invalid or has expired.", code: "invalid_token" };
  }
  return {};
}

export async function resetPasswordAction(
  formData: ResetPasswordFormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { token, password } = parsed.data;
  const { ip, userAgent } = await getRequestContext();
  const result = await consumePasswordResetToken(token);

  if (!result) {
    return { error: "This reset link is invalid or has expired.", code: "invalid_token" };
  }

  const passwordHash = await hashPassword(password);

  await db.user.update({
    where: { id: result.userId },
    data: { passwordHash },
  });

  const user = await db.user.findUnique({
    where: { id: result.userId },
    select: { email: true },
  });

  await logAuditEvent({
    action: "PASSWORD_RESET_COMPLETED",
    email: user?.email,
    ip,
    userAgent,
    userId: result.userId,
  });

  return {};
}

export async function validateInvitationAction(token: string): Promise<ActionResult> {
  const invitation = await validateUserInvitationToken(token);
  if (!invitation || !invitation.user) {
    return { error: "This invitation link is invalid or has expired.", code: "invalid_token" };
  }

  return {
    data: {
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role,
    } as never,
  };
}

export async function acceptInvitationAction(
  formData: ResetPasswordFormData,
): Promise<ActionResult> {
  const parsed = acceptInvitationSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { token, password } = parsed.data;
  const { ip, userAgent } = await getRequestContext();
  const invitation = await validateUserInvitationToken(token);

  if (!invitation || !invitation.userId) {
    return { error: "This invitation link is invalid or has expired.", code: "invalid_token" };
  }

  const passwordHash = await hashPassword(password);

  await db.$transaction([
    db.user.update({
      where: { id: invitation.userId },
      data: {
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
      },
    }),
    db.userInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  await logAuditEvent({
    action: "USER_INVITE_ACCEPTED",
    email: invitation.email,
    ip,
    userAgent,
    userId: invitation.userId,
    metadata: { role: invitation.role },
  });

  try {
    await sendWelcomeEmail(
      invitation.email,
      fullName(invitation.firstName, invitation.lastName),
    );
  } catch {
    // Non-fatal.
  }

  return {};
}

export async function signOutAction(): Promise<void> {
  const session = await auth();
  const { ip, userAgent } = await getRequestContext();

  await logAuditEvent({
    action: "LOGOUT",
    email: session?.user.email,
    ip,
    userAgent,
    userId: session?.user.id,
  });

  await signOut({ redirectTo: "/login" });
}
