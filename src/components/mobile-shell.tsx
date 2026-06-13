import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, LayoutDashboard, BookOpen, Search, Menu, Settings, LogOut, Sparkles, FileText, Shield, HelpCircle, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type Tab = { to: "/dashboard" | "/courses" | "/record" | "/search"; label: string; icon: typeof Mic; primary?: boolean };
const TABS: Tab[] = [
  { to: "/dashboard", label: "Lectures", icon: LayoutDashboard },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/record", label: "Record", icon: Mic, primary: true },
  { to: "/search", label: "Search", icon: Search },
];

export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map((t) => {
            const active = pathname === t.to || pathname.startsWith(t.to + "/");
            const Icon = t.icon;
            return (
              <li key={t.to}>
                <Link
                  to={t.to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-xl transition-colors",
                      t.primary && "bg-foreground text-background",
                      !t.primary && active && "bg-accent",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{t.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex w-full flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl">
                <Menu className="h-4 w-4" />
              </span>
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
      <MobileSidebar open={menuOpen} onOpenChange={setMenuOpen} />
      {/* Spacer so content doesn't sit under the tab bar */}
      <div aria-hidden className="h-16 md:hidden" />
    </>
  );
}

function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    onOpenChange(false);
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const items: { to: "/settings" | "/pricing" | "/how-it-works" | "/privacy"; label: string; icon: typeof Settings }[] = [
    { to: "/settings", label: "Settings", icon: Settings },
    { to: "/pricing", label: "Pricing", icon: Sparkles },
    { to: "/how-it-works", label: "How it works", icon: HelpCircle },
    { to: "/privacy", label: "Privacy", icon: Shield },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-72 p-0">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-base">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
                <Mic className="h-3.5 w-3.5" />
              </span>
              LectureLoop
            </SheetTitle>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-0.5">
              {items.map((i) => {
                const Icon = i.icon;
                return (
                  <li key={i.to}>
                    <Link
                      to={i.to}
                      onClick={() => onOpenChange(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-accent"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {i.label}
                    </Link>
                  </li>
                );
              })}
              <li className="pt-2">
                <Link
                  to="/dashboard"
                  search={{ filter: "favorites" } as never}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-accent"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Favorites
                </Link>
              </li>
            </ul>
          </nav>
          <div className="border-t border-border/60 p-3">
            <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}