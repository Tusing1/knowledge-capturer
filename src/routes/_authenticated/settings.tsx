import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — LectureLoop" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getProfile);
  const update = useServerFn(updateProfile);

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => get(),
  });

  const [name, setName] = useState("");
  useEffect(() => {
    if (data?.profile?.display_name) setName(data.profile.display_name);
  }, [data]);

  const save = useMutation({
    mutationFn: () => update({ data: { display_name: name.trim() } }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and profile.</p>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Profile</h2>
          {isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <Label>Email</Label>
                <p className="mt-1 text-sm text-muted-foreground">{data?.email ?? "—"}</p>
              </div>
              <div>
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending || !name.trim() || name.trim() === data?.profile?.display_name}
              >
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign out of this device.</p>
          <Button variant="outline" className="mt-4" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </section>
      </main>
    </div>
  );
}