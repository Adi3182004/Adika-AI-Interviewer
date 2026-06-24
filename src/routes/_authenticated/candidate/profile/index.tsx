import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/candidate/profile/")({
  head: () => ({ meta: [{ title: "Profile — Candidate" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });
  const [form, setForm] = useState({ full_name: "", phone: "", education: "", experience_level: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setForm({
      full_name: data.full_name ?? "", phone: data.phone ?? "",
      education: data.education ?? "", experience_level: data.experience_level ?? "",
    });
  }, [data]);

  async function save() {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", data.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <CandidateShell eyebrow="Profile" title="Your information">
      <div className="glass max-w-2xl rounded-2xl p-8 space-y-4">
        <div><Label>Email</Label><Input value={data?.email ?? ""} disabled className="mt-1" /></div>
        <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1" /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
        <div><Label>Education</Label><Input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} className="mt-1" /></div>
        <div>
          <Label>Experience level</Label>
          <Select value={form.experience_level} onValueChange={(v) => setForm({ ...form, experience_level: v })}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Pick one" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="entry">Entry (0-2y)</SelectItem>
              <SelectItem value="mid">Mid (2-5y)</SelectItem>
              <SelectItem value="senior">Senior (5-10y)</SelectItem>
              <SelectItem value="staff">Staff+ (10y+)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} disabled={saving} className="rounded-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save changes
        </Button>
      </div>
    </CandidateShell>
  );
}
