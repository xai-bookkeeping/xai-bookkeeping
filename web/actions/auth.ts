"use server";

import { logAuditEvent } from "@/lib/audit";
import { requestContext } from "@/lib/api-utils";
import { getCurrentUser } from "@/lib/get-current-user";

export type ActionResult<T = never> = {
  error?: string;
  code?: string;
  data?: T;
};

export async function signOutAction(): Promise<void> {
  const session = await getCurrentUser();
  const { ip, userAgent } = await requestContext();

  await logAuditEvent({
    action: "LOGOUT",
    email: session?.user.email,
    ip,
    userAgent,
    userId: session?.user.id,
  });
}
