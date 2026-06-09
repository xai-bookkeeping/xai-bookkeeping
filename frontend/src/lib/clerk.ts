import type { ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, useAuth, useOrganizationList } from "@clerk/react";

import { resolveClerkPublishableKey } from "@/lib/clerk-config";

type AuthGateProps = {
  children: ReactNode;
};

export { ClerkProvider, SignIn, SignUp, useAuth, useOrganizationList, resolveClerkPublishableKey };

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
