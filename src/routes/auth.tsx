import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => pageHead("Sign in", "Sign in to the AY-LEE Document Generator."),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { data: adminExists, isLoading } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => (await supabase.rpc("admin_exists")).data ?? true,
  });
  const [mode, setMode] = useState<"signin" | "setup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/", replace: true });
      } else {
        if (password.length < 8) throw new Error("Use at least 8 characters for the password.");
        const { error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
        });
        if (error) throw error;
        setSent(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand font-display font-bold text-primary-foreground">AY</div>
          <p className="font-display font-semibold text-sidebar-accent-foreground">AY-LEE INTEGRATED VENTURES</p>
        </div>
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-sidebar-accent-foreground">Professional documents,<br />generated in seconds.</h1>
          <p className="mt-4 max-w-md text-sidebar-foreground/80">Upload your letterheads and forms once. Fill in the details and download finished documents with your original formatting intact.</p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">AY-LEE Document Generator</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {sent ? (
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Check your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to {email}. Open it to activate the administrator account, then sign in.</p>
              <Button variant="outline" className="mt-6" onClick={() => { setSent(false); setMode("signin"); }}>Back to sign in</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">{mode === "signin" ? "Sign in" : "Create the administrator account"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "signin" ? "Staff accounts are created by your administrator." : "This one-time setup creates the first ADMIN. After that, only the admin can add accounts."}
                </p>
              </div>
              {mode === "setup" && (
                <div><Label htmlFor="name">Full name</Label><Input id="name" required className="mt-1.5" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              )}
              <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required autoComplete="email" className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label htmlFor="password">Password</Label><Input id="password" type="password" required autoComplete={mode === "signin" ? "current-password" : "new-password"} className="mt-1.5" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create admin account"}</Button>
              {!isLoading && adminExists === false && (
                <button type="button" className="w-full text-center text-sm font-medium text-primary" onClick={() => setMode(mode === "signin" ? "setup" : "signin")}>
                  {mode === "signin" ? "First time here? Set up the administrator account" : "Back to sign in"}
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
