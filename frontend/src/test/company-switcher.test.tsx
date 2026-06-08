import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createTestRouter } from "@/app/router";

type OrganizationRecord = {
  businessActivity: string;
  id: string;
  imageUrl: string | null;
  name: string;
};

const organizations: OrganizationRecord[] = [
  {
    businessActivity: "General trading",
    id: "org_alpha",
    imageUrl: null,
    name: "Alpha Trading LLC",
  },
  {
    businessActivity: "Wholesale distribution",
    id: "org_beta",
    imageUrl: null,
    name: "Beta Holdings LLC",
  },
];

const authState = {
  isLoaded: true,
  isSignedIn: true,
  orgId: organizations[0].id,
};

const setActive = vi.fn(async ({ organization }: { organization: string }) => {
  authState.orgId = organization;
});

const createOrganization = vi.fn();

vi.mock("@clerk/react", () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignIn: () => <div />,
  SignedIn: ({ children }: { children: ReactNode }) => (authState.isSignedIn ? <>{children}</> : null),
  SignedOut: ({ children }: { children: ReactNode }) => (!authState.isSignedIn ? <>{children}</> : null),
  useAuth: () => ({
    isLoaded: authState.isLoaded,
    isSignedIn: authState.isSignedIn,
    orgId: authState.orgId,
    sessionId: authState.isSignedIn ? "sess_company_switcher" : null,
    userId: authState.isSignedIn ? "user_company_switcher" : null,
  }),
  useOrganization: () => ({
    isLoaded: authState.isLoaded,
    organization:
      organizations.find((organization) => organization.id === authState.orgId) ?? null,
  }),
  useOrganizationList: () => ({
    createOrganization,
    isLoaded: authState.isLoaded && authState.isSignedIn,
    setActive,
    userMemberships: {
      data: organizations.map((organization) => ({
        organization: {
          id: organization.id,
          imageUrl: organization.imageUrl,
          name: organization.name,
          publicMetadata: {
            businessActivity: organization.businessActivity,
          },
        },
      })),
    },
  }),
}));

const healthResponse = {
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
} as const;

const companyResponses = new Map<
  string,
  | {
      businessActivity: string;
      id: string;
      image_url: null | string;
      is_active: boolean;
      name: string;
      slug: string;
    }
  | { detail: string; status: number }
>([
  [
    "org_alpha",
    {
      businessActivity: "General trading",
      id: "org_alpha",
      image_url: null,
      is_active: true,
      name: "Alpha Trading LLC",
      slug: "alpha-trading-llc",
    },
  ],
  [
    "org_beta",
    {
      businessActivity: "Wholesale distribution",
      id: "org_beta",
      image_url: null,
      is_active: true,
      name: "Beta Holdings LLC",
      slug: "beta-holdings-llc",
    },
  ],
]);

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

beforeEach(() => {
  authState.isLoaded = true;
  authState.isSignedIn = true;
  authState.orgId = organizations[0].id;
  latestProbe = null;
  capturedRequests.length = 0;
  setActive.mockClear();
  createOrganization.mockClear();
  companyResponses.set("org_alpha", {
    businessActivity: "General trading",
    id: "org_alpha",
    image_url: null,
    is_active: true,
    name: "Alpha Trading LLC",
    slug: "alpha-trading-llc",
  });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url, "http://localhost:5173");

      capturedRequests.push({
        method: request.method,
        pathname: url.pathname,
      });

      if (url.pathname === "/api/health" && request.method === "GET") {
        return jsonResponse(healthResponse);
      }

      if (url.pathname === "/api/workspace-probe/latest" && request.method === "GET") {
        if (latestProbe) {
          return jsonResponse(latestProbe);
        }

        return jsonResponse({ detail: "No workspace probe runs have been recorded" }, 404);
      }

      if (url.pathname === "/api/workspace-probe" && request.method === "POST") {
        latestProbe = {
          created_at: "2026-06-07T10:00:00Z",
          id: 51,
          source: "workspace-shell",
          status: "completed",
          updated_at: "2026-06-07T10:00:00Z",
        };
        return jsonResponse(latestProbe, 201);
      }

      if (url.pathname.startsWith("/api/api/v1/companies/") && request.method === "GET") {
        const companyId = url.pathname.split("/").at(-1) ?? "";
        const company = companyResponses.get(companyId);

        if (!company) {
          return jsonResponse({ detail: "Not found" }, 404);
        }

        if ("status" in company) {
          return jsonResponse({ detail: company.detail }, company.status);
        }

        return jsonResponse(company);
      }

      throw new Error(`Unexpected request: ${request.method} ${url.pathname}`);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("switching companies clears cached data and refreshes the company-scoped shell", async () => {
  const { queryClient } = renderWorkspace();

  queryClient.setQueryData(["stale-company-data"], { companyId: "org_alpha" });

  expect(await screen.findByRole("button", { name: /alpha trading llc/i })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /alpha trading llc/i }));
  fireEvent.click(await screen.findByRole("menuitem", { name: /beta holdings llc/i }));

  await waitFor(() => {
    expect(setActive).toHaveBeenCalledWith({ organization: "org_beta" });
  });

  await waitFor(() => {
    expect(queryClient.getQueryData(["stale-company-data"])).toBeUndefined();
  });

  expect(await screen.findByText(/company switched\. showing records for beta holdings llc\./i)).toBeTruthy();

  await waitFor(() => {
    expect(
      capturedRequests.some(
        (request) => request.method === "GET" && request.pathname === "/api/api/v1/companies/org_beta",
      ),
    ).toBe(true);
  });
});

test("switching companies shows the loading state before the next company renders", async () => {
  let resolveSwitch: (() => void) | null = null;
  setActive.mockImplementationOnce(
    ({ organization }: { organization: string }) =>
      new Promise<void>((resolve) => {
        resolveSwitch = () => {
          authState.orgId = organization;
          resolve();
        };
      }),
  );

  renderWorkspace();

  expect(await screen.findByRole("button", { name: /alpha trading llc/i })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /alpha trading llc/i }));
  fireEvent.click(await screen.findByRole("menuitem", { name: /beta holdings llc/i }));

  expect(await screen.findByRole("heading", { name: /loading company context/i })).toBeTruthy();
  expect(screen.getAllByText(/switching company\.\.\./i).length).toBeGreaterThan(0);
  expect(
    screen.getByText(/clearing company-scoped data before the next company renders/i),
  ).toBeTruthy();

  resolveSwitch?.();

  expect(await screen.findByText(/company switched\. showing records for beta holdings llc\./i)).toBeTruthy();
});

test("the switcher exposes an add-company action that routes into the existing creation flow", async () => {
  renderWorkspace();

  fireEvent.click(await screen.findByRole("button", { name: /alpha trading llc/i }));
  fireEvent.click(screen.getByRole("menuitem", { name: /add a company/i }));

  expect(await screen.findByRole("heading", { name: /create a company workspace/i })).toBeTruthy();
});

test("a company-scoped 403 renders a calm permission denied state instead of dead shell content", async () => {
  companyResponses.set("org_alpha", {
    detail: "You do not have access to this company",
    status: 403,
  });

  renderWorkspace();

  expect(await screen.findByRole("heading", { name: /you do not have access to this company/i })).toBeTruthy();
  expect(screen.getByText(/switch to an authorized company or ask an admin for access/i)).toBeTruthy();
  expect(screen.getByRole("button", { name: /switch company/i })).toBeTruthy();
  expect(screen.getByRole("link", { name: /back to workspace/i })).toBeTruthy();
});
