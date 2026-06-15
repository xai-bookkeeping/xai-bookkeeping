import type { Metadata } from "next";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { db } from "@/lib/db";
import { initials, shortDate, timelineFromActivity } from "@/lib/profile-utils";

export const metadata: Metadata = { title: "User profile" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserProfilePage({ params }: Props) {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");
  const { id } = await params;
  if (session.user.role !== "ADMIN" && session.user.id !== id) redirect("/dashboard");

  const user = await db.user.findUnique({
    where: { id },
    include: {
      activityLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) redirect("/users");
  const name = user.displayName ?? `${user.firstName} ${user.lastName}`.trim();

  return (
    <ProfileShell
      avatar={user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-3xl font-black text-slate-950">{initials(name)}</span>}
      createdAt={shortDate(user.createdAt)}
      metrics={[
        { label: "Role", value: user.role },
        { label: "Last login", value: user.lastLoginAt ? shortDate(user.lastLoginAt) : "Never" },
        { label: "Activity count", value: String(user.activityLogs.length) },
        { label: "Status", value: user.status },
      ]}
      name={name}
      status={user.status}
      subtitle={user.email}
      timeline={timelineFromActivity(user.activityLogs)}
      updatedAt={shortDate(user.updatedAt)}
      actions={<Link href="/users" className="rounded-xl bg-[var(--primary-color,#0ea5e9)] px-4 py-2 text-sm font-semibold text-white">Back to users</Link>}
      tabs={[
        {
          label: "Overview",
          content: (
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <div><dt className="text-slate-400">Display name</dt><dd className="font-semibold text-slate-900">{user.displayName ?? "Not set"}</dd></div>
              <div><dt className="text-slate-400">Username</dt><dd className="font-semibold text-slate-900">{user.username ?? "Not set"}</dd></div>
              <div><dt className="text-slate-400">Phone</dt><dd className="font-semibold text-slate-900">{user.phone ?? "Not set"}</dd></div>
              <div><dt className="text-slate-400">Job title</dt><dd className="font-semibold text-slate-900">{user.jobTitle ?? "Not set"}</dd></div>
              <div className="md:col-span-2"><dt className="text-slate-400">Bio</dt><dd className="font-semibold text-slate-900">{user.bio ?? "No bio"}</dd></div>
            </dl>
          ),
        },
        {
          label: "Activity",
          content: (
            <div className="divide-y divide-slate-100">
              {user.activityLogs.map((item) => (
                <div key={item.id} className="py-3 text-sm">
                  <p className="font-semibold text-slate-900">{item.action.replace(/_/g, " ")}</p>
                  <p className="text-slate-500">{shortDate(item.createdAt)} | {item.ip ?? "Unknown IP"}</p>
                </div>
              ))}
            </div>
          ),
        },
        { label: "Documents", content: <p className="text-sm text-slate-500">User agreements, signatures, and access documents will appear here.</p> },
      ]}
    />
  );
}
