import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Target, CheckCircle2, Circle, ArrowRight, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/candidate/readiness/")({
  head: () => ({ meta: [{ title: "Readiness Hub — Adika AI" }] }),
  component: ReadinessPage,
});

const PILLARS = [
  { name: "Resume strength", score: 86, weight: 0.15 },
  { name: "Skill coverage", score: 71, weight: 0.25 },
  { name: "Interview performance", score: 78, weight: 0.30 },
  { name: "Communication", score: 84, weight: 0.15 },
  { name: "Domain knowledge", score: 68, weight: 0.15 },
];

const overall = Math.round(PILLARS.reduce((s, p) => s + p.score * p.weight, 0));

type Item = { id: string; done: boolean; label: string };

const INITIAL: Item[] = [
  { id: "1", done: true, label: "Uploaded primary resume" },
  { id: "2", done: true, label: "Completed 7 of 10 adaptive interview rounds" },
  { id: "3", done: true, label: "Closed 3 skill gaps (Postgres, Observability, Testing)" },
  { id: "4", done: false, label: "Reach 85+ on system design rubric (currently 78)" },
  { id: "5", done: false, label: "Ship a Go side-project to validate gap-closure" },
  { id: "6", done: false, label: "Complete a Stripe-style mock loop end-to-end" },
];

function ReadinessPage() {
  const [items, setItems] = useState<Item[]>(INITIAL);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const toggle = (id: string) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const remove = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id));
  const startEdit = (it: Item) => {
    setEditingId(it.id);
    setEditText(it.label);
  };
  const saveEdit = () => {
    if (!editingId) return;
    setItems((xs) => xs.map((x) => (x.id === editingId ? { ...x, label: editText.trim() || x.label } : x)));
    setEditingId(null);
  };
  const addNew = () => {
    const t = newText.trim();
    if (!t) return;
    setItems((xs) => [...xs, { id: crypto.randomUUID(), done: false, label: t }]);
    setNewText("");
    setAdding(false);
  };

  return (
    <CandidateShell eyebrow="Readiness hub" title="One number that tells you if you're ready">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="glass rounded-2xl p-8 text-center">
          <Target className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Senior Backend · target</p>
          <p className="mt-2 font-display text-7xl">
            {overall}
            <span className="text-2xl text-muted-foreground">%</span>
          </p>
          <Badge className="mt-3 bg-primary/15 text-primary">On track · 7 / 10 sessions</Badge>
          <p className="mt-4 text-sm text-muted-foreground">
            You're 9 points away from the typical bar for this role. Closing two pillars below would put you over.
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-primary">Readiness pillars</p>
          <div className="mt-4 space-y-4">
            {PILLARS.map((p) => (
              <div key={p.name}>
                <div className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">
                    {p.score} <span className="text-[10px]">· weight {Math.round(p.weight * 100)}%</span>
                  </span>
                </div>
                <Progress value={p.score} className="mt-1 h-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass mt-6 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-primary">What to do this week</p>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => setAdding((v) => !v)}>
              <Plus className="mr-1 h-3 w-3" /> Add task
            </Button>
            <Link to="/candidate/interviews" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Start next session <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {adding && (
          <div className="mt-4 flex gap-2">
            <Input
              autoFocus
              placeholder="e.g. Practice 2 hard-tier DSA problems"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNew()}
            />
            <Button size="sm" onClick={addNew}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewText(""); }}>Cancel</Button>
          </div>
        )}

        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="group flex items-start gap-2 rounded-xl border border-border/40 bg-card/40 p-3 text-sm"
            >
              <button
                type="button"
                onClick={() => toggle(c.id)}
                className="mt-0.5 shrink-0"
                aria-label={c.done ? "Mark not done" : "Mark done"}
              >
                {c.done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                )}
              </button>

              {editingId === c.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    className="h-7"
                  />
                  <Button size="sm" variant="ghost" onClick={saveEdit}><Check className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                </div>
              ) : (
                <>
                  <span className={`flex-1 ${c.done ? "text-muted-foreground line-through" : ""}`}>{c.label}</span>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => startEdit(c)} className="text-muted-foreground hover:text-primary" aria-label="Edit">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </CandidateShell>
  );
}
