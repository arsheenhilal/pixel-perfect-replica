import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Footer, Header } from "@/components/Layout";

function NotFoundComponent() {
  return (
    <div className="wrap page" style={{ textAlign: "center" }}>
      <div className="eyebrow">Lost between the shelves</div>
      <h1 className="page-title">Page not found</h1>
      <p className="muted">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 20 }}>Back home</Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="wrap page" style={{ textAlign: "center" }}>
      <h1 className="page-title">This page didn't load</h1>
      <p className="muted">Something went wrong. You can try again or head back home.</p>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button className="btn btn-primary" onClick={() => { router.invalidate(); reset(); }}>Try again</button>
        <a href="/" className="btn btn-outline">Go home</a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Book Nook — Discover & read books" },
      { name: "description", content: "Discover books and read free classics online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
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
  const inReader = useRouterState({ select: (s) => s.location.pathname.startsWith("/read/") });

  return (
    <QueryClientProvider client={queryClient}>
      {!inReader && <Header />}
      <main>
        <Outlet />
      </main>
      {!inReader && <Footer />}
    </QueryClientProvider>
  );
}
