import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createTestRouter } from "@/app/router";
import { API_BASE_PATH, API_BASE_URL } from "@/lib/api-runtime";

type AuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  orgId: string | null;
};

const authState: AuthState = {
  isLoaded: true,
  isSignedIn: false,
  orgId: null,
};

const createOrganization = vi.fn(async ({ name }: { name: string }) => ({
  id: "org_created",
  name,
}));

const setActive = vi.fn(async ({ organization }: { organization: string }) => {
  authState.orgId = organization;
});

vi.mock("@clerk/react", () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignIn: () => <div data-testid="clerk-sign-in">Mock Clerk SignIn</div>,
  SignedIn: ({ children }: { children: ReactNode }) => (authState.isSignedIn ? <>{children}</> : null),
  SignedOut: ({ children }: { children: ReactNode }) => (!authState.isSignedIn ? <>{children}</> : null),
  useAuth: () => ({
    isLoaded: authState.isLoaded,
    isSignedIn: authState.isSignedIn,
    orgId: authState.orgId,
    sessionId: authState.isSignedIn ? "sess_test" : null,
    userId: authState.isSignedIn ? "user_test" : null,
  }),
  useOrganizationList: () => ({
    createOrganization,
    isLoaded: authState.isLoaded && authState.isSignedIn,
    setActive,
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

let latestProbe: null | {
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
  authState.isSignedIn = false;
  authState.orgId = null;
  latestProbe = null;
  capturedRequests.length = 0;
  createOrganization.mockClear();
  setActive.mockClear();

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

  expect(await screen.findByRole("heading", { name: /welcome back to your finance workspace/i })).toBeTruthy();
  expect(screen.getByTestId("clerk-sign-in")).toBeTruthy();
  expect(screen.getByRole("link", { name: /create a company workspace/i })).toBeTruthy();
  expect(screen.getByText(/english \(uae\) - arabic coming soon/i)).toBeTruthy();
});

test("signed-in users without an active company are redirected into company creation", async () => {
  authState.isSignedIn = true;

  renderRoute("/workspace");

  expect(await screen.findByRole("heading", { name: /create a company workspace/i })).toBeTruthy();
  expect(screen.getByText(/we will connect it to your clerk organization/i)).toBeTruthy();
});

test("create-company invokes Clerk organization creation and shows a pending handoff state", async () => {
  authState.isSignedIn = true;

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
});

test("protected workspace traffic stays on the same-origin /api contract without a bearer token helper", async () => {
  authState.isSignedIn = true;
  authState.orgId = "org_test";

  renderRoute("/workspace");

  expect(API_BASE_PATH).toBe("/api");
  expect(new URL(API_BASE_URL).origin).toBe(window.location.origin);

  await waitFor(() => {
    expect(capturedRequests.length > 0).toBe(true);
  });

  expect(capturedRequests.every((request) => request.pathname.startsWith("/api/"))).toBe(true);
  expect(capturedRequests.every((request) => request.headers.get("authorization") === null)).toBe(true);
});
