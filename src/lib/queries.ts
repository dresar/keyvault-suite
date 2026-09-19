import { supabase } from "@/integrations/supabase/client";

export type ProviderRow = {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  category: string;
  credential_type: string;
  website_url: string | null;
  docs_url: string | null;
  icon_url: string | null;
  description: string | null;
  is_active: boolean;
};

export type KeyRow = {
  id: string;
  name: string;
  provider_id: string;
  collection_id: string | null;
  credential_type: string;
  secret_hint: string;
  actor: string | null;
  environment: string;
  tags: string[];
  status: string;
  expires_at: string | null;
  description: string | null;
  notes: string | null;
  last_used_at: string | null;
  usage_count: number;
  last_test_status: string | null;
  last_test_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export const providersQuery = {
  queryKey: ["providers"],
  queryFn: async (): Promise<ProviderRow[]> => {
    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .order("name");
    if (error) throw error;
    return (data ?? []) as ProviderRow[];
  },
};

export const keysQuery = {
  queryKey: ["keys"],
  queryFn: async (): Promise<KeyRow[]> => {
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as KeyRow[];
  },
};

export const collectionsQuery = {
  queryKey: ["collections"],
  queryFn: async () => {
    const { data, error } = await supabase.from("collections").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  },
};

export const actorsQuery = {
  queryKey: ["actors"],
  queryFn: async () => {
    const { data, error } = await supabase.from("actors").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  },
};

export const tokensQuery = {
  queryKey: ["tokens"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("api_tokens")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

export const auditQuery = {
  queryKey: ["audit"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  },
};

export const usageQuery = {
  queryKey: ["usage"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("api_usage_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  },
};
