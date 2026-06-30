import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export async function exportInterviewReport(sessionId: string) {
  const { data: session, error: e1 } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (e1 || !session) throw new Error("Session not found");

  const { data: messages, error: e2 } = await supabase
    .from("interview_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at");
  if (e2) throw new Error(e2.message);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const MARGIN = 48;
  const MAX_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  function ensureSpace(h: number) {
    if (y + h > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }
  function text(
    t: string,
    size: number,
    opts: { bold?: boolean; color?: [number, number, number]; gap?: number } = {},
  ) {
    doc.setFontSize(size);
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setTextColor(...(opts.color ?? [20, 20, 20]));
    const lines = doc.splitTextToSize(t, MAX_W);
    ensureSpace(lines.length * (size * 1.25));
    doc.text(lines, MARGIN, y);
    y += lines.length * (size * 1.25) + (opts.gap ?? 4);
  }
  function rule() {
    ensureSpace(12);
    doc.setDrawColor(220);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 12;
  }

  // Header
  text("Adika AI — Interview Report", 22, { bold: true, gap: 6 });
  const company = (session as any).company as string | null;
  const exp = (session as any).experience_level as string | null;
  text(`${session.role_target}${company ? ` · ${company}` : ""}${exp ? ` · ${exp}` : ""}`, 12, {
    color: [110, 110, 110],
    gap: 2,
  });
  text(new Date(session.created_at).toLocaleString(), 10, { color: [140, 140, 140], gap: 10 });
  rule();

  // Scores
  text("Final Scores", 14, { bold: true, gap: 6 });
  text(
    `Overall: ${session.overall_score ?? "—"}    Readiness: ${session.readiness_score ?? "—"}    Questions: ${session.question_count ?? 0}/10    Status: ${session.status}`,
    11,
    { gap: 10 },
  );

  if (session.summary) {
    text("Teacher's Summary", 14, { bold: true, gap: 6 });
    text(session.summary, 11, { gap: 10 });
  }
  if (session.strengths?.length) {
    text("Strengths", 12, { bold: true, gap: 4 });
    text("• " + session.strengths.join("\n• "), 11, { gap: 8 });
  }
  if (session.gaps?.length) {
    text("Skills to build", 12, { bold: true, color: [180, 90, 40], gap: 4 });
    text("• " + session.gaps.join("\n• "), 11, { gap: 10 });
  }
  rule();

  // Transcript pairs
  text("Question-by-question", 14, { bold: true, gap: 8 });
  let qIdx = 0;
  const msgs = messages ?? [];
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.role === "assistant") {
      qIdx++;
      ensureSpace(40);
      text(`Q${qIdx}. ${m.content}`, 12, { bold: true, gap: 4 });
    } else if (m.role === "user") {
      text(`Your answer: ${m.content}`, 11, { gap: 4 });
      if (m.score != null) {
        text(`Score: ${m.score}/100`, 10, { bold: true, color: [40, 110, 60], gap: 4 });
      }
      const sig = (m.signals ?? {}) as any;
      if (sig.feedback) text(`Feedback: ${sig.feedback}`, 10, { color: [80, 80, 80], gap: 3 });
      if (sig.what_was_good?.length) {
        text("What worked: " + sig.what_was_good.join("; "), 10, { color: [40, 110, 60], gap: 3 });
      }
      if (sig.what_to_improve?.length) {
        text("Improve: " + sig.what_to_improve.join("; "), 10, { color: [180, 90, 40], gap: 3 });
      }
      if (sig.ideal_answer_sketch) {
        text(`Model answer: ${sig.ideal_answer_sketch}`, 10, { color: [60, 60, 130], gap: 10 });
      } else {
        y += 6;
      }
    }
  }

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(9);
    doc.setTextColor(160);
    doc.text(`Adika AI · Page ${p}/${pages}`, PAGE_W / 2, PAGE_H - 20, { align: "center" });
  }

  const safe = `${session.role_target}-${company ?? "session"}`
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
  doc.save(`adika-interview-${safe}-${sessionId.slice(0, 8)}.pdf`);
}
