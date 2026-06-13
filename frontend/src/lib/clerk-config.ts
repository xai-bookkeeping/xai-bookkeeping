type ClerkEnv = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  VITE_CLERK_PUBLISHABLE_KEY?: string;
};

export function resolveClerkPublishableKey(env: ClerkEnv): string {
  return env.VITE_CLERK_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "pk_test_missing";
}
