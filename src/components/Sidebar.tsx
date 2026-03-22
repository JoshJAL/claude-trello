import { useState, useEffect, useCallback } from "react";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { signOut, useSession } from "#/lib/auth-client";
import ThemeToggle from "./ThemeToggle";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Trello,
  Github,
  Gitlab,
  Settings,
  FileText,
  LogOut,
  Menu,
  UserCircle,
} from "lucide-react";

const STORAGE_KEY = "sidebar-collapsed";

function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

interface SidebarLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  collapsed,
  onClick,
  excludeMatches,
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
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export default function Sidebar() {
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(getInitialCollapsed());
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const sidebarContent = (
    <>
      {/* Brand + collapse toggle */}
      <div className="sidebar-header">
        <Link
          to="/"
          className="sidebar-brand"
          onClick={closeMobile}
        >
          {!collapsed && "TaskPilot"}
        </Link>
        <button
          onClick={toggleCollapsed}
          className="sidebar-toggle hidden md:flex"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <button
          onClick={closeMobile}
          className="sidebar-toggle flex md:hidden"
          title="Close menu"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {session ? (
        <>
          {/* Sources */}
          <div className="sidebar-section">
            {!collapsed && (
              <span className="sidebar-section-label">Sources</span>
            )}
            <SidebarLink
              to="/dashboard"
              icon={Trello}
              label="Trello"
              collapsed={collapsed}
              onClick={closeMobile}
              excludeMatches={["/dashboard/github", "/dashboard/gitlab"]}
            />
            <SidebarLink
              to="/dashboard/github"
              icon={Github}
              label="GitHub"
              collapsed={collapsed}
              onClick={closeMobile}
            />
            <SidebarLink
              to="/dashboard/gitlab"
              icon={Gitlab}
              label="GitLab"
              collapsed={collapsed}
              onClick={closeMobile}
            />
          </div>

          <div className="sidebar-divider" />

          {/* Navigation */}
          <div className="sidebar-section">
            <SidebarLink
              to="/settings"
              icon={Settings}
              label="Settings"
              collapsed={collapsed}
              onClick={closeMobile}
            />
            <SidebarLink
              to="/docs/cli"
              icon={FileText}
              label="CLI Docs"
              collapsed={collapsed}
              onClick={closeMobile}
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom section */}
          <div className="sidebar-section sidebar-bottom">
            <div className="sidebar-divider" />
            <div className={`sidebar-user ${collapsed ? "justify-center" : ""}`}>
              {collapsed ? (
                <UserCircle size={18} className="text-[var(--sea-ink-soft)]" />
              ) : (
                <>
                  <UserCircle size={16} className="shrink-0 text-[var(--sea-ink-soft)]" />
                  <span className="truncate text-xs font-medium text-[var(--sea-ink-soft)]">
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
          </div>
        </>
      ) : (
        <>
          <div className="sidebar-section">
            <SidebarLink
              to="/"
              icon={UserCircle}
              label="Sign in"
              collapsed={collapsed}
              onClick={closeMobile}
            />
            <SidebarLink
              to="/register"
              icon={UserCircle}
              label="Register"
              collapsed={collapsed}
              onClick={closeMobile}
            />
            <SidebarLink
              to="/docs/cli"
              icon={FileText}
              label="CLI Docs"
              collapsed={collapsed}
              onClick={closeMobile}
            />
          </div>
          <div className="flex-1" />
          <div className="sidebar-section sidebar-bottom">
            <div className="sidebar-divider" />
            <div className={`sidebar-actions ${collapsed ? "flex-col items-center" : ""}`}>
              <ThemeToggle />
            </div>
          </div>
        </>
      )}
    </>
  );

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
        <Link to="/" className="text-sm font-semibold text-[var(--sea-ink)] no-underline">
          TaskPilot
        </Link>
        <div className="w-8" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop md:hidden"
          onClick={closeMobile}
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
        {sidebarContent}
      </aside>
    </>
  );
}
