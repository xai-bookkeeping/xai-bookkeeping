import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createTestRouter } from "@/app/router";

const authState = {
  isLoaded: true,
  isSignedIn: true,
  orgId: "org_workspace",
};

vi.mock("@clerk/react", () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignIn: () => <div />,
  SignedIn: ({ children }: { children: ReactNode }) => (authState.isSignedIn ? <>{children}</> : null),
  SignedOut: ({ children }: { children: ReactNode }) => (!authState.isSignedIn ? <>{children}</> : null),
  useAuth: () => ({
    isLoaded: authState.isLoaded,
    isSignedIn: authState.isSignedIn,
    orgId: authState.orgId,
    sessionId: "sess_team_roles",
    userId: "user_owner",
  }),
  useOrganization: () => ({
    isLoaded: true,
    organization: {
      id: "org_workspace",
      name: "Workspace Company LLC",
      publicMetadata: {
        businessActivity: "General trading",
      },
    },
  }),
  useOrganizationList: () => ({
    createOrganization: vi.fn(),
    isLoaded: true,
    setActive: vi.fn(),
    userMemberships: {
      data: [
        {
          organization: {
            id: "org_workspace",
            name: "Workspace Company LLC",
            publicMetadata: {
              businessActivity: "General trading",
            },
          },
        },
      ],
    },
  }),
}));

type TeamDirectory = {
  members: Array<{
    clerk_membership_id: string;
    clerk_user_id: string;
    email_address: string | null;
    is_current_user: boolean;
    last_active_at: string | null;
    name: string;
    role: "accountant" | "admin" | "owner" | "viewer";
    role_description: string;
    role_label: string;
    status: string;
  }>;
  pending_invites: Array<{
    created_at: string | null;
    email_address: string;
    id: string;
    role: "accountant" | "admin" | "owner" | "viewer";
    role_description: string;
    role_label: string;
    status: string;
  }>;
  permissions: {
    can_change_roles: boolean;
    can_invite_members: boolean;
    can_remove_members: boolean;
  };
};

const companyResponse = {
  created_at: "2026-06-07T10:00:00Z",
  id: "org_workspace",
  image_url: null,
  is_active: true,
  name: "Workspace Company LLC",
  slug: "workspace-company-llc",
  updated_at: "2026-06-07T10:00:00Z",
} as const;

const defaultTeamDirectory = (): TeamDirectory => ({
  members: [
    {
      clerk_membership_id: "mem_owner",
      clerk_user_id: "user_owner",
      email_address: "owner@example.com",
      is_current_user: true,
      last_active_at: "2026-06-07T09:30:00Z",
      name: "Aisha Owner",
      role: "owner",
      role_description: "Full company access, including billing and company management.",
      role_label: "Owner",
      status: "active",
    },
    {
      clerk_membership_id: "mem_member",
      clerk_user_id: "user_member",
      email_address: "member@example.com",
      is_current_user: false,
      last_active_at: "2026-06-07T09:00:00Z",
      name: "Mariam Noor",
      role: "viewer",
      role_description: "Can view records and reports but cannot make changes.",
      role_label: "Viewer",
      status: "active",
    },
  ],
  pending_invites: [
    {
      created_at: "2026-06-07T08:00:00Z",
      email_address: "pending@example.com",
      id: "inv_pending_1",
      role: "viewer",
      role_description: "Can view records and reports but cannot make changes.",
      role_label: "Viewer",
      status: "pending",
    },
  ],
  permissions: {
    can_change_roles: true,
    can_invite_members: true,
    can_remove_members: true,
  },
});

let teamDirectory: TeamDirectory;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function renderTeamRoute() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createTestRouter(["/workspace/team"])} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  authState.isLoaded = true;
  authState.isSignedIn = true;
  authState.orgId = "org_workspace";
  teamDirectory = defaultTeamDirectory();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url, "http://localhost:5173");

      if (url.pathname === "/api/api/v1/companies/org_workspace" && request.method === "GET") {
        return jsonResponse(companyResponse);
      }

      if (url.pathname === "/api/api/v1/companies/org_workspace/team" && request.method === "GET") {
        return jsonResponse(teamDirectory);
      }

      if (url.pathname === "/api/api/v1/companies/org_workspace/team/invitations" && request.method === "POST") {
        const body = (await request.json()) as {
          email_address: string;
          message?: string | null;
          role?: "accountant" | "admin" | "owner" | "viewer";
        };
        const invite = {
          created_at: "2026-06-07T10:15:00Z",
          email_address: body.email_address,
          id: "inv_created_1",
          role: body.role ?? "viewer",
          role_description:
            body.role === "accountant"
              ? "Can work with finance records, reports, and audit history."
              : "Can view records and reports but cannot make changes.",
          role_label: body.role === "accountant" ? "Accountant" : "Viewer",
          status: "pending",
        } as const;
        teamDirectory = {
          ...teamDirectory,
          pending_invites: [...teamDirectory.pending_invites, invite],
        };
        return jsonResponse(invite, 201);
      }

      if (
        url.pathname === "/api/api/v1/companies/org_workspace/team/members/user_member" &&
        request.method === "PATCH"
      ) {
        const body = (await request.json()) as { role: "accountant" | "admin" | "owner" | "viewer" };
        teamDirectory = {
          ...teamDirectory,
          members: teamDirectory.members.map((member) =>
            member.clerk_user_id === "user_member"
              ? {
                  ...member,
                  role: body.role,
                  role_description: "Full company access except billing ownership.",
                  role_label: "Admin",
                }
              : member,
          ),
        };
        return jsonResponse({ status: "accepted" });
      }

      if (
        url.pathname === "/api/api/v1/companies/org_workspace/team/invitations/inv_pending_1" &&
        request.method === "DELETE"
      ) {
        teamDirectory = {
          ...teamDirectory,
          pending_invites: teamDirectory.pending_invites.filter((invite) => invite.id !== "inv_pending_1"),
        };
        return new Response(null, { status: 204 });
      }

      if (
        url.pathname === "/api/api/v1/companies/org_workspace/team/members/user_member" &&
        request.method === "DELETE"
      ) {
        teamDirectory = {
          ...teamDirectory,
          members: teamDirectory.members.filter((member) => member.clerk_user_id !== "user_member"),
        };
        return new Response(null, { status: 204 });
      }

      throw new Error(`Unexpected request: ${request.method} ${url.pathname}`);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("team screen supports invite, role change, member removal, and invite revocation on typed routes", async () => {
  renderTeamRoute();

  expect(await screen.findByRole("heading", { name: /team & roles/i })).toBeTruthy();
  expect(screen.getByText(/invite people, assign access, and keep this company private\./i)).toBeTruthy();
  expect(screen.getAllByText("Owner").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Viewer").length).toBeGreaterThan(0);
  expect(screen.getByText("pending@example.com")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /invite member/i }));
  const inviteDialog = screen.getByRole("dialog", { name: /invite member/i });

  fireEvent.change(within(inviteDialog).getByLabelText(/work email/i), {
    target: { value: "new.accountant@example.com" },
  });
  fireEvent.change(within(inviteDialog).getByLabelText(/^role$/i), {
    target: { value: "accountant" },
  });
  fireEvent.change(within(inviteDialog).getByLabelText(/optional message/i), {
    target: { value: "Please join the finance workspace." },
  });
  fireEvent.click(within(inviteDialog).getByRole("button", { name: /send invitation/i }));

  expect(await screen.findByText(/invitation sent to new\.accountant@example\.com\./i)).toBeTruthy();
  expect(await screen.findByText("new.accountant@example.com")).toBeTruthy();
  expect(screen.getAllByText("Accountant").length).toBeGreaterThan(0);

  fireEvent.change(screen.getByLabelText(/role for mariam noor/i), {
    target: { value: "admin" },
  });

  expect(await screen.findByText(/role updated for mariam noor\./i)).toBeTruthy();
  expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("button", { name: /revoke pending@example\.com/i }));
  await waitFor(() => {
    expect(screen.queryByText("pending@example.com")).toBeNull();
  });

  fireEvent.click(screen.getByRole("button", { name: /remove mariam noor/i }));
  await waitFor(() => {
    expect(screen.queryByText("Mariam Noor")).toBeNull();
  });
});

test("lower-role users see denied-action guidance inside the team screen", async () => {
  teamDirectory = {
    ...defaultTeamDirectory(),
    permissions: {
      can_change_roles: false,
      can_invite_members: false,
      can_remove_members: false,
    },
  };

  renderTeamRoute();

  expect(await screen.findByRole("heading", { name: /team & roles/i })).toBeTruthy();
  expect(
    screen.getByText(/you do not have permission to do that in workspace company llc\./i),
  ).toBeTruthy();
  expect((screen.getByRole("button", { name: /invite member/i }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByLabelText(/role for mariam noor/i) as HTMLSelectElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: /remove mariam noor/i }) as HTMLButtonElement).disabled).toBe(true);
});
