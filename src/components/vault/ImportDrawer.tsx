import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { importKeys } from "@/lib/vault.functions";

type Row = Record<string, unknown>;
type Result = {
  imported: string[];
  skipped: { row: number; name: string; reason: string }[];
  failed: { row: number; name: string; reason: string }[];
  dry_run: boolean;
};

function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = split(lines[0]!).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = split(line);
    const row: Row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

function parseInput(text: string): Row[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed as Row[];
    if (Array.isArray((parsed as { keys?: Row[] }).keys)) return (parsed as { keys: Row[] }).keys;
    return [parsed as Row];
  }
  return parseCsv(trimmed);
}

export function ImportDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const runImport = useServerFn(importKeys);
  const [step, setStep] = useState<"input" | "preview" | "result">("input");
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<Result | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setStep("input");
    setRaw("");
    setRows([]);
    setPreview(null);
    setResult(null);
  }

  async function validate() {
    let parsed: Row[] = [];
    try {
      parsed = parseInput(raw);
    } catch {
      toast.error("Could not read that data. Check the JSON or CSV format.");
      return;
    }
    if (parsed.length === 0) {
      toast.error("No rows found");
      return;
    }
    setRows(parsed);
    setBusy(true);
    try {
      const res = (await runImport({ data: { rows: parsed, dry_run: true } })) as Result;
      setPreview(res);
      setStep("preview");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    setBusy(true);
    try {
      const res = (await runImport({ data: { rows, dry_run: false } })) as Result;
      setResult(res);
      setStep("result");
      qc.invalidateQueries({ queryKey: ["keys"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    setRaw(await file.text());
  }

  const active = result ?? preview;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>Import credentials</SheetTitle>
          <SheetDescription>
            Paste JSON or CSV, or upload a file. Nothing is written until you confirm.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <ol className="flex items-center gap-2 text-xs text-muted-foreground">
            {["Input", "Preview", "Result"].map((label, i) => {
              const current = ["input", "preview", "result"].indexOf(step);
              return (
                <li
                  key={label}
                  className={
                    i <= current ? "font-medium text-foreground" : undefined
                  }
                >
                  {i + 1}. {label}
                  {i < 2 ? <span className="px-2 text-border">/</span> : null}
                </li>
              );
            })}
          </ol>

          {step === "input" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="import-file">Upload CSV or JSON</Label>
                <input
                  id="import-file"
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFile(f);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="import-raw">Or paste data</Label>
                <Textarea
                  id="import-raw"
                  rows={12}
                  className="font-mono text-xs"
                  placeholder={`name,provider,secret,actor,environment,collection,tags\nGemini #01,gemini,AIza...,ai-worker,production,AI Services,gemini|ai`}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Fields: name, provider, secret, actor, environment, collection, tags, status,
                  expires_at, description.
                </p>
              </div>
            </>
          ) : null}

          {step !== "input" && active ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className="bg-success/12 text-success" variant="secondary">
                  {active.imported.length} {result ? "imported" : "ready"}
                </Badge>
                <Badge variant="secondary">{active.skipped.length} skipped</Badge>
                <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                  {active.failed.length} failed
                </Badge>
              </div>
              <div className="rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Secret</th>
                      <th className="px-3 py-2 font-medium">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.imported.map((name, i) => (
                      <tr key={`ok-${i}`} className="border-t border-border">
                        <td className="px-3 py-1.5">{i + 1}</td>
                        <td className="px-3 py-1.5">{name}</td>
                        <td className="px-3 py-1.5 font-mono">••••••••</td>
                        <td className="px-3 py-1.5 text-success">{result ? "Imported" : "Valid"}</td>
                      </tr>
                    ))}
                    {active.skipped.map((r) => (
                      <tr key={`sk-${r.row}`} className="border-t border-border">
                        <td className="px-3 py-1.5">{r.row}</td>
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5 font-mono">••••••••</td>
                        <td className="px-3 py-1.5 text-muted-foreground">Skipped — {r.reason}</td>
                      </tr>
                    ))}
                    {active.failed.map((r) => (
                      <tr key={`fa-${r.row}`} className="border-t border-border">
                        <td className="px-3 py-1.5">{r.row}</td>
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5 font-mono">••••••••</td>
                        <td className="px-3 py-1.5 text-destructive">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-border px-5 py-4">
          {step === "input" ? (
            <Button onClick={validate} disabled={busy || !raw.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Validate
            </Button>
          ) : null}
          {step === "preview" ? (
            <>
              <Button variant="ghost" onClick={() => setStep("input")}>
                Back
              </Button>
              <Button onClick={commit} disabled={busy || (preview?.imported.length ?? 0) === 0}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Import {preview?.imported.length ?? 0} credentials
              </Button>
            </>
          ) : null}
          {step === "result" ? (
            <Button
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Done
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
