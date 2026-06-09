import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createTestRouter } from "@/app/router";

type AuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  orgId: string | null;
};

type CompanyRecord = {
  created_at: string;
  id: string;
  image_url: null | string;
  is_active: boolean;
  name: string;
  slug: string;
  updated_at: string;
};

type CompanyErrorRecord = {
  detail: string;
  status: number;
};

type BootstrapScenario = "pending" | "ready";

const authState: AuthState = {
  isLoaded: true,
  isSignedIn: true,
  orgId: "org_workspace",
};

const organizations = [
  {
    businessActivity: "General trading",
    id: "org_workspace",
    name: "Workspace Company LLC",
  },
];

const companyResponses = new Map<string, CompanyRecord | CompanyErrorRecord>([
  [
    "org_workspace",
    {
      created_at: "2026-06-04T10:00:00Z",
      id: "org_workspace",
      image_url: null,
      is_active: true,
      name: "Workspace Company LLC",
      slug: "workspace-company-llc",
      updated_at: "2026-06-04T10:00:00Z",
    },
  ],
]);

const signInMock = vi.fn();
const signUpMock = vi.fn();
const createOrganization = vi.fn();
const setActive = vi.fn();

let bootstrapScenario: BootstrapScenario = "ready";
let latestProbe: null | {
  created_at: string;
  id: number;
  source: string;
  status: "completed";
  updated_at: string;
} = null;
const capturedRequests: Array<{ method: string; pathname: string }> = [];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

function bootstrapReady(companyId: string) {
  const company = companyResponses.get(companyId);

  return {
    active_organization_id: companyId,
    company:
      company && "status" in company
        ? null
        : company ??
          ({
            created_at: "2026-06-04T10:00:00Z",
            id: companyId,
            image_url: null,
            is_active: true,
            name: "Ready Company LLC",
            slug: "ready-company-llc",
            updated_at: "2026-06-04T10:00:00Z",
          } satisfies CompanyRecord),
    membership_role: "owner",
    status: "ready" as const,
  };
}

function bootstrapPending(companyId: string) {
  return {
    active_organization_id: companyId,
    company: null,
    membership_role: null,
    status: "company_context_pending" as const,
  };
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createTestRouter(["/workspace"])} />
    </QueryClientProvider>,
  );

  return { queryClient };
}

vi.mock("@clerk/react", () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignIn: () => <div />,
  SignedIn: ({ children }: { children: ReactNode }) => (authState.isSignedIn ? <>{children}</> : null),
  SignedOut: ({ children }: { children: ReactNode }) => (!authState.isSignedIn ? <>{children}</> : null),
  useAuth: () => ({
    isLoaded: authState.isLoaded,
    isSignedIn: authState.isSignedIn,
    orgId: authState.orgId,
    sessionId: authState.isSignedIn ? "sess_workspace" : null,
    userId: authState.isSignedIn ? "user_workspace" : null,
  }),
  useOrganization: () => ({
    isLoaded: authState.isLoaded,
    organization:
      authState.orgId === null
        ? null
        : {
            id: authState.orgId,
            name: organizations[0].name,
            publicMetadata: {
              businessActivity: organizations[0].businessActivity,
            },
          },
  }),
  useOrganizationList: () => ({
    createOrganization,
    isLoaded: authState.isLoaded && authState.isSignedIn,
    setActive,
    userMemberships: {
      data: organizations.map((organization) => ({
        organization: {
          id: organization.id,
          name: organization.name,
          publicMetadata: {
            businessActivity: organization.businessActivity,
          },
        },
      })),
    },
  }),
}));

beforeEach(() => {
  authState.isLoaded = true;
  authState.isSignedIn = true;
  authState.orgId = "org_workspace";
  bootstrapScenario = "ready";
  latestProbe = null;
  capturedRequests.length = 0;
  companyResponses.set("org_workspace", {
    created_at: "2026-06-04T10:00:00Z",
    id: "org_workspace",
    image_url: null,
    is_active: true,
    name: "Workspace Company LLC",
    slug: "workspace-company-llc",
    updated_at: "2026-06-04T10:00:00Z",
  });
  signInMock.mockClear();
  signUpMock.mockClear();
  createOrganization.mockClear();
  setActive.mockClear();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url, "http://localhost:5173");

      capturedRequests.push({
        method: request.method,
        pathname: url.pathname,
      });

      if (url.pathname === "/health" && request.method === "GET") {
        return jsonResponse({
          application: {
            environment: "test",
            name: "XAI Books API",
            version: "0.1.0",
          },
          database: {
            configured: true,
            database: "xai_books",
            driver: "postgresql+psycopg",
            host: "postgres",
            status: "configured",
          },
          status: "ok",
        });
      }

      if (url.pathname === "/api/v1/auth/bootstrap" && request.method === "GET") {
        if (!authState.orgId) {
          return jsonResponse({
            active_organization_id: null,
            company: null,
            membership_role: null,
            status: "no_active_company",
          });
        }

        return jsonResponse(
          bootstrapScenario === "pending"
            ? bootstrapPending(authState.orgId)
            : bootstrapReady(authState.orgId),
        );
      }

      if (url.pathname === "/api/v1/companies/org_workspace" && request.method === "GET") {
        const company = companyResponses.get("org_workspace");

        if (!company) {
          return jsonResponse({ detail: "Not found" }, 404);
        }

        if ("status" in company) {
          return jsonResponse({ detail: company.detail }, company.status);
        }

        return jsonResponse(company);
      }

      if (url.pathname === "/workspace-probe/latest" && request.method === "GET") {
        if (latestProbe) {
          return jsonResponse(latestProbe);
        }

        return jsonResponse(
          {
            detail: "No workspace probe runs have been recorded",
          },
          404,
        );
      }

      if (url.pathname === "/workspace-probe" && request.method === "POST") {
        const body = (await request.json()) as { source: string; status?: "completed" };

        latestProbe = {
          created_at: "2026-06-04T10:00:00Z",
          id: 42,
          source: body.source,
          status: body.status ?? "completed",
          updated_at: "2026-06-04T10:00:00Z",
        };

        return jsonResponse(latestProbe, 201);
      }

      throw new Error(`Unexpected request: ${request.method} ${url.pathname}`);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("renders the ready workspace shell after the bootstrap contract reports readiness", async () => {
  renderWorkspace();

  expect(await screen.findByRole("heading", { name: /workspace probe/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: /run workspace probe/i })).toBeTruthy();
  expect(await screen.findByText(/api healthy/i)).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /run workspace probe/i }));

  await waitFor(() => {
    expect(screen.getByText(/workspace-shell/i)).toBeTruthy();
  });

  expect(screen.getByText(/probe status/i)).toBeTruthy();
  expect(screen.getByText(/completed at/i)).toBeTruthy();
  expect(screen.getByText(/record id/i)).toBeTruthy();
  expect(capturedRequests.some((request) => request.pathname === "/api/v1/auth/bootstrap")).toBe(true);
  expect(capturedRequests.some((request) => request.pathname === "/api/v1/companies/org_workspace")).toBe(
    true,
  );
});

test("shows the setup handoff when bootstrap returns company_context_pending", async () => {
  bootstrapScenario = "pending";

  renderWorkspace();

  expect(await screen.findByRole("heading", { name: /we're finishing your company workspace/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: /check readiness/i })).toBeTruthy();
  expect(screen.getByRole("link", { name: /continue company setup/i })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: /workspace probe/i })).toBeNull();
  expect(capturedRequests.some((request) => request.pathname === "/api/v1/companies/org_workspace")).toBe(
    false,
  );
});

test("shows the forbidden company state when bootstrap is ready but the company lookup is denied", async () => {
  companyResponses.set("org_workspace", {
    detail: "You do not have access to this company",
    status: 403,
  });

  renderWorkspace();

  expect(await screen.findByRole("heading", { name: /you do not have access to this company/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: /switch company/i })).toBeTruthy();
  expect(screen.getByRole("link", { name: /back to workspace/i })).toBeTruthy();
  expect(capturedRequests.some((request) => request.pathname === "/api/v1/companies/org_workspace")).toBe(
    true,
  );
});
