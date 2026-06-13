import type { ReactNode } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  TaskChooseOrganization,
  useAuth,
  useOrganizationList,
} from "@clerk/react";

import { resolveClerkPublishableKey } from "@/lib/clerk-config";

type AuthGateProps = {
  children: ReactNode;
};

export const CLERK_TASK_URLS = {
  "choose-organization": "/tasks/choose-organization",
} as const;

export {
  ClerkProvider,
  SignIn,
  SignUp,
  TaskChooseOrganization,
  useAuth,
  useOrganizationList,
  resolveClerkPublishableKey,
};

export function SignedIn({ children }: AuthGateProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return children;
}

export function SignedOut({ children }: AuthGateProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || isSignedIn) {
    return null;
  }

  return children;
}
