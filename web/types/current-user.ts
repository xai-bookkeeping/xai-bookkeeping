export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  selectedRole?: string;
  assignedRoles?: string[];
  companyName: string;
  image?: string | null;
  authProvider?: "CLERK";
};

export type CurrentUserSession = {
  user: CurrentUser;
  activeSessionId?: string;
  remember?: boolean;
  onboardingRequired?: boolean;
  sessionExpired?: boolean;
  sessionExpiresAt?: string;
};
