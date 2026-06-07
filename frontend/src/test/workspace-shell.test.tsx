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
    sessionId: "sess_workspace",
    userId: "user_workspace",
  }),
  useOrganizationList: () => ({
    createOrganization: vi.fn(),
    isLoaded: true,
    setActive: vi.fn(),
  }),
}));

type ProbeRecord = {
  created_at: string;
  id: number;
  source: string;
  status: "completed";
  updated_at: string;
};

const healthResponse = {
  application: {
    environment: "development",
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

let latestProbe: ProbeRecord | null = null;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createFetchMock() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return jsonResponse(healthResponse);
    }

    if (url.pathname === "/api/workspace-probe/latest" && request.method === "GET") {
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

    if (url.pathname === "/api/workspace-probe" && request.method === "POST") {
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
  });
}

beforeEach(() => {
  latestProbe = null;
  vi.stubGlobal("fetch", createFetchMock());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("renders the shell and refreshes the latest probe through the generated client", async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createTestRouter(["/workspace"])} />
    </QueryClientProvider>,
  );

  expect(await screen.findByRole("heading", { name: /workspace probe/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: /run workspace probe/i })).toBeTruthy();
  expect(await screen.findByText(/no workspace probe yet/i)).toBeTruthy();
  expect(await screen.findByText(/api healthy/i)).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /run workspace probe/i }));

  await waitFor(() => {
    expect(screen.getByText(/workspace-shell/i)).toBeTruthy();
  });

  expect(screen.getByText(/probe status/i)).toBeTruthy();
  expect(screen.getByText(/completed at/i)).toBeTruthy();
  expect(screen.getByText(/record id/i)).toBeTruthy();
});
