import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown, Eye, EyeOff, Loader2, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { createKey, updateKey } from "@/lib/vault.functions";
import { collectionsQuery, providersQuery, type KeyRow } from "@/lib/queries";
import { CREDENTIAL_TYPES, ENVIRONMENTS, KEY_STATUSES } from "@/lib/vault-constants";
import { ProviderIcon } from "./ProviderIcon";
import { ProviderDrawer } from "./ProviderDrawer";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: KeyRow | null;
  defaultProviderId?: string;
};

export function KeyDrawer({ open, onOpenChange, editing, defaultProviderId }: Props) {
  const qc = useQueryClient();
  const create = useServerFn(createKey);
  const update = useServerFn(updateKey);
  const { data: providers = [] } = useQuery(providersQuery);
  const { data: collections = [] } = useQuery(collectionsQuery);

  const [providerOpen, setProviderOpen] = useState(false);
  const [providerDrawer, setProviderDrawer] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState({
    name: "",
    provider_id: defaultProviderId ?? "",
    secret: "",
    credential_type: "api_key",
    actor: "",
    environment: "development",
    collection_id: "",
    tags: "",
    status: "active",
    expires_at: "",
    description: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setShowSecret(false);
    setErrors({});
    if (editing) {
      setForm({
        name: editing.name,
        provider_id: editing.provider_id,
        secret: "",
        credential_type: editing.credential_type,
        actor: editing.actor ?? "",
        environment: editing.environment,
        collection_id: editing.collection_id ?? "",
        tags: editing.tags.join(", "),
        status: editing.status,
        expires_at: editing.expires_at ? editing.expires_at.slice(0, 10) : "",
        description: editing.description ?? "",
        notes: editing.notes ?? "",
      });
    } else {
      setForm((f) => ({
        ...f,
        name: "",
        secret: "",
        provider_id: defaultProviderId ?? "",
        tags: "",
        expires_at: "",
        description: "",
        notes: "",
      }));
    }
  }, [open, editing, defaultProviderId]);

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === form.provider_id),
    [providers, form.provider_id],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      const payload = {
        name: form.name,
        provider_id: form.provider_id,
        credential_type: form.credential_type,
        actor: form.actor || null,
        environment: form.environment,
        collection_id: form.collection_id || null,
        tags,
        status: form.status as "active" | "disabled" | "revoked",
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        description: form.description || null,
        notes: form.notes || null,
      };
      if (editing) return update({ data: { id: editing.id, ...payload } });
      if (form.actor) {
        await supabase
          .from("actors")
          .insert({ user_id: (await supabase.auth.getUser()).data.user!.id, name: form.actor })
          .then(() => undefined, () => undefined);
      }
      return create({ data: { ...payload, secret: form.secret, metadata: {} } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keys"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      qc.invalidateQueries({ queryKey: ["actors"] });
      toast.success(editing ? "Credential updated" : "Credential added to your vault");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message || "Something went wrong"),
  });

  function submit() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next["name"] = "Name is required";
    if (!form.provider_id) next["provider_id"] = "Provider is required";
    if (!editing && !form.secret.trim()) next["secret"] = "Secret is required";
    if (form.expires_at && Number.isNaN(Date.parse(form.expires_at)))
      next["expires_at"] = "Invalid date";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    mutation.mutate();
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle>{editing ? "Edit credential" : "Add credential"}</SheetTitle>
            <SheetDescription>
              {editing
                ? "Update metadata. Use Rotate on the detail page to replace the secret."
                : "Secrets are encrypted server-side before they are stored."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                value={form.name}
                placeholder="Gemini #01"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors["name"] ? <p className="text-xs text-destructive">{errors["name"]}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Popover open={providerOpen} onOpenChange={setProviderOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {selectedProvider ? (
                      <span className="flex items-center gap-2">
                        <ProviderIcon
                          size="sm"
                          name={selectedProvider.name}
                          slug={selectedProvider.slug}
                          iconUrl={selectedProvider.icon_url}
                        />
                        {selectedProvider.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select a provider</span>
                    )}
                    <ChevronsUpDown className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search providers…" />
                    <CommandList>
                      <CommandEmpty>No provider found.</CommandEmpty>
                      <CommandGroup>
                        {providers.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.name} ${p.slug}`}
                            onSelect={() => {
                              setForm({
                                ...form,
                                provider_id: p.id,
                                credential_type: p.credential_type,
                              });
                              setProviderOpen(false);
                            }}
                          >
                            <ProviderIcon size="sm" name={p.name} slug={p.slug} iconUrl={p.icon_url} />
                            <span className="flex-1">{p.name}</span>
                            {form.provider_id === p.id ? <Check className="size-4" /> : null}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup>
                        <CommandItem
                          value="create custom provider"
                          onSelect={() => {
                            setProviderOpen(false);
                            setProviderDrawer(true);
                          }}
                        >
                          <Plus className="size-4" /> Create custom provider
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors["provider_id"] ? (
                <p className="text-xs text-destructive">{errors["provider_id"]}</p>
              ) : null}
            </div>

            {!editing ? (
              <div className="space-y-1.5">
                <Label htmlFor="key-secret">Secret</Label>
                <div className="flex gap-2">
                  <Input
                    id="key-secret"
                    type={showSecret ? "text" : "password"}
                    autoComplete="off"
                    className="font-mono"
                    value={form.secret}
                    onChange={(e) => setForm({ ...form, secret: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSecret((s) => !s)}
                  >
                    {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
                {errors["secret"] ? (
                  <p className="text-xs text-destructive">{errors["secret"]}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Stored encrypted; never written to logs or the browser.
                  </p>
                )}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label htmlFor="key-actor">Actor</Label>
                <Input
                  id="key-actor"
                  list="actor-options"
                  placeholder="ai-worker"
                  value={form.actor}
                  onChange={(e) => setForm({ ...form, actor: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Environment</Label>
                <Select
                  value={form.environment}
                  onValueChange={(v) => setForm({ ...form, environment: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENTS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Collection</Label>
                <Select
                  value={form.collection_id || "none"}
                  onValueChange={(v) => setForm({ ...form, collection_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No collection</SelectItem>
                    {collections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KEY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="key-exp">Expiration date</Label>
                <Input
                  id="key-exp"
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
                {errors["expires_at"] ? (
                  <p className="text-xs text-destructive">{errors["expires_at"]}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="key-tags">Tags</Label>
              <Input
                id="key-tags"
                placeholder="gemini, ai, production"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
              <div className="flex flex-wrap gap-1">
                {form.tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t) => (
                    <Badge key={t} variant="secondary" className="font-normal">
                      {t}
                    </Badge>
                  ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="key-desc">Description</Label>
              <Textarea
                id="key-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="key-notes">Notes</Label>
              <Textarea
                id="key-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Add credential"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <ProviderDrawer
        open={providerDrawer}
        onOpenChange={setProviderDrawer}
        onCreated={(id) => setForm((f) => ({ ...f, provider_id: id }))}
      />
    </>
  );
}
