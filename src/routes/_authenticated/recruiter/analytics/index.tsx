import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Download } from "lucide-react";
import { RecruiterShell } from "@/components/RecruiterShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTeamRecruiterIds } from "@/hooks/use-team-recruiter-ids";

const STAGES = ["new", "screen", "interview", "offer", "hired", "rejected"] as const;

export const Route = createFileRoute("/_authenticated/recruiter/analytics/")({
  head: () => ({ meta: [{ title: "Analytics — Recruiter" }] }),
  component: Analytics,
});

function Analytics() {
  const { data: teamIds = [] } = useTeamRecruiterIds();
  const { data } = useQuery({
    queryKey: ["analytics", teamIds],
    enabled: teamIds.length > 0,
    queryFn: async () => {
      const [apps, jobs] = await Promise.all([
        supabase
          .from("applications")
          .select(
            "id,stage,match_score,created_at,updated_at,job_id,jobs!inner(id,title,recruiter_id)",
          )
          .in("jobs.recruiter_id", teamIds),
        supabase.from("jobs").select("id,title,status,created_at").in("recruiter_id", teamIds),
      ]);
      return { apps: (apps.data ?? []) as any[], jobs: jobs.data ?? [] };
    },
  });

  const apps = data?.apps ?? [];
  const jobs = data?.jobs ?? [];

  const funnel = STAGES.map((s) => ({ stage: s, count: apps.filter((a) => a.stage === s).length }));
  const avgMatch = apps.length
    ? Math.round(apps.reduce((s, a) => s + (a.match_score ?? 0), 0) / apps.length)
    : 0;
  const hired = apps.filter((a) => a.stage === "hired");
  const conversion = apps.length ? Math.round((hired.length / apps.length) * 100) : 0;

  // Time-to-hire (days) — updated_at - created_at for hired apps
  const ttHire = hired.length
    ? Math.round(
        hired.reduce(
          (s, a) => s + (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()),
          0,
        ) /
          hired.length /
          86_400_000,
      )
    : 0;

  // Applications over time (last 30 days)
  const timeline = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    apps.forEach((a) => {
      const k = new Date(a.created_at).toISOString().slice(0, 10);
      if (k in days) days[k]++;
    });
    return Object.entries(days).map(([date, count]) => ({ date: date.slice(5), count }));
  }, [apps]);

  // Per-job breakdown
  const perJob = jobs
    .map((j) => {
      const ja = apps.filter((a) => a.job_id === j.id);
      const jh = ja.filter((a) => a.stage === "hired").length;
      const ji = ja.filter((a) => a.stage === "interview").length;
      return {
        id: j.id,
        title: j.title,
        status: j.status,
        applicants: ja.length,
        interviews: ji,
        hires: jh,
        conv: ja.length ? Math.round((jh / ja.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.applicants - a.applicants);

  function exportCSV() {
    const rows = [
      ["Job", "Status", "Applicants", "Interviews", "Hires", "Conversion %"],
      ...perJob.map((r) => [r.title, r.status, r.applicants, r.interviews, r.hires, r.conv]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <RecruiterShell
      eyebrow="Hiring performance"
      title={
        <span>
          <span className="text-gold">Analytics</span>
        </span>
      }
    >
      <div className="grid gap-6 md:grid-cols-4">
        <Kpi label="Total applicants" value={`${apps.length}`} />
        <Kpi label="Average match" value={avgMatch ? `${avgMatch}` : "—"} />
        <Kpi label="Hire conversion" value={`${conversion}%`} />
        <Kpi label="Time to hire" value={hired.length ? `${ttHire}d` : "—"} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <p className="font-medium text-gold">Pipeline funnel</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={funnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="stage" stroke="rgba(255,255,255,0.4)" />
                <YAxis stroke="rgba(255,255,255,0.4)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#15111C",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="count" fill="#C9A86A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <p className="font-medium text-gold">Applications · last 30 days</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" />
                <YAxis stroke="rgba(255,255,255,0.4)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#15111C",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#C9A86A"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass mt-8 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <p className="font-medium text-gold">Per-job performance</p>
          <Button size="sm" variant="outline" onClick={exportCSV} className="rounded-full">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-2 text-left">Job</th>
                <th className="py-2 text-right">Applicants</th>
                <th className="py-2 text-right">Interviews</th>
                <th className="py-2 text-right">Hires</th>
                <th className="py-2 text-right">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {perJob.map((r) => (
                <tr key={r.id} className="border-b border-border/30">
                  <td className="py-3">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {r.status}
                    </p>
                  </td>
                  <td className="py-3 text-right">{r.applicants}</td>
                  <td className="py-3 text-right">{r.interviews}</td>
                  <td className="py-3 text-right">{r.hires}</td>
                  <td className="py-3 text-right text-gold">{r.conv}%</td>
                </tr>
              ))}
              {!perJob.length && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No jobs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
