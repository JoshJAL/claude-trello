import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import Sidebar from "../components/Sidebar";
import { NotFound } from "../components/NotFound";
import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

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
  }),
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[var(--sand)] font-sans antialiased text-[var(--sea-ink)] [overflow-wrap:anywhere] selection:bg-blue-slate-200/40">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="sidebar-content flex-1 overflow-auto">
            <Outlet />
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
