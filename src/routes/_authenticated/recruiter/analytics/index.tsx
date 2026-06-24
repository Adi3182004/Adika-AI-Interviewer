import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { RecruiterShell } from "@/components/RecruiterShell";
import { supabase } from "@/integrations/supabase/client";

const STAGES = ["new", "screen", "interview", "offer", "hired", "rejected"] as const;

export const Route = createFileRoute("/_authenticated/recruiter/analytics/")({
  head: () => ({ meta: [{ title: "Analytics — Recruiter" }] }),
  component: Analytics,
});

function Analytics() {
  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [apps, jobs] = await Promise.all([
        supabase.from("applications").select("stage,match_score,created_at,jobs!inner(recruiter_id)").eq("jobs.recruiter_id", u.user.id),
        supabase.from("jobs").select("id,status").eq("recruiter_id", u.user.id),
      ]);
      return { apps: apps.data ?? [], jobs: jobs.data ?? [] };
    },
  });

  const funnel = STAGES.map(s => ({ stage: s, count: (data?.apps ?? []).filter(a => a.stage === s).length }));
  const avgMatch = data?.apps.length ? Math.round(data.apps.reduce((s, a) => s + (a.match_score ?? 0), 0) / data.apps.length) : 0;
  const conversion = data?.apps.length ? Math.round(((data.apps.filter(a => a.stage === "hired").length) / data.apps.length) * 100) : 0;

  return (
    <RecruiterShell eyebrow="Hiring performance" title={<span><span className="text-gold">Analytics</span></span>}>
      <div className="grid gap-6 md:grid-cols-3">
        <Kpi label="Total applicants" value={`${data?.apps.length ?? 0}`} />
        <Kpi label="Average match" value={avgMatch ? `${avgMatch}` : "—"} />
        <Kpi label="Hire conversion" value={`${conversion}%`} />
      </div>

      <div className="glass mt-8 rounded-2xl p-6">
        <p className="font-medium text-gold">Pipeline funnel</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <BarChart data={funnel}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="stage" stroke="rgba(255,255,255,0.4)" />
              <YAxis stroke="rgba(255,255,255,0.4)" />
              <Tooltip contentStyle={{ background: "#15111C", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Bar dataKey="count" fill="#C9A86A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </RecruiterShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl text-gold">{value}</p>
    </div>
  );
}
