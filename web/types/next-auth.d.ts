import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    companyName: string;
    avatarUrl?: string;
    authProvider?: string;
    onboardingRequired?: boolean;
    remember?: boolean;
    activeSessionId?: string;
    sessionVersion?: number;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      companyName: string;
      image?: string | null;
      authProvider?: string;
    };
    activeSessionId?: string;
    remember?: boolean;
    onboardingRequired?: boolean;
    sessionExpired?: boolean;
    sessionExpiresAt?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    companyName: string;
    avatarUrl?: string;
    authProvider?: string;
    onboardingRequired?: boolean;
    remember?: boolean;
    activeSessionId?: string;
    sessionVersion?: number;
    sessionExpiresAt?: number;
    sessionExpired?: boolean;
  }
}
