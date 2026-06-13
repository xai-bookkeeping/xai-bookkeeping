import type { Metadata } from "next";
import { AuthLeft } from "@/components/auth/AuthLeft";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthLeft
        headline="Locked out? We'll get you back in."
        subline="Enter your work email and we'll send you a secure link to reset your password."
        features={[
          { text: "Reset link expires after 1 hour for your security" },
          { text: "Previous sessions remain active until you sign out" },
          { text: "Contact support if you've lost access to your email" },
        ]}
      />
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        <ForgotPasswordForm />
      </div>
    </>
  );
}
