import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, FilePlus2, FileStack, Layers, FolderOpen, Users, History, Settings, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/generate", label: "Document Generator", icon: FilePlus2 },
  { to: "/templates", label: "Template Manager", icon: FileStack },
  { to: "/bulk", label: "Bulk Generator", icon: Layers },
  { to: "/documents", label: "Generated Documents", icon: FolderOpen },
  { to: "/staff", label: "Staff Management", icon: Users },
  { to: "/activity", label: "Activity Logs", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand font-display text-sm font-bold text-primary-foreground">
        AY
      </div>
      <div className="leading-tight">
        <p className="font-display text-sm font-semibold text-sidebar-accent-foreground">AY-LEE</p>
        <p className="text-xs text-sidebar-foreground/70">Document Generator</p>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {nav.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? path === "/" : path.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar lg:flex">
        <Brand />
        <NavList />
        <p className="px-5 py-5 text-[11px] text-sidebar-foreground/50">AY-LEE INTEGRATED VENTURES</p>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-sidebar">
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-6 text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <Brand />
            <NavList onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-card/90 px-4 backdrop-blur sm:px-8">
          <button aria-label="Open menu" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden text-sm text-muted-foreground lg:block">AY-LEE INTEGRATED VENTURES</p>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold">Ayomide O.</p>
              <p className="text-xs text-muted-foreground">Admin (demo)</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
              AO
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
