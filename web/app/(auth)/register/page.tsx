import type { Metadata } from "next";
import { AuthLeft } from "@/components/auth/AuthLeft";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create account" };

interface Props {
  searchParams: Promise<{ email?: string }>;
}

export default async function RegisterPage({ searchParams }: Props) {
  const { email = "" } = await searchParams;

  return (
    <>
      <AuthLeft
        headline="Create your secure XAI Books account."
        subline="Verify your work email, then start setting up your UAE finance workspace."
        features={[
          { text: "Email verification required before sign-in" },
          { text: "Strong passwords with live guidance" },
          { text: "bcrypt password hashing and secure session cookies" },
          { text: "Audit logging for key account events" },
          { text: "Built for UAE VAT and AED-first workflows" },
        ]}
      />
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-white px-6 py-12">
        <RegisterForm prefillEmail={email} />
      </div>
    </>
  );
}
