import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { CLERK_TASK_URLS, ClerkProvider, resolveClerkPublishableKey } from "@/lib/clerk";
import "@/styles.css";

const clerkPublishableKey = resolveClerkPublishableKey(import.meta.env);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      signInFallbackRedirectUrl="/create-company"
      signInUrl="/sign-in"
      signUpFallbackRedirectUrl="/create-company"
      signUpUrl="/sign-up"
      taskUrls={CLERK_TASK_URLS}
    >
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ClerkProvider>
  </React.StrictMode>,
);
