import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { MeshBackground } from "@/components/MeshBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Adika AI" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  // Supabase sends ?type=recovery in the URL hash and auto-creates a session.
  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated — please sign in");
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { role: "candidate", mode: "login" } });
  }

  return (
    <div className="relative min-h-screen">
      <MeshBackground variant="mint" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md items-center justify-center px-6 py-12">
        <div className="glass w-full rounded-3xl p-8 shadow-luxe">
          <Link
            to="/auth"
            search={{ role: "candidate", mode: "login" }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
          <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure reset
          </div>
          <h1 className="mt-2 font-display text-3xl">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose something strong — at least 8 characters with a mix of letters and numbers.
          </p>

          {!ready ? (
            <div className="mt-8 rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
              Waiting for the reset link to be verified… If this stays here, request a new link from
              the sign-in page.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <Label className="text-xs" htmlFor="pw">
                  New password
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="pw"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={show ? "Hide" : "Show"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs" htmlFor="cf">
                  Confirm password
                </Label>
                <Input
                  id="cf"
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
