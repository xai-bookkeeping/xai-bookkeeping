import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createTestRouter } from "@/app/router";
import { API_BASE_URL } from "@/lib/api-runtime";
import { CreateCompanyRoute } from "@/routes/auth/create-company";

type AuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  orgId: string | null;
};

type CompanyRecord = {
  created_at: string;
  id: string;
  image_url: string | null;
  is_active: boolean;
  name: string;
  slug: string;
  updated_at: string;
};

type BootstrapScenario =
  | "auth_required"
  | "no_active_company"
  | "pending"
  | "pending_then_ready"
  | "ready"
  | "server_error";

const authState: AuthState = {
  isLoaded: true,
  isSignedIn: false,
  orgId: null,
};

const companyResponses = new Map<string, CompanyRecord>([
  [
    "org_test",
    {
      created_at: "2026-06-07T10:00:00Z",
      id: "org_test",
      image_url: null,
      is_active: true,
      name: "Org Test LLC",
      slug: "org-test-llc",
      updated_at: "2026-06-07T10:00:00Z",
    },
  ],
]);

const createOrganization = vi.fn(async ({ name }: { name: string }) => {
  const id = "org_created";
  companyResponses.set(id, {
    created_at: "2026-06-07T10:00:00Z",
    id,
    image_url: null,
    is_active: true,
    name,
    slug: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    updated_at: "2026-06-07T10:00:00Z",
  });

  return { id, name };
});

const setActive = vi.fn(async ({ organization }: { organization: string }) => {
  authState.orgId = organization;
});

const signInMock = vi.fn((props: Record<string, unknown>) => (
  <div data-testid="clerk-sign-in">{JSON.stringify(props)}</div>
));

const signUpMock = vi.fn((props: Record<string, unknown>) => (
  <div data-testid="clerk-sign-up">{JSON.stringify(props)}</div>
));

const taskChooseOrganizationMock = vi.fn((props: Record<string, unknown>) => (
  <div data-testid="clerk-task-choose-organization">{JSON.stringify(props)}</div>
));

let bootstrapScenario: BootstrapScenario = "no_active_company";
let bootstrapCallCount = 0;
let latestProbe:
  | null
  | {
      created_at: string;
      id: number;
      source: string;
      status: "completed";
      updated_at: string;
    } = null;

const capturedRequests: Array<{ headers: Headers; method: string; pathname: string }> = [];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

function bootstrapNoActiveCompany() {
  return {
    active_organization_id: null,
    company: null,
    membership_role: null,
    status: "no_active_company" as const,
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

function bootstrapReady(companyId: string) {
  const company =
    companyResponses.get(companyId) ??
    ({
      created_at: "2026-06-07T10:00:00Z",
      id: companyId,
      image_url: null,
      is_active: true,
      name: "Ready Company LLC",
      slug: "ready-company-llc",
      updated_at: "2026-06-07T10:00:00Z",
    } satisfies CompanyRecord);

  return {
    active_organization_id: companyId,
    company,
    membership_role: "owner",
    status: "ready" as const,
  };
}

function renderRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  const router = createTestRouter([path]);
  const makeUi = () => (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  const view = render(makeUi());

  return {
    ...view,
    rerenderRoute: () => view.rerender(makeUi()),
  };
}

function renderCreateCompanyRouteDirect() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  const makeUi = () => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/create-company"]}>
        <CreateCompanyRoute />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(makeUi());

  return {
    ...view,
    rerenderRoute: () => view.rerender(makeUi()),
  };
}

vi.mock("@clerk/react", () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignIn: (props: Record<string, unknown>) => signInMock(props),
  SignUp: (props: Record<string, unknown>) => signUpMock(props),
  TaskChooseOrganization: (props: Record<string, unknown>) => taskChooseOrganizationMock(props),
  SignedIn: ({ children }: { children: ReactNode }) => (authState.isSignedIn ? <>{children}</> : null),
  SignedOut: ({ children }: { children: ReactNode }) => (!authState.isSignedIn ? <>{children}</> : null),
  useAuth: () => ({
    isLoaded: authState.isLoaded,
    isSignedIn: authState.isSignedIn,
    orgId: authState.orgId,
    sessionId: authState.isSignedIn ? "sess_test" : null,
    userId: authState.isSignedIn ? "user_test" : null,
  }),
  useOrganization: () => ({
    isLoaded: authState.isLoaded,
    organization: authState.orgId
      ? {
          id: authState.orgId,
          name: companyResponses.get(authState.orgId)?.name ?? "Ready Company LLC",
          publicMetadata: {
            businessActivity: "General trading",
          },
        }
      : null,
  }),
  useOrganizationList: () => ({
    createOrganization,
    isLoaded: authState.isLoaded && authState.isSignedIn,
    setActive,
  }),
}));

beforeEach(() => {
  authState.isLoaded = true;
  authState.isSignedIn = false;
  authState.orgId = null;
  bootstrapScenario = "no_active_company";
  bootstrapCallCount = 0;
  latestProbe = null;
  companyResponses.delete("org_created");
  capturedRequests.length = 0;
  createOrganization.mockClear();
  setActive.mockClear();
  signInMock.mockClear();
  signUpMock.mockClear();
  taskChooseOrganizationMock.mockClear();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url, "http://localhost:5173");
      capturedRequests.push({
        headers: new Headers(request.headers),
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
        bootstrapCallCount += 1;

        if (!authState.orgId || bootstrapScenario === "no_active_company") {
          return jsonResponse(bootstrapNoActiveCompany());
        }

        if (bootstrapScenario === "auth_required") {
          return jsonResponse({ detail: "Session expired" }, 401);
        }

        if (bootstrapScenario === "server_error") {
          return jsonResponse({ detail: "Service unavailable" }, 503);
        }

        if (bootstrapScenario === "ready") {
          return jsonResponse(bootstrapReady(authState.orgId));
        }

        if (bootstrapScenario === "pending") {
          return jsonResponse(bootstrapPending(authState.orgId));
        }

        if (bootstrapScenario === "pending_then_ready") {
          return bootstrapCallCount < 2
            ? jsonResponse(bootstrapPending(authState.orgId))
            : jsonResponse(bootstrapReady(authState.orgId));
        }
      }

      if (url.pathname === "/workspace-probe/latest" && request.method === "GET") {
        if (latestProbe) {
          return jsonResponse(latestProbe);
        }

        return jsonResponse({ detail: "No workspace probe runs have been recorded" }, 404);
      }

      if (url.pathname === "/workspace-probe" && request.method === "POST") {
        const body = (await request.json()) as { source: string; status?: "completed" };
        latestProbe = {
          created_at: "2026-06-07T10:00:00Z",
          id: 41,
          source: body.source,
          status: body.status ?? "completed",
          updated_at: "2026-06-07T10:00:00Z",
        };
        return jsonResponse(latestProbe, 201);
      }

      if (url.pathname.startsWith("/api/v1/companies/") && request.method === "GET") {
        const companyId = url.pathname.split("/").at(-1) ?? "";
        const company = companyResponses.get(companyId);

        if (!company) {
          return jsonResponse({ detail: "Not found" }, 404);
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

test("signed-out users are redirected to the Clerk sign-in shell before protected workspace content renders", async () => {
  renderRoute("/workspace");

  expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeTruthy();
  expect(screen.getByTestId("clerk-sign-in")).toBeTruthy();
  expect(screen.getByRole("link", { name: /create a company workspace/i })).toBeTruthy();
  expect(screen.getByText(/english \(uae\) - arabic coming soon/i)).toBeTruthy();
});

test("signed-in users land in company setup instead of jumping directly to the workspace shell", async () => {
  authState.isSignedIn = true;
  authState.orgId = "org_test";
  bootstrapScenario = "pending";

  renderRoute("/sign-in");

  expect(await screen.findByText(/we are preparing your company workspace/i)).toBeTruthy();
  expect(screen.queryByRole("heading", { name: /workspace probe/i })).toBeNull();
});

test("sign-in page keeps account creation on the dedicated sign-up route and disables opaque sign-in-to-sign-up transfer", async () => {
  renderRoute("/sign-in");

  expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeTruthy();
  expect(screen.getByRole("link", { name: /create a company workspace/i }).getAttribute("href")).toBe("/sign-up");

  const signInProps = signInMock.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
  expect(signInProps?.transferable).toBe(false);
  expect(signInProps?.withSignUp).toBe(false);
  expect(signInProps?.signUpUrl).toBe("/sign-up");
  expect(signInProps?.fallbackRedirectUrl).toBe("/create-company");
  expect(signInProps?.forceRedirectUrl).toBe("/create-company");
});

test("sign-up page keeps the onboarding continuation local and hands off to company setup", async () => {
  renderRoute("/sign-up");

  expect(await screen.findByRole("heading", { name: /create your account/i })).toBeTruthy();
  expect(screen.getByRole("link", { name: /i already have an account/i }).getAttribute("href")).toBe("/sign-in");

  const signUpProps = signUpMock.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
  expect(signUpProps?.signInUrl).toBe("/sign-in");
  expect(signUpProps?.fallbackRedirectUrl).toBe("/create-company");
  expect(signUpProps?.forceRedirectUrl).toBe("/create-company");
});

test("sign-in callback paths stay inside the Clerk sign-in shell instead of falling through to a router 404", async () => {
  renderRoute("/sign-in/sso-callback");

  expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeTruthy();
  expect(screen.getByTestId("clerk-sign-in")).toBeTruthy();
});

test("sign-up continuation paths stay inside the local auth flow instead of falling back to Clerk-hosted pages", async () => {
  renderRoute("/sign-up/continue");

  expect(await screen.findByRole("heading", { name: /create your account/i })).toBeTruthy();
  expect(screen.getByTestId("clerk-sign-up")).toBeTruthy();
});

test("Clerk choose-organization tasks render in a dedicated onboarding route before app company readiness", async () => {
  authState.isSignedIn = true;

  renderRoute("/tasks/choose-organization");

  expect(await screen.findByRole("heading", { name: /finish company access/i })).toBeTruthy();
  expect(screen.getByTestId("clerk-task-choose-organization")).toBeTruthy();

  const taskProps = taskChooseOrganizationMock.mock.calls.at(-1)?.[0] as
    | Record<string, unknown>
    | undefined;
  expect(taskProps?.redirectUrlComplete).toBe("/create-company");
});

test("Clerk choose-organization tasks render while the session task is still pending", async () => {
  authState.isSignedIn = false;

  renderRoute("/tasks/choose-organization");

  expect(await screen.findByRole("heading", { name: /finish company access/i })).toBeTruthy();
  expect(screen.getByTestId("clerk-task-choose-organization")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: /welcome back/i })).toBeNull();
});

test("signed-in users without an active company are redirected into company creation", async () => {
  authState.isSignedIn = true;

  renderRoute("/workspace");

  expect(await screen.findByRole("heading", { name: /create a company workspace/i })).toBeTruthy();
  expect(screen.getByText(/give your team a home for finance work/i)).toBeTruthy();
});

test("create-company keeps hook order stable when Clerk auth changes during OTP handoff", async () => {
  authState.isSignedIn = true;

  const view = renderCreateCompanyRouteDirect();

  expect(await screen.findByRole("heading", { name: /create a company workspace/i })).toBeTruthy();

  authState.isSignedIn = false;
  expect(() => view.rerenderRoute()).not.toThrow(/rendered fewer hooks/i);
});

test("create-company waits for readiness after Clerk organization task completion instead of asking again", async () => {
  authState.isSignedIn = true;
  authState.orgId = "org_test";
  bootstrapScenario = "pending";

  renderRoute("/create-company");

  expect(await screen.findByText(/we are preparing your company workspace/i)).toBeTruthy();
  expect(screen.queryByLabelText(/company name/i)).toBeNull();
  expect(createOrganization).not.toHaveBeenCalled();
});

test("create-company invokes Clerk organization creation and stays on the setup page until bootstrap is ready", async () => {
  authState.isSignedIn = true;
  bootstrapScenario = "pending_then_ready";

  renderRoute("/create-company");

  fireEvent.change(await screen.findByLabelText(/company name/i), {
    target: { value: "Al Noor Trading LLC" },
  });
  fireEvent.click(screen.getByRole("button", { name: /create company workspace/i }));

  await waitFor(() => {
    expect(createOrganization).toHaveBeenCalledWith({ name: "Al Noor Trading LLC" });
    expect(setActive).toHaveBeenCalledWith({ organization: "org_created" });
  });

  expect(await screen.findByText(/we are preparing your company workspace/i)).toBeTruthy();
  expect(screen.queryByRole("heading", { name: /workspace probe/i })).toBeNull();

  await waitFor(
    () => {
      expect(screen.getByRole("heading", { name: /workspace probe/i })).toBeTruthy();
    },
    { timeout: 5000 },
  );

  expect(capturedRequests.some((request) => request.pathname === "/api/v1/auth/bootstrap")).toBe(true);
});

test("create-company shows an auth-required state when bootstrap returns 401", async () => {
  authState.isSignedIn = true;
  bootstrapScenario = "auth_required";

  renderRoute("/create-company");

  fireEvent.change(await screen.findByLabelText(/company name/i), {
    target: { value: "Al Noor Trading LLC" },
  });
  fireEvent.click(screen.getByRole("button", { name: /create company workspace/i }));

  await waitFor(() => {
    expect(createOrganization).toHaveBeenCalledWith({ name: "Al Noor Trading LLC" });
    expect(setActive).toHaveBeenCalledWith({ organization: "org_created" });
  });

  expect(await screen.findByRole("heading", { name: /we need to verify your session again/i })).toBeTruthy();
  expect(screen.getByRole("link", { name: /back to sign in/i })).toBeTruthy();
});

test("create-company shows a retryable error state when bootstrap returns 503", async () => {
  authState.isSignedIn = true;
  bootstrapScenario = "server_error";

  renderRoute("/create-company");

  fireEvent.change(await screen.findByLabelText(/company name/i), {
    target: { value: "Al Noor Trading LLC" },
  });
  fireEvent.click(screen.getByRole("button", { name: /create company workspace/i }));

  await waitFor(() => {
    expect(createOrganization).toHaveBeenCalledWith({ name: "Al Noor Trading LLC" });
    expect(setActive).toHaveBeenCalledWith({ organization: "org_created" });
  });

  expect(await screen.findByRole("heading", { name: /we could not load company readiness/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: /retry readiness/i })).toBeTruthy();
});

test("adding a company from an active workspace does not poll bootstrap until the new org becomes active", async () => {
  authState.isSignedIn = true;
  authState.orgId = "org_test";
  bootstrapScenario = "ready";

  let resolveSetActive = () => {};
  setActive.mockImplementationOnce(
    ({ organization }: { organization: string }) =>
      new Promise<void>((resolve) => {
        resolveSetActive = () => {
          authState.orgId = organization;
          resolve();
        };
      }),
  );

  renderRoute("/create-company?intent=new");

  fireEvent.change(await screen.findByLabelText(/company name/i), {
    target: { value: "Al Noor Trading LLC" },
  });
  fireEvent.click(screen.getByRole("button", { name: /create company workspace/i }));

  await waitFor(() => {
    expect(createOrganization).toHaveBeenCalledWith({ name: "Al Noor Trading LLC" });
    expect(setActive).toHaveBeenCalledWith({ organization: "org_created" });
  });

  expect(capturedRequests.some((request) => request.pathname === "/api/v1/auth/bootstrap")).toBe(false);

  resolveSetActive?.();

  expect(await screen.findByRole("heading", { name: /workspace probe/i })).toBeTruthy();
  expect(capturedRequests.some((request) => request.pathname === "/api/v1/auth/bootstrap")).toBe(true);
});

test("protected workspace traffic stays on the same-origin /api contract without a bearer token helper", async () => {
  authState.isSignedIn = true;
  authState.orgId = "org_test";
  bootstrapScenario = "ready";

  renderRoute("/workspace");

  expect(new URL(API_BASE_URL).origin).toBe(window.location.origin);

  await waitFor(() => {
    expect(capturedRequests.length > 0).toBe(true);
  });

  expect(capturedRequests.some((request) => request.pathname.startsWith("/api/v1/"))).toBe(true);
  await waitFor(() => {
    expect(capturedRequests.some((request) => request.pathname === "/health")).toBe(true);
  });
  expect(capturedRequests.every((request) => request.headers.get("authorization") === null)).toBe(true);
});
