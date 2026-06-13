import type { Metadata } from "next";
import { auth } from "@/auth";
import { OnboardingWizard } from "@/components/auth/OnboardingWizard";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Finish setup" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { company: true },
  });

  if (!user) redirect("/login");
  if (user.onboardingCompleted) redirect("/dashboard");

  return (
    <OnboardingWizard
      initialCompanyName={user.company?.name ?? user.companyName ?? ""}
      initialTaxNumber={user.company?.taxNumber ?? ""}
    />
  );
}
