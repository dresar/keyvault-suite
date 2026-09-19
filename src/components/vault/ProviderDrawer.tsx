import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CREDENTIAL_TYPES } from "@/lib/vault-constants";
import type { ProviderRow } from "@/lib/queries";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProviderDrawer({
  open,
  onOpenChange,
  editing,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: ProviderRow | null;
  onCreated?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    credential_type: "api_key",
    category: "custom",
    website_url: "",
    docs_url: "",
    icon_url: "",
    description: "",
    test_endpoint: "",
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      editing
        ? {
            name: editing.name,
            slug: editing.slug,
            credential_type: editing.credential_type,
            category: editing.category,
            website_url: editing.website_url ?? "",
            docs_url: editing.docs_url ?? "",
            icon_url: editing.icon_url ?? "",
            description: editing.description ?? "",
            test_endpoint: "",
            is_active: editing.is_active,
          }
        : {
            name: "",
            slug: "",
            credential_type: "api_key",
            category: "custom",
            website_url: "",
            docs_url: "",
            icon_url: "",
            description: "",
            test_endpoint: "",
            is_active: true,
          },
    );
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user!.id;
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        credential_type: form.credential_type,
        category: form.category,
        website_url: form.website_url || null,
        docs_url: form.docs_url || null,
        icon_url: form.icon_url || null,
        description: form.description || null,
        test_endpoint: form.test_endpoint || null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from("providers").update(payload).eq("id", editing.id);
        if (error) throw error;
        return editing.id;
      }
      const { data, error } = await supabase
        .from("providers")
        .insert({ ...payload, user_id: userId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      toast.success(editing ? "Provider updated" : "Provider created");
      onCreated?.(id);
      onOpenChange(false);
    },
    onError: (err: Error) =>
      toast.error(
        /duplicate|unique/i.test(err.message) ? "That slug is already used" : err.message,
      ),
  });

  function submit() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next["name"] = "Provider name is required";
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>{editing ? "Edit provider" : "Add provider"}</SheetTitle>
          <SheetDescription>
            Custom providers appear immediately in the credential form.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Provider name</Label>
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  name: e.target.value,
                  slug: editing ? f.slug : slugify(e.target.value),
                }))
              }
            />
            {errors["name"] ? <p className="text-xs text-destructive">{errors["name"]}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-slug">Slug</Label>
            <Input
              id="p-slug"
              className="font-mono"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Credential type</Label>
            <Select
              value={form.credential_type}
              onValueChange={(v) => setForm({ ...form, credential_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREDENTIAL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-web">Website URL</Label>
            <Input
              id="p-web"
              placeholder="https://"
              value={form.website_url}
              onChange={(e) => setForm({ ...form, website_url: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-docs">Documentation URL</Label>
            <Input
              id="p-docs"
              placeholder="https://"
              value={form.docs_url}
              onChange={(e) => setForm({ ...form, docs_url: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-icon">Icon URL (optional)</Label>
            <Input
              id="p-icon"
              placeholder="https://"
              value={form.icon_url}
              onChange={(e) => setForm({ ...form, icon_url: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea
              id="p-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Show this provider in the catalog</p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {editing ? "Save provider" : "Create provider"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
