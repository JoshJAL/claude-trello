import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import Sidebar from "../components/Sidebar";
import ConsentBanner from "../components/ConsentBanner";
import { NotFound } from "../components/NotFound";
import { RealtimeProvider } from "../hooks/useRealtimeContext";
import { ToastProvider } from "../components/Toast";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TaskPilot" },
      { property: "og:image", content: "/opengraph-image.jpeg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/icon.jpeg", type: "image/jpeg" },
      { rel: "apple-touch-icon", href: "/apple-icon.jpeg" },
    ],
    scripts: [
      { src: "/theme-init.js" },
    ],
  }),
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-(--sand) font-sans antialiased text-(--sea-ink) [overflow-wrap:anywhere] selection:bg-blue-slate-200/40">
        <RealtimeProvider>
          <ToastProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="sidebar-content flex-1 overflow-auto">
                <Outlet />
              </div>
            </div>
          </ToastProvider>
        </RealtimeProvider>
        <ConsentBanner />
        <Scripts />
      </body>
    </html>
  );
}
