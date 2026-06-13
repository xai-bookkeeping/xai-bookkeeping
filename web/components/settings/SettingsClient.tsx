"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import {
  Activity,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  ImageIcon,
  KeyRound,
  Monitor,
  Shield,
  User,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { googleSignInAction } from "@/actions/auth";
import { cn } from "@/lib/cn";

type ProfileState = {
  accountStatus: string;
  authProvider: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  jobTitle: string;
  lastLoginAt: string;
  lastName: string;
  phone: string;
  role: string;
  username: string;
  googleConnected: boolean;
  passwordLoginEnabled: boolean;
};

type CompanyState = {
  address: string;
  city: string;
  country: string;
  coverImageUrl: string;
  currency: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  email: string;
  logoUrl: string;
  name: string;
  phone: string;
  taxNumber: string;
  timezone: string;
  website: string;
};

type PreferencesState = {
  currency: string;
  dateFormat: string;
  language: string;
  theme: "LIGHT" | "DARK" | "SYSTEM";
  timeFormat: "12h" | "24h";
};

type ActivityItem = {
  action: string;
  createdAt: string;
  email: string | null;
  id: string;
  ip: string | null;
};

type SessionItem = {
  createdAt: string;
  expiresAt: string;
  id: string;
  ip: string | null;
  lastSeenAt: string;
  revokedAt: string;
  userAgent: string | null;
};

type SettingsTab = "profile" | "company" | "security" | "preferences" | "activity";

interface SettingsClientProps {
  activeSessionId: string;
  initialActiveTab?: SettingsTab;
  initialActivity: ActivityItem[];
  initialCompany: CompanyState;
  initialPreferences: PreferencesState;
  initialProfile: ProfileState;
  initialSessions: SessionItem[];
}

const tabs: Array<{ id: SettingsTab; label: string; icon: typeof User }> = [
  { id: "profile", label: "Profile", icon: User },
  { id: "company", label: "Company", icon: Building2 },
  { id: "security", label: "Security", icon: Shield },
  { id: "preferences", label: "Preferences", icon: Monitor },
  { id: "activity", label: "Activity", icon: Activity },
];

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "XB";
}

function formatDate(value: string) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAccountType(profile: ProfileState) {
  if (profile.authProvider === "EMAIL_AND_GOOGLE") return "Email + Google";
  if (profile.authProvider === "GOOGLE") return "Google";
  return "Email + Password";
}

function colorValue(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function componentToHex(value: number) {
  return value.toString(16).padStart(2, "0");
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${componentToHex(red)}${componentToHex(green)}${componentToHex(blue)}`;
}

function colorDistance(first: number[], second: number[]) {
  return Math.sqrt(
    (first[0] - second[0]) ** 2 +
    (first[1] - second[1]) ** 2 +
    (first[2] - second[2]) ** 2,
  );
}

async function extractBrandColors(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Logo color extraction failed."));
      img.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    const maxSize = 80;
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas is unavailable.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const buckets = new Map<string, { count: number; rgb: [number, number, number] }>();

    for (let index = 0; index < pixels.length; index += 16) {
      const alpha = pixels[index + 3];
      if (alpha < 160) continue;

      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const brightness = (red + green + blue) / 3;
      if (brightness > 242 || brightness < 18) continue;

      const bucket: [number, number, number] = [
        Math.round(red / 24) * 24,
        Math.round(green / 24) * 24,
        Math.round(blue / 24) * 24,
      ];
      const key = bucket.join(",");
      const current = buckets.get(key);
      buckets.set(key, {
        count: (current?.count ?? 0) + 1,
        rgb: bucket,
      });
    }

    const ranked = [...buckets.values()]
      .sort((first, second) => second.count - first.count)
      .map((item) => item.rgb);

    if (ranked.length === 0) return null;

    const chosen: Array<[number, number, number]> = [];
    for (const color of ranked) {
      if (chosen.every((existing) => colorDistance(color, existing) > 70)) {
        chosen.push(color);
      }
      if (chosen.length === 3) break;
    }

    const [primary = [14, 165, 233], secondary = [15, 23, 42], accent = [34, 197, 94]] = chosen;
    return {
      accentColor: rgbToHex(accent[0], accent[1], accent[2]),
      primaryColor: rgbToHex(primary[0], primary[1], primary[2]),
      secondaryColor: rgbToHex(secondary[0], secondary[1], secondary[2]),
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function requestJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>{children}</section>;
}

function CardHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof User;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function SettingsClient({
  activeSessionId,
  initialActiveTab = "profile",
  initialActivity,
  initialCompany,
  initialPreferences,
  initialProfile,
  initialSessions,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialActiveTab);
  const [profile, setProfile] = useState(initialProfile);
  const [company, setCompany] = useState(initialCompany);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [activity, setActivity] = useState(initialActivity);
  const [sessions, setSessions] = useState(initialSessions);
  const [password, setPassword] = useState({
    confirmPassword: "",
    currentPassword: "",
    password: "",
  });
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activityFilter, setActivityFilter] = useState("");
  const [isPending, startTransition] = useTransition();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const filteredActivity = useMemo(
    () =>
      activity.filter((item) =>
        activityFilter ? item.action.toLowerCase().includes(activityFilter.toLowerCase()) : true,
      ),
    [activity, activityFilter],
  );

  function submitProfile() {
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await requestJson<{ user: Partial<ProfileState> }>("/api/account/profile", {
          body: JSON.stringify(profile),
          method: "PATCH",
        });
        setProfile((current) => ({ ...current, ...result.user }));
        setNotice({ type: "success", text: "Profile updated." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Update failed." });
      }
    });
  }

  function submitCompany() {
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await requestJson<{ company: CompanyState }>("/api/account/company", {
          body: JSON.stringify(company),
          method: "PATCH",
        });
        setCompany((current) => ({ ...current, ...result.company }));
        setNotice({ type: "success", text: "Company settings updated." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Update failed." });
      }
    });
  }

  function submitPreferences() {
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await requestJson<{ preferences: PreferencesState }>("/api/account/preferences", {
          body: JSON.stringify(preferences),
          method: "PATCH",
        });
        setPreferences(result.preferences);
        setNotice({ type: "success", text: "Preferences saved." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Update failed." });
      }
    });
  }

  function submitPassword() {
    setNotice(null);
    startTransition(async () => {
      try {
        await requestJson<{ ok: true }>("/api/account/password", {
          body: JSON.stringify(password),
          method: "POST",
        });
        setPassword({ confirmPassword: "", currentPassword: "", password: "" });
        setNotice({ type: "success", text: "Password changed. Other sessions were revoked." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Password change failed." });
      }
    });
  }

  async function uploadFile(kind: "avatar" | "company-cover" | "company-logo", file: File) {
    const form = new FormData();
    form.set("file", file);
    const response = await fetch(`/api/account/${kind}`, { body: form, method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Upload failed.");
    return body as { avatarUrl?: string; logoUrl?: string };
  }

  function uploadAvatar(file: File | undefined) {
    if (!file) return;
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await uploadFile("avatar", file);
        setProfile((current) => ({ ...current, avatarUrl: result.avatarUrl ?? "" }));
        setNotice({ type: "success", text: "Profile photo updated." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Upload failed." });
      }
    });
  }

  function uploadLogo(file: File | undefined) {
    if (!file) return;
    setNotice(null);
    startTransition(async () => {
      try {
        const suggestedColors = await extractBrandColors(file).catch(() => null);
        const result = await uploadFile("company-logo", file);
        setCompany((current) => ({
          ...current,
          ...(suggestedColors ?? {}),
          logoUrl: result.logoUrl ?? "",
        }));
        setNotice({
          type: "success",
          text: suggestedColors
            ? "Company logo updated. Suggested brand colors were applied for preview."
            : "Company logo updated.",
        });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Upload failed." });
      }
    });
  }

  function uploadCover(file: File | undefined) {
    if (!file) return;
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await uploadFile("company-cover", file) as { coverImageUrl?: string };
        setCompany((current) => ({ ...current, coverImageUrl: result.coverImageUrl ?? "" }));
        setNotice({ type: "success", text: "Company cover image updated." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Upload failed." });
      }
    });
  }

  function deleteImage(kind: "avatar" | "company-cover" | "company-logo") {
    setNotice(null);
    startTransition(async () => {
      try {
        await fetch(`/api/account/${kind}`, { method: "DELETE" });
        if (kind === "avatar") setProfile((current) => ({ ...current, avatarUrl: "" }));
        else if (kind === "company-cover") setCompany((current) => ({ ...current, coverImageUrl: "" }));
        else setCompany((current) => ({ ...current, logoUrl: "" }));
        setNotice({ type: "success", text: "Image removed." });
      } catch {
        setNotice({ type: "error", text: "Image removal failed." });
      }
    });
  }

  function revokeSession(id: string) {
    startTransition(async () => {
      await fetch(`/api/account/sessions/${id}`, { method: "DELETE" });
      setSessions((current) =>
        current.map((item) =>
          item.id === id ? { ...item, revokedAt: new Date().toISOString() } : item,
        ),
      );
    });
  }

  function revokeAllSessions() {
    startTransition(async () => {
      await fetch("/api/account/sessions", { method: "DELETE" });
      const now = new Date().toISOString();
      setSessions((current) => current.map((item) => ({ ...item, revokedAt: now })));
      setNotice({ type: "success", text: "All sessions were revoked. Sign in again to continue." });
    });
  }

  function connectGoogle() {
    setNotice(null);
    startTransition(async () => {
      const result = await googleSignInAction("/settings");
      if (result?.error) setNotice({ type: "error", text: result.error });
    });
  }

  function disconnectGoogle() {
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await requestJson<{
          authProvider: string;
          googleConnected: boolean;
        }>("/api/account/oauth/google", {
          method: "DELETE",
        });
        setProfile((current) => ({
          ...current,
          authProvider: result.authProvider,
          googleConnected: result.googleConnected,
        }));
        setNotice({ type: "success", text: "Google account disconnected." });
      } catch (error) {
        setNotice({
          type: "error",
          text: error instanceof Error ? error.message : "Google disconnect failed.",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
            Account settings
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Profile and account
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Manage your identity, company details, security, preferences, and account activity.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sm font-bold text-sky-700">
              XB
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900">{company.name || "Company"}</p>
            <p className="text-xs text-slate-500">{profile.email}</p>
          </div>
        </div>
      </div>

      {notice ? (
        <Alert variant={notice.type === "success" ? "success" : "error"}>{notice.text}</Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition",
                  activeTab === tab.id
                    ? "bg-sky-50 text-sky-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </aside>

        <div className="space-y-6">
          {activeTab === "profile" ? (
            <Card>
              <CardHeader
                description="Update how your name, role, and contact details appear in XAI Books."
                icon={User}
                title="Personal information"
              />
              <div className="space-y-6 p-5">
                <div className="flex flex-wrap items-center gap-4">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="h-24 w-24 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-sky-100 text-2xl font-bold text-sky-700">
                      {initials(profile.firstName, profile.lastName)}
                    </div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-slate-900">Profile photo</p>
                      <p className="text-sm text-slate-500">JPG, PNG, or WEBP. Maximum 5MB.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={(event) => uploadAvatar(event.target.files?.[0])}
                      />
                      <Button type="button" onClick={() => avatarInputRef.current?.click()}>
                        <Camera className="h-4 w-4" /> Replace
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => deleteImage("avatar")}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="First name" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
                  <Input label="Last name" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
                  <Input label="Display name" value={profile.displayName} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} />
                  <Input label="Username" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
                  <Input label="Email address" value={profile.email} disabled hint="Email changes require a separate verification flow." />
                  <Input label="Phone number" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                  <Input label="Job title" value={profile.jobTitle} onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })} />
                  <Input label="Role" value={profile.role} disabled />
                </div>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Bio</span>
                  <textarea
                    value={profile.bio}
                    onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
                    className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
                  />
                </label>
                <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-4">
                  <div><span className="text-slate-500">Status</span><p className="font-semibold">{profile.accountStatus}</p></div>
                  <div><span className="text-slate-500">Date joined</span><p className="font-semibold">{formatDate(profile.createdAt)}</p></div>
                  <div><span className="text-slate-500">Last login</span><p className="font-semibold">{formatDate(profile.lastLoginAt)}</p></div>
                  <div><span className="text-slate-500">Account type</span><p className="font-semibold">{formatAccountType(profile)}</p></div>
                </div>
                <Button loading={isPending} onClick={submitProfile}>Save profile</Button>
              </div>
            </Card>
          ) : null}

          {activeTab === "company" ? (
            <Card>
              <CardHeader
                description="Company details used across invoices, settings, and the application header."
                icon={Building2}
                title="Company information"
              />
              <div className="space-y-6 p-5">
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900">Timeline image</p>
                    <p className="text-sm text-slate-500">JPG, PNG, or WEBP. Recommended wide image, maximum 5MB.</p>
                  </div>
                  <div className="relative min-h-44 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {company.coverImageUrl ? (
                      <img src={company.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f172a_0%,#0284c7_55%,#22c55e_100%)]" />
                    )}
                    <div className="absolute inset-0 bg-slate-950/20" />
                    <div className="relative flex min-h-44 items-end justify-between gap-4 p-5 text-white">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-white/75">Company timeline</p>
                        <p className="mt-1 text-xl font-bold">{company.name || "Company workspace"}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          hidden
                          onChange={(event) => uploadCover(event.target.files?.[0])}
                        />
                        <Button type="button" variant="secondary" onClick={() => coverInputRef.current?.click()}>
                          Replace cover
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => deleteImage("company-cover")}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                    {company.logoUrl ? <img src={company.logoUrl} alt="" className="max-h-20 max-w-20 object-contain" /> : <ImageIcon className="h-8 w-8 text-slate-400" />}
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500">PNG, JPG, or SVG. Maximum 5MB.</p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        hidden
                        onChange={(event) => uploadLogo(event.target.files?.[0])}
                      />
                      <Button type="button" onClick={() => logoInputRef.current?.click()}>
                        Upload logo
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => deleteImage("company-logo")}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Company name" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
                  <Input label="Website" value={company.website} onChange={(e) => setCompany({ ...company, website: e.target.value })} />
                  <Input label="Email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
                  <Input label="Phone" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
                  <Input label="Address" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
                  <Input label="City" value={company.city} onChange={(e) => setCompany({ ...company, city: e.target.value })} />
                  <Input label="Country" value={company.country} onChange={(e) => setCompany({ ...company, country: e.target.value })} />
                  <Input label="Tax Registration Number" value={company.taxNumber} onChange={(e) => setCompany({ ...company, taxNumber: e.target.value })} />
                  <Input label="Currency" value={company.currency} onChange={(e) => setCompany({ ...company, currency: e.target.value.toUpperCase() })} />
                  <Input label="Time zone" value={company.timezone} onChange={(e) => setCompany({ ...company, timezone: e.target.value })} />
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">Branding</p>
                    <p className="text-sm text-slate-500">Choose company colors used across navigation, buttons, links, reports, and templates.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      ["primaryColor", "Primary color", "#0ea5e9"],
                      ["secondaryColor", "Secondary color", "#0f172a"],
                      ["accentColor", "Accent color", "#22c55e"],
                    ].map(([key, label, fallback]) => (
                      <div key={key} className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">{label}</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={colorValue(company[key as keyof CompanyState], fallback)}
                            onChange={(event) => setCompany({ ...company, [key]: event.target.value })}
                            className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1"
                            aria-label={label}
                          />
                          <Input
                            value={company[key as keyof CompanyState]}
                            onChange={(event) => setCompany({ ...company, [key]: event.target.value })}
                            className="font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    className="overflow-hidden rounded-xl border border-white bg-white shadow-sm"
                    style={{
                      "--preview-primary": colorValue(company.primaryColor, "#0ea5e9"),
                      "--preview-secondary": colorValue(company.secondaryColor, "#0f172a"),
                      "--preview-accent": colorValue(company.accentColor, "#22c55e"),
                    } as CSSProperties}
                  >
                    <div className="flex items-center justify-between bg-[var(--preview-secondary)] px-4 py-3 text-white">
                      <span className="font-semibold">{company.name || "Company"}</span>
                      <span className="rounded-full bg-[var(--preview-accent)] px-2 py-1 text-xs font-bold text-white">Active</span>
                    </div>
                    <div className="flex items-center gap-3 p-4">
                      <button type="button" className="rounded-lg bg-[var(--preview-primary)] px-3 py-2 text-sm font-semibold text-white">Primary action</button>
                      <span className="text-sm font-semibold text-[var(--preview-primary)]">Preview link</span>
                    </div>
                  </div>
                </div>
                <Button loading={isPending} onClick={submitCompany}>Save company</Button>
              </div>
            </Card>
          ) : null}

          {activeTab === "security" ? (
            <div className="space-y-6">
              <Card>
                <CardHeader description="Control how you sign in to XAI Books." icon={Shield} title="Authentication methods" />
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">
                          {initials(profile.firstName, profile.lastName)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-950">Google account</p>
                        <p className="text-sm text-slate-500">
                          {profile.googleConnected ? "Google Connected" : "Google Not Connected"}
                        </p>
                      </div>
                    </div>
                    {profile.googleConnected ? (
                      <Button type="button" variant="secondary" onClick={disconnectGoogle} loading={isPending}>
                        Disconnect Google
                      </Button>
                    ) : (
                      <Button type="button" onClick={connectGoogle}>
                        Connect Google Account
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-3">
                    <div>
                      <span className="text-slate-500">Account Type</span>
                      <p className="font-semibold text-slate-900">{formatAccountType(profile)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Email password</span>
                      <p className="font-semibold text-slate-900">
                        {profile.passwordLoginEnabled ? "Enabled" : "Not set"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Provider</span>
                      <p className="font-semibold text-slate-900">{profile.authProvider.replaceAll("_", " ")}</p>
                    </div>
                  </div>
                </div>
              </Card>
              <Card>
                <CardHeader description="Change your password and protect your account." icon={KeyRound} title="Password management" />
                <div className="space-y-4 p-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Input label="Current password" type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} />
                    <Input label="New password" type="password" value={password.password} onChange={(e) => setPassword({ ...password, password: e.target.value })} />
                    <Input label="Confirm password" type="password" value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} />
                  </div>
                  {password.password ? <PasswordStrength password={password.password} /> : null}
                  <Button loading={isPending} onClick={submitPassword}>Change password</Button>
                </div>
              </Card>
              <Card>
                <CardHeader description="Review active sessions and revoke access." icon={Shield} title="Security settings" />
                <div className="space-y-4 p-5">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-900">Two-factor authentication</p>
                    <p className="mt-1 text-sm text-amber-800">Placeholder ready. SMS/authenticator setup will be enabled in a later security phase.</p>
                  </div>
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold">Active sessions</p>
                      <p className="text-sm text-slate-500">Last login: {formatDate(profile.lastLoginAt)}</p>
                    </div>
                    <Button variant="danger" onClick={revokeAllSessions}>Sign out all devices</Button>
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {sessions.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                        <div>
                          <p className="font-semibold text-slate-900">{item.userAgent ?? "Unknown device"}</p>
                          <p className="text-slate-500">IP {item.ip ?? "unknown"} · Last seen {formatDate(item.lastSeenAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", item.revokedAt ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700")}>
                            {item.revokedAt ? "Revoked" : item.id === activeSessionId ? "Current" : "Active"}
                          </span>
                          {!item.revokedAt && item.id !== activeSessionId ? (
                            <Button size="sm" variant="secondary" onClick={() => revokeSession(item.id)}>Revoke</Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          ) : null}

          {activeTab === "preferences" ? (
            <Card>
              <CardHeader description="Control localization and display defaults." icon={Monitor} title="Account preferences" />
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-slate-700">Theme<select className="h-10 w-full rounded-xl border border-slate-200 px-3" value={preferences.theme} onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as PreferencesState["theme"] })}><option value="LIGHT">Light</option><option value="DARK">Dark</option><option value="SYSTEM">System</option></select></label>
                <Input label="Language" value={preferences.language} onChange={(e) => setPreferences({ ...preferences, language: e.target.value })} />
                <label className="space-y-1.5 text-sm font-medium text-slate-700">Date format<select className="h-10 w-full rounded-xl border border-slate-200 px-3" value={preferences.dateFormat} onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}><option value="dd/MM/yyyy">dd/MM/yyyy</option><option value="MM/dd/yyyy">MM/dd/yyyy</option><option value="yyyy-MM-dd">yyyy-MM-dd</option></select></label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">Time format<select className="h-10 w-full rounded-xl border border-slate-200 px-3" value={preferences.timeFormat} onChange={(e) => setPreferences({ ...preferences, timeFormat: e.target.value as PreferencesState["timeFormat"] })}><option value="24h">24 hour</option><option value="12h">12 hour</option></select></label>
                <Input label="Currency" value={preferences.currency} onChange={(e) => setPreferences({ ...preferences, currency: e.target.value.toUpperCase() })} />
                <div className="md:col-span-2"><Button loading={isPending} onClick={submitPreferences}>Save preferences</Button></div>
              </div>
            </Card>
          ) : null}

          {activeTab === "activity" ? (
            <Card>
              <CardHeader description="Track account, login, profile, and security events." icon={Clock} title="Account activity" />
              <div className="space-y-4 p-5">
                <Input label="Filter by action" placeholder="LOGIN, PROFILE, PASSWORD..." value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} />
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {filteredActivity.map((item) => (
                    <div key={item.id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_180px_140px]">
                      <div className="flex items-center gap-2 font-semibold text-slate-900"><CheckCircle2 className="h-4 w-4 text-sky-500" />{item.action.replaceAll("_", " ")}</div>
                      <div className="text-slate-500">{item.ip ?? "No IP"}</div>
                      <div className="text-slate-500">{formatDate(item.createdAt)}</div>
                    </div>
                  ))}
                  {filteredActivity.length === 0 ? <p className="p-4 text-sm text-slate-500">No activity found.</p> : null}
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
