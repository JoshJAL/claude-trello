import { useState, useCallback, useSyncExternalStore } from "react";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { signOut, useSession } from "#/lib/auth-client";
import { useUpdates } from "#/hooks/useUpdates";
import { useRealtime } from "#/hooks/useRealtimeContext";
import ThemeToggle from "./ThemeToggle";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Trello,
  Github,
  Gitlab,
  Settings,
  FileText,
  Globe,
  LogOut,
  Menu,
  UserCircle,
  History,
  Sparkles,
  BarChart3,
  Map,
  MessageSquarePlus,
  Monitor,
  Cpu,
  Wrench,
} from "lucide-react";

const STORAGE_KEY = "sidebar-collapsed";

function subscribeToStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getCollapsedSnapshot(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function getCollapsedServerSnapshot(): boolean {
  return false;
}

interface SidebarLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
  badge?: number;
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  collapsed,
  onClick,
  excludeMatches,
  badge,
}: SidebarLinkProps & { excludeMatches?: string[] }) {
  const matchRoute = useMatchRoute();
  const fuzzyMatch = !!matchRoute({ to, fuzzy: true });
  const excluded = excludeMatches?.some((path) =>
    matchRoute({ to: path, fuzzy: true }),
  );
  const isActive = fuzzyMatch && !excluded;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`sidebar-link ${isActive ? "is-active" : ""}`}
      title={collapsed ? label : undefined}
    >
      <span className="relative shrink-0">
        <Icon size={18} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function SidebarHeader({ collapsed, onToggleCollapsed, onCloseMobile }: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}) {
  return (
    <div className="sidebar-header">
      <Link
        to="/"
        className="sidebar-brand"
        onClick={onCloseMobile}
      >
        {!collapsed && "TaskPilot"}
      </Link>
      <button
        onClick={onToggleCollapsed}
        className="sidebar-toggle hidden md:flex"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
      <button
        onClick={onCloseMobile}
        className="sidebar-toggle flex md:hidden"
        title="Close menu"
      >
        <PanelLeftClose size={18} />
      </button>
    </div>
  );
}

function SourceLinks({ collapsed, onCloseMobile }: { collapsed: boolean; onCloseMobile: () => void }) {
  return (
    <div className="sidebar-section">
      {!collapsed && (
        <span className="sidebar-section-label">Sources</span>
      )}
      <SidebarLink
        to="/dashboard"
        icon={Trello}
        label="Trello"
        collapsed={collapsed}
        onClick={onCloseMobile}
        excludeMatches={["/dashboard/github", "/dashboard/gitlab"]}
      />
      <SidebarLink
        to="/dashboard/github"
        icon={Github}
        label="GitHub"
        collapsed={collapsed}
        onClick={onCloseMobile}
      />
      <SidebarLink
        to="/dashboard/gitlab"
        icon={Gitlab}
        label="GitLab"
        collapsed={collapsed}
        onClick={onCloseMobile}
      />
    </div>
  );
}

function NavigationLinks({ collapsed, onCloseMobile, unseenCount }: {
  collapsed: boolean;
  onCloseMobile: () => void;
  unseenCount: number;
}) {
  return (
    <div className="sidebar-section">
      <SidebarLink to="/history" icon={History} label="History" collapsed={collapsed} onClick={onCloseMobile} />
      <SidebarLink to="/analytics" icon={BarChart3} label="Analytics" collapsed={collapsed} onClick={onCloseMobile} />
      <SidebarLink to="/updates" icon={Sparkles} label="Updates" collapsed={collapsed} onClick={onCloseMobile} badge={unseenCount} />
      <SidebarLink to="/settings" icon={Settings} label="Settings" collapsed={collapsed} onClick={onCloseMobile} />
      <SidebarLink to="/roadmap" icon={Map} label="Roadmap" collapsed={collapsed} onClick={onCloseMobile} />
      <SidebarLink to="/feature-request" icon={MessageSquarePlus} label="Feature Request" collapsed={collapsed} onClick={onCloseMobile} />
      <SidebarLink to="/docs/web" icon={Globe} label="Web Docs" collapsed={collapsed} onClick={onCloseMobile} />
      <SidebarLink to="/docs/cli" icon={FileText} label="CLI Docs" collapsed={collapsed} onClick={onCloseMobile} />
      <SidebarLink to="/docs/self-hosting" icon={Globe} label="Self-Hosting" collapsed={collapsed} onClick={onCloseMobile} />
      <SidebarLink to="/ai-models" icon={Cpu} label="AI Docs" collapsed={collapsed} onClick={onCloseMobile} />
      <SidebarLink to="/other-tools" icon={Wrench} label="Other Tools" collapsed={collapsed} onClick={onCloseMobile} />
    </div>
  );
}

function DesktopDownloadLink({ collapsed, onCloseMobile }: { collapsed: boolean; onCloseMobile: () => void }) {
  return (
    <div className="sidebar-section">
      {!collapsed && (
        <span className="sidebar-section-label">Desktop</span>
      )}
      <a
        href="https://github.com/JoshJAL/taskpilot-desktop/releases/latest"
        target="_blank"
        rel="noopener noreferrer"
        className="sidebar-link"
        title={collapsed ? "Download Desktop App" : undefined}
        onClick={onCloseMobile}
      >
        <Monitor size={18} className="shrink-0" />
        {!collapsed && <span>Download App</span>}
      </a>
    </div>
  );
}

function UserSection({ collapsed, session, wsStatus }: {
  collapsed: boolean;
  session: { user: { name: string; email: string } };
  wsStatus: string;
}) {
  const statusDotClass = wsStatus === "connected" ? "bg-emerald-500" : wsStatus === "connecting" ? "bg-amber-500 animate-pulse" : "bg-gray-400";
  const statusTitle = wsStatus === "connected" ? "Live updates active" : wsStatus === "connecting" ? "Connecting..." : "Polling mode";

  return (
    <div className="sidebar-section sidebar-bottom">
      <div className="sidebar-divider" />
      <div className={`sidebar-user ${collapsed ? "justify-center" : ""}`}>
        {collapsed ? (
          <span className="relative">
            <UserCircle size={18} className="text-(--sea-ink-soft)" />
            <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${statusDotClass}`} title={statusTitle} />
          </span>
        ) : (
          <>
            <span className="relative shrink-0">
              <UserCircle size={16} className="text-(--sea-ink-soft)" />
              <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${statusDotClass}`} title={statusTitle} />
            </span>
            <span className="truncate text-xs font-medium text-(--sea-ink-soft)">
              {session.user.name || session.user.email}
            </span>
          </>
        )}
      </div>
      <div className={`sidebar-actions ${collapsed ? "flex-col items-center" : ""}`}>
        <ThemeToggle />
        <button
          onClick={() => signOut().then(() => { window.location.href = "/"; })}
          className="sidebar-link"
          title="Sign out"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
      <FooterLinks collapsed={collapsed} />
    </div>
  );
}

function FooterLinks({ collapsed }: { collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div className="flex gap-3 px-3 pt-2 text-xs text-(--shore-line)">
      <a href="/privacy" className="hover:text-(--sea-ink-soft)">Privacy</a>
      <a href="/terms" className="hover:text-(--sea-ink-soft)">Terms</a>
      <a href="/cookies" className="hover:text-(--sea-ink-soft)">Cookies</a>
    </div>
  );
}

function UnauthenticatedNav({ collapsed, onCloseMobile }: { collapsed: boolean; onCloseMobile: () => void }) {
  return (
    <>
      <div className="sidebar-section">
        <SidebarLink to="/" icon={UserCircle} label="Sign in" collapsed={collapsed} onClick={onCloseMobile} />
        <SidebarLink to="/register" icon={UserCircle} label="Register" collapsed={collapsed} onClick={onCloseMobile} />
        <SidebarLink to="/roadmap" icon={Map} label="Roadmap" collapsed={collapsed} onClick={onCloseMobile} />
        <SidebarLink to="/feature-request" icon={MessageSquarePlus} label="Feature Request" collapsed={collapsed} onClick={onCloseMobile} />
        <SidebarLink to="/docs/web" icon={Globe} label="Web Docs" collapsed={collapsed} onClick={onCloseMobile} />
        <SidebarLink to="/docs/cli" icon={FileText} label="CLI Docs" collapsed={collapsed} onClick={onCloseMobile} />
        <SidebarLink to="/ai-models" icon={Cpu} label="AI Docs" collapsed={collapsed} onClick={onCloseMobile} />
        <SidebarLink to="/other-tools" icon={Wrench} label="Other Tools" collapsed={collapsed} onClick={onCloseMobile} />
      </div>
      <div className="flex-1" />
      <div className="sidebar-section sidebar-bottom">
        <div className="sidebar-divider" />
        <div className={`sidebar-actions ${collapsed ? "flex-col items-center" : ""}`}>
          <ThemeToggle />
        </div>
        <FooterLinks collapsed={collapsed} />
      </div>
    </>
  );
}

export default function Sidebar() {
  const { data: session } = useSession();
  const { unseenCount } = useUpdates();
  const { status: wsStatus } = useRealtime();
  const collapsed = useSyncExternalStore(subscribeToStorage, getCollapsedSnapshot, getCollapsedServerSnapshot);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    const next = !getCollapsedSnapshot();
    window.localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new Event("storage"));
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sidebar-mobile-bar flex md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="sidebar-toggle"
          title="Open menu"
        >
          <Menu size={20} />
        </button>
        <Link to="/" className="text-sm font-semibold text-(--sea-ink) no-underline">
          TaskPilot
        </Link>
        <div className="w-8" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop md:hidden"
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          onClick={closeMobile}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") closeMobile(); }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "sidebar",
          collapsed ? "sidebar-collapsed" : "",
          mobileOpen ? "sidebar-mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <SidebarHeader collapsed={collapsed} onToggleCollapsed={toggleCollapsed} onCloseMobile={closeMobile} />
        {session ? (
          <>
            <SourceLinks collapsed={collapsed} onCloseMobile={closeMobile} />
            <div className="sidebar-divider" />
            <NavigationLinks collapsed={collapsed} onCloseMobile={closeMobile} unseenCount={unseenCount} />
            <DesktopDownloadLink collapsed={collapsed} onCloseMobile={closeMobile} />
            <div className="flex-1" />
            <UserSection collapsed={collapsed} session={session} wsStatus={wsStatus} />
          </>
        ) : (
          <UnauthenticatedNav collapsed={collapsed} onCloseMobile={closeMobile} />
        )}
      </aside>
    </>
  );
}
