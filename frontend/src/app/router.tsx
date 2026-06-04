import { createBrowserRouter, Navigate } from "react-router-dom";
import { RootRoute } from "@/routes/root";
import { WorkspaceRoute } from "@/routes/workspace";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRoute />,
    children: [
      {
        index: true,
        element: <Navigate replace to="/workspace" />,
      },
      {
        path: "workspace",
        element: <WorkspaceRoute />,
      },
    ],
  },
]);
