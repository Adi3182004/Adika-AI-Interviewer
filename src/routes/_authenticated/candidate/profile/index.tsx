import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Globe,
  Github,
  Linkedin,
  MapPin,
  User,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.user.id)
        .maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    education: "",
    experience_level: "",
    target_title: "",
    bio: "",
    location: "",
    github_url: "",
    linkedin_url: "",
    website_url: "",
    job_search_status: "active",
    gender: "",
    age: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const isDemo = data.email === "candidate@adika.ai";
      let extra: any = {};
      if (data.hiring_goals) {
        try {
          extra = JSON.parse(data.hiring_goals);
        } catch (e) {
          extra = { bio: data.hiring_goals };
        }
      } else if (isDemo) {
        extra = {
          target_title: "Senior Backend Engineer",
          bio: "Final-year CSE student at IIT Bombay with internships at Razorpay and Zomato. Passionate about building distributed databases and high-throughput streaming pipelines.",
          location: "Bengaluru, India / Remote",
          github_url: "https://github.com/aditya-andhalkar",
          linkedin_url: "https://linkedin.com/in/aditya-andhalkar",
          website_url: "https://adika.ai",
          job_search_status: "active",
          gender: "Male",
          age: "25",
        };
      }

      setForm({
        full_name: data.full_name || (isDemo ? "Aditya Andhalkar" : ""),
        phone: data.phone || (isDemo ? "+91 98765 43210" : ""),
        education: data.education || (isDemo ? "B.Tech CSE — IIT Bombay" : ""),
        experience_level: data.experience_level || (isDemo ? "entry" : ""),
        target_title: extra.target_title ?? "",
        bio: extra.bio ?? "",
        location: extra.location ?? "",
        github_url: extra.github_url ?? "",
        linkedin_url: extra.linkedin_url ?? "",
        website_url: extra.website_url ?? "",
        job_search_status: extra.job_search_status ?? "active",
        gender: extra.gender ?? "",
        age: extra.age ?? "",
      });
    }
  }, [data]);

  async function save() {
    if (!data) return;
    setSaving(true);
    const extra = {
      target_title: form.target_title,
      bio: form.bio,
      location: form.location,
      github_url: form.github_url,
      linkedin_url: form.linkedin_url,
      website_url: form.website_url,
      job_search_status: form.job_search_status,
      gender: form.gender,
      age: form.age,
    };
    const payload = {
      full_name: form.full_name,
      phone: form.phone,
      education: form.education,
      experience_level: form.experience_level,
      hiring_goals: JSON.stringify(extra),
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", data.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated successfully");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <CandidateShell eyebrow="Profile" title="Your information">
      {/* Profile Header Summary Card */}
      <div className="glass rounded-2xl p-6 mb-6 flex flex-col md:flex-row items-center gap-6 border border-border/20">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-accent font-display text-2xl font-bold text-white shadow-lg">
          {form.full_name ? form.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "C"}
          <span className="absolute bottom-0.5 right-0.5 h-4.5 w-4.5 rounded-full border-2 border-background bg-success" />
        </div>
        <div className="flex-1 text-center md:text-left min-w-0">
          <h2 className="font-display text-2xl font-bold tracking-tight">{form.full_name || "Candidate Name"}</h2>
          <p className="text-sm font-medium text-primary mt-0.5">{form.target_title || "Target Job Role"}</p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2 text-xs text-muted-foreground">
            {form.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {form.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-primary" />
              {data?.email}
            </span>
          </div>
        </div>
        <div className="shrink-0">
          <Badge variant="outline" className="rounded-full px-3 py-1 bg-success/5 border-success/30 text-success text-[11px] font-medium tracking-wide">
            {form.job_search_status === "active" ? "🟢 Actively Job Hunting" : form.job_search_status === "open" ? "🟡 Open to Offers" : "🔴 Not Looking"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: General Info & Links */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-border/20 space-y-4">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2 border-b border-border/10 pb-2">
              <User className="h-4.5 w-4.5 text-primary" /> General Information
            </h3>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Full name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. Aditya Andhalkar"
                className="mt-1 bg-background/30 backdrop-blur-md rounded-full h-10 px-4"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
              <Input value={data?.email ?? ""} disabled className="mt-1 bg-background/10 rounded-full h-10 px-4 border border-border/30 text-muted-foreground cursor-not-allowed" />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="mt-1 bg-background/30 backdrop-blur-md rounded-full h-10 px-4"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Bengaluru, India / Remote"
                className="mt-1 bg-background/30 backdrop-blur-md rounded-full h-10 px-4"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm({ ...form, gender: v })}
              >
                <SelectTrigger className="mt-1 bg-background/40 backdrop-blur-md border border-border/60 rounded-full h-10 px-4">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="NonBinary">Non‑binary</SelectItem>
                  <SelectItem value="PreferNotToSay">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Age</Label>
              <Input
                type="number"
                min="0"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="e.g. 26"
                className="mt-1 bg-background/30 backdrop-blur-md rounded-full h-10 px-4"
              />
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-border/20 space-y-4">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2 border-b border-border/10 pb-2">
              <Globe className="h-4.5 w-4.5 text-primary" /> Links & Portfolio
            </h3>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" /> LinkedIn URL
              </Label>
              <Input
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="mt-1 bg-background/30 backdrop-blur-md rounded-full h-10 px-4"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Github className="h-3.5 w-3.5 text-foreground" /> GitHub URL
              </Label>
              <Input
                value={form.github_url}
                onChange={(e) => setForm({ ...form, github_url: e.target.value })}
                placeholder="https://github.com/username"
                className="mt-1 bg-background/30 backdrop-blur-md rounded-full h-10 px-4"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-success" /> Personal Website
              </Label>
              <Input
                value={form.website_url}
                onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                placeholder="https://example.com"
                className="mt-1 bg-background/30 backdrop-blur-md rounded-full h-10 px-4"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Professional Profile & Preferences */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-border/20 space-y-4">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2 border-b border-border/10 pb-2">
              <Briefcase className="h-4.5 w-4.5 text-primary" /> Professional Details
            </h3>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Target Job Title</Label>
              <Input
                value={form.target_title}
                onChange={(e) => setForm({ ...form, target_title: e.target.value })}
                placeholder="e.g. Senior Backend Engineer"
                className="mt-1 bg-background/30 backdrop-blur-md rounded-full h-10 px-4"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Professional Bio / Summary</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Describe your technical background, core stack, and project highlights..."
                className="mt-1 bg-background/30 backdrop-blur-md min-h-[110px] rounded-2xl p-4"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <GraduationCap className="h-4.5 w-4.5 text-muted-foreground" /> Education
              </Label>
              <Input
                value={form.education}
                onChange={(e) => setForm({ ...form, education: e.target.value })}
                placeholder="e.g. B.Tech CSE — IIT Bombay"
                className="mt-1 bg-background/30 backdrop-blur-md rounded-full h-10 px-4"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Experience level</Label>
              <Select
                value={form.experience_level}
                onValueChange={(v) => setForm({ ...form, experience_level: v })}
              >
                <SelectTrigger className="mt-1 bg-background/40 backdrop-blur-md border border-border/60 rounded-full h-10 px-4">
                  <SelectValue placeholder="Pick one" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry (0-2y)</SelectItem>
                  <SelectItem value="mid">Mid (2-5y)</SelectItem>
                  <SelectItem value="senior">Senior (5-10y)</SelectItem>
                  <SelectItem value="staff">Staff+ (10y+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-border/20 space-y-4">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2 border-b border-border/10 pb-2">
              <Sparkles className="h-4.5 w-4.5 text-primary" /> Job Preferences
            </h3>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Job Search Status</Label>
              <Select
                value={form.job_search_status}
                onValueChange={(v) => setForm({ ...form, job_search_status: v })}
              >
                <SelectTrigger className="mt-1 bg-background/40 backdrop-blur-md border border-border/60 rounded-full h-10 px-4">
                  <SelectValue placeholder="Pick status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">🟢 Actively looking & applying</SelectItem>
                  <SelectItem value="open">🟡 Open to conversations & offers</SelectItem>
                  <SelectItem value="passive">🔴 Not looking for new roles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={save}
              disabled={saving}
              className="rounded-full h-12 px-6 shadow-md hover:shadow-lg transition-all text-sm font-semibold flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4.5 w-4.5" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </CandidateShell>
  );
}
