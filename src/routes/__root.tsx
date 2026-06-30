import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportAdikaError } from "../lib/adika-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="bg-mesh flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-2xl p-10 text-center shadow-luxe">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Adika AI</p>
        <h1 className="mt-3 font-display text-6xl">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This page hasn't been built yet, or the link has moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportAdikaError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="bg-mesh flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-2xl p-10 text-center shadow-luxe">
        <h1 className="font-display text-3xl">Something went sideways</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Try again, or head back to the homepage.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-foreground px-5 py-2 text-sm text-background hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-border px-5 py-2 text-sm hover:bg-accent/40"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Adika AI — Hiring Intelligence Ecosystem" },
      {
        name: "description",
        content:
          "AI-powered career intelligence and hiring decision platform for candidates and recruiters.",
      },
      { property: "og:title", content: "Adika AI — Hiring Intelligence Ecosystem" },
      {
        property: "og:description",
        content: "One intelligence layer powering candidate growth and recruiter decisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
