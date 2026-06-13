import { Link, useNavigate } from "@tanstack/react-router";
import { Mic, LayoutDashboard, LogOut, BookOpen, Settings, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { MobileTabBar } from "@/components/mobile-shell";

export function AppHeader() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
            <Mic className="h-3.5 w-3.5" />
          </span>
          LectureLoop
        </Link>
        <nav className="ml-2 hidden items-center gap-1 text-sm md:flex">
          <Link
            to="/dashboard"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-foreground" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" /> Lectures
            </span>
          </Link>
          <Link
            to="/record"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-foreground" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5" /> Record
            </span>
          </Link>
          <Link
            to="/courses"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-foreground" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Courses
            </span>
          </Link>
          <Link
            to="/search"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-foreground" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" /> Search
            </span>
          </Link>
          <Link
            to="/settings"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-1.5 bg-accent text-foreground" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5" /> Settings
            </span>
          </Link>
        </nav>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={signOut} className="hidden md:inline-flex">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </div>
      </div>
    </header>
    <MobileTabBar />
    </>
  );
}