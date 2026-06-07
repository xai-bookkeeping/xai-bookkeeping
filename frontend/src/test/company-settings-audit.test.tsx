import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    sessionId: "sess_settings_audit",
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

const companyResponse = {
  created_at: "2026-06-07T10:00:00Z",
  id: "org_workspace",
  image_url: null,
  is_active: true,
  name: "Workspace Company LLC",
  slug: "workspace-company-llc",
  updated_at: "2026-06-07T10:00:00Z",
} as const;

let settingsResponse: {
  business_activity: string | null;
  default_currency: string;
  default_vat_rate: string;
  legal_name: string;
  registered_address: string | null;
  trn: string | null;
  vat_registration_status: "not_registered" | "registered";
};

let denySettingsUpdate = false;
let auditMode: "denied" | "empty" | "populated" = "populated";
let auditEventsResponse: {
  events: Array<{
    action: string;
    actor_clerk_user_id: string | null;
    after_state: Record<string, unknown> | null;
    before_state: Record<string, unknown> | null;
    company_id: string;
    created_at: string;
    entity_id: string;
    entity_type: string;
    id: number;
    session_id: string | null;
  }>;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function renderRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createTestRouter([path])} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  authState.isLoaded = true;
  authState.isSignedIn = true;
  authState.orgId = "org_workspace";
  denySettingsUpdate = false;
  auditMode = "populated";
  settingsResponse = {
    business_activity: "General trading",
    default_currency: "AED",
    default_vat_rate: "5.00",
    legal_name: "Workspace Company LLC",
    registered_address: "Dubai Marina, Dubai, UAE",
    trn: "100123456700003",
    vat_registration_status: "registered",
  };
  auditEventsResponse = {
    events: [
      {
        action: "company.settings_updated",
        actor_clerk_user_id: "user_owner",
        after_state: { legal_name: "Workspace Company Holdings LLC" },
        before_state: { legal_name: "Workspace Company LLC" },
        company_id: "org_workspace",
        created_at: "2026-06-07T10:15:00Z",
        entity_id: "org_workspace",
        entity_type: "company",
        id: 21,
        session_id: "sess_settings",
      },
      {
        action: "team.member_removed",
        actor_clerk_user_id: "user_owner",
        after_state: { status: "removed" },
        before_state: { role: "viewer", status: "active" },
        company_id: "org_workspace",
        created_at: "2026-06-07T09:40:00Z",
        entity_id: "user_member",
        entity_type: "membership",
        id: 19,
        session_id: "sess_team",
      },
    ],
  };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url, "http://localhost:5173");

      if (url.pathname === "/api/api/v1/companies/org_workspace" && request.method === "GET") {
        return jsonResponse(companyResponse);
      }

      if (url.pathname === "/api/api/v1/companies/org_workspace/settings" && request.method === "GET") {
        return jsonResponse(settingsResponse);
      }

      if (url.pathname === "/api/api/v1/companies/org_workspace/settings" && request.method === "PATCH") {
        if (denySettingsUpdate) {
          return jsonResponse(
            { detail: "You do not have permission to do that in Workspace Company LLC." },
            403,
          );
        }

        const body = (await request.json()) as typeof settingsResponse;
        settingsResponse = {
          ...settingsResponse,
          ...body,
        };
        return jsonResponse(settingsResponse);
      }

      if (url.pathname === "/api/api/v1/companies/org_workspace/audit-events" && request.method === "GET") {
        if (auditMode === "denied") {
          return jsonResponse(
            { detail: "You do not have permission to do that in Workspace Company LLC." },
            403,
          );
        }

        if (auditMode === "empty") {
          return jsonResponse({ events: [] });
        }

        return jsonResponse(auditEventsResponse);
      }

      throw new Error(`Unexpected request: ${request.method} ${url.pathname}`);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("company settings screen loads UAE defaults and saves changes through typed endpoints", async () => {
  renderRoute("/workspace/settings");

  expect(await screen.findByRole("heading", { name: /company settings/i })).toBeTruthy();
  expect((screen.getByLabelText(/legal name/i) as HTMLInputElement).value).toBe("Workspace Company LLC");
  expect((screen.getByLabelText(/default currency/i) as HTMLInputElement).value).toBe("AED");
  expect(screen.getByDisplayValue("registered")).toBeTruthy();

  fireEvent.change(screen.getByLabelText(/legal name/i), {
    target: { value: "Workspace Company Holdings LLC" },
  });
  fireEvent.change(screen.getByLabelText(/business activity/i), {
    target: { value: "Business consultancy" },
  });
  fireEvent.change(screen.getByLabelText(/trn/i), {
    target: { value: "100123456700004" },
  });
  fireEvent.change(screen.getByLabelText(/registered address/i), {
    target: { value: "JLT, Dubai, UAE" },
  });
  fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

  expect(await screen.findByText(/company settings saved\./i)).toBeTruthy();
  expect((screen.getByLabelText(/legal name/i) as HTMLInputElement).value).toBe(
    "Workspace Company Holdings LLC",
  );
});

test("company settings screen surfaces permission-denied save feedback", async () => {
  denySettingsUpdate = true;

  renderRoute("/workspace/settings");

  expect(await screen.findByRole("heading", { name: /company settings/i })).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/legal name/i), {
    target: { value: "Blocked Update LLC" },
  });
  fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

  expect(
    await screen.findByText(/you do not have permission to do that in workspace company llc\./i),
  ).toBeTruthy();
});

test("audit screen renders populated history and a disabled export affordance", async () => {
  renderRoute("/workspace/audit");

  expect(await screen.findByRole("heading", { name: /activity & audit log/i })).toBeTruthy();
  expect(screen.getByText(/company\.settings_updated/i)).toBeTruthy();
  expect(screen.getByText(/team\.member_removed/i)).toBeTruthy();
  expect((screen.getByRole("button", { name: /export log/i }) as HTMLButtonElement).disabled).toBe(true);
});

test("audit screen renders the approved empty state", async () => {
  auditMode = "empty";
  renderRoute("/workspace/audit");

  expect(await screen.findByText(/no activity recorded yet/i)).toBeTruthy();
});

test("audit screen renders a calm denied state when access is forbidden", async () => {
  auditMode = "denied";
  renderRoute("/workspace/audit");

  expect(await screen.findByRole("heading", { name: /activity & audit log/i })).toBeTruthy();
  expect(
    screen.getByText(/you do not have permission to do that in workspace company llc\./i),
  ).toBeTruthy();
});
