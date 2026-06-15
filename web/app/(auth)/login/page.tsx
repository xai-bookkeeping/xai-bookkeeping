import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthLeft } from "@/components/auth/AuthLeft";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const { isAuthenticated } = await auth();
  if (isAuthenticated) redirect("/dashboard");

  return (
    <>
      <AuthLeft
        headline="Run your business finances with confidence."
        subline="Invoices, payments, VAT and cashflow — in one simple, UAE‑first system. Built for owners, trusted by accountants."
        features={[
          { text: "5% UAE VAT calculated and applied automatically on every transaction" },
          { text: "AED-native with TRN-ready invoice formatting out of the box" },
          { text: "One owner dashboard for complete financial visibility" },
          { text: "Federal Tax Authority compliant from day one" },
        ]}
      />
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        <LoginForm />
      </div>
    </>
  );
}
