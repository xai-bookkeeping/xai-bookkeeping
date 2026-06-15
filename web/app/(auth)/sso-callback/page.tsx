"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SsoCallbackPage() {
  return (
    <div id="clerk-captcha">
      <AuthenticateWithRedirectCallback
        continueSignUpUrl="/onboarding"
        signInUrl="/login"
        signUpUrl="/register"
      />
    </div>
  );
}
