import {
  createBrowserRouter,
  createMemoryRouter,
  Navigate,
  type RouteObject,
} from "react-router-dom";
import { useAuth } from "@/lib/clerk";
import { CreateCompanyRoute } from "@/routes/auth/create-company";
import { SignInRoute } from "@/routes/auth/sign-in";
import { SignUpRoute } from "@/routes/auth/sign-up";
import { RootRoute } from "@/routes/root";
import { WorkspaceRoute } from "@/routes/workspace";
import { AuditRoute } from "@/routes/workspace/audit";
import { CompanySettingsRoute } from "@/routes/workspace/settings";
import { TeamRolesRoute } from "@/routes/workspace/team";

function AuthLoadingState() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--xb-bg)] px-6">
      <div className="rounded-[1.5rem] border border-[color:var(--xb-border)] bg-white px-6 py-5 text-sm text-[var(--xb-muted)] shadow-[var(--xb-shadow)]">
        Checking your session...
      </div>
    </div>
  );
}

function HomeRoute() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <AuthLoadingState />;
  }

  return <Navigate replace to={!isSignedIn ? "/sign-in" : "/create-company"} />;
}

function ProtectedShellRoute() {
  const { isLoaded, isSignedIn, orgId } = useAuth();

  if (!isLoaded) {
    return <AuthLoadingState />;
  }

  if (!isSignedIn) {
    return <Navigate replace to="/sign-in" />;
  }

  if (!orgId) {
    return <Navigate replace to="/create-company" />;
  }

  return <RootRoute />;
}

export const appRoutes: RouteObject[] = [
  {
    children: [
      {
        index: true,
        element: <HomeRoute />,
      },
      {
        path: "sign-in/*",
        element: <SignInRoute />,
      },
      {
        path: "sign-up/*",
        element: <SignUpRoute />,
      },
      {
        path: "create-company",
        element: <CreateCompanyRoute />,
      },
      {
        element: <ProtectedShellRoute />,
        children: [
          {
            path: "workspace",
            children: [
              {
                index: true,
                element: <WorkspaceRoute />,
              },
              {
                path: "team",
                element: <TeamRolesRoute />,
              },
              {
                path: "settings",
                element: <CompanySettingsRoute />,
              },
              {
                path: "audit",
                element: <AuditRoute />,
              },
            ],
          },
        ],
      },
    ],
  },
];

const routerOptions = {
  future: {
    v7_startTransition: true,
  },
};

export const router = createBrowserRouter(appRoutes, routerOptions);

export function createTestRouter(initialEntries: string[]) {
  return createMemoryRouter(appRoutes, {
    future: routerOptions.future,
    initialEntries,
  });
}
