import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { RecruiterShell } from "@/components/RecruiterShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/recruiter/settings/")({
  head: () => ({ meta: [{ title: "Settings — Recruiter" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["recruiter-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      return (await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle()).data;
    },
  });
  const [form, setForm] = useState({ full_name: "", company_name: "", company_size: "", industry: "", hiring_goals: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setForm({
      full_name: data.full_name ?? "", company_name: data.company_name ?? "",
      company_size: data.company_size ?? "", industry: data.industry ?? "",
      hiring_goals: data.hiring_goals ?? "",
    });
  }, [data]);

  async function save() {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", data.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["recruiter-profile"] });
  }

  return (
    <RecruiterShell eyebrow="Workspace" title={<span><span className="text-gold">Settings</span></span>}>
      <div className="glass max-w-2xl rounded-2xl p-8 space-y-4">
        <div><Label>Email</Label><Input value={data?.email ?? ""} disabled className="mt-1" /></div>
        <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1" /></div>
        <div><Label>Company</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-1" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Company size</Label><Input value={form.company_size} onChange={(e) => setForm({ ...form, company_size: e.target.value })} className="mt-1" placeholder="e.g. 50-200" /></div>
          <div><Label>Industry</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="mt-1" /></div>
        </div>
        <div><Label>Hiring goals</Label><Input value={form.hiring_goals} onChange={(e) => setForm({ ...form, hiring_goals: e.target.value })} className="mt-1" placeholder="e.g. 10 engineers in Q1" /></div>
        <Button onClick={save} disabled={saving} className="rounded-full bg-gold-soft text-gold border-gold">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
        </Button>
      </div>
    </RecruiterShell>
  );
}
