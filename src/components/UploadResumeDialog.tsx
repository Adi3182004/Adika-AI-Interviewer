import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { uploadAndParseResume } from "@/lib/ai.functions";

const ACCEPTED = ".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg";
const MAX_MB = 8;

export function UploadResumeDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const upload = useServerFn(uploadAndParseResume);
  const navigate = useNavigate();
  const qc = useQueryClient();

  function toDataUrl(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(f);
    });
  }

  async function handle() {
    if (!file) return toast.error("Choose a file");
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Max ${MAX_MB}MB`);
    setBusy(true);
    try {
      const dataUrl = await toDataUrl(file);
      const { resumeId } = await upload({
        data: {
          title: title || file.name.replace(/\.[^.]+$/, ""),
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileDataUrl: dataUrl,
        },
      });
      toast.success("Resume parsed");
      qc.invalidateQueries({ queryKey: ["resumes"] });
      setOpen(false);
      navigate({ to: "/candidate/resumes/$id", params: { id: resumeId } });
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    }
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <Upload className="mr-2 h-4 w-4" /> Upload resume
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload your resume</DialogTitle>
          <DialogDescription>
            PDF, DOCX, TXT or image. We'll parse it into editable sections and score it for ATS.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Title (optional)
            </label>
            <Input
              className="mt-1"
              placeholder="e.g. Backend Internship Resume"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 p-8 text-center text-sm hover:bg-accent/30">
            <FileText className="h-6 w-6 text-primary" />
            {file ? (
              <span className="font-medium">{file.name}</span>
            ) : (
              <>
                <span>Click to choose a file</span>
                <span className="text-xs text-muted-foreground">
                  PDF · DOCX · TXT · PNG · JPG (max {MAX_MB}MB)
                </span>
              </>
            )}
            <input
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button onClick={handle} disabled={busy || !file} className="w-full rounded-full">
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Parsing with AI…
              </>
            ) : (
              "Parse & analyze"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
