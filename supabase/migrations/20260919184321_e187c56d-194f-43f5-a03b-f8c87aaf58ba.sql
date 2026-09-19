
-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- providers (global catalog rows have user_id NULL)
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  credential_type text NOT NULL DEFAULT 'api_key',
  website_url text,
  docs_url text,
  icon_url text,
  description text,
  test_endpoint text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX providers_slug_scope ON public.providers (slug, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.providers TO authenticated;
GRANT ALL ON public.providers TO service_role;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read catalog and own providers" ON public.providers FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "insert own providers" ON public.providers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own providers" ON public.providers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own providers" ON public.providers FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER providers_touch BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- collections
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX collections_user_name ON public.collections (user_id, lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own collections" ON public.collections FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- actors
CREATE TABLE public.actors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX actors_user_name ON public.actors (user_id, lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actors TO authenticated;
GRANT ALL ON public.actors TO service_role;
ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own actors" ON public.actors FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- api_keys
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers ON DELETE RESTRICT,
  collection_id uuid REFERENCES public.collections ON DELETE SET NULL,
  name text NOT NULL,
  credential_type text NOT NULL DEFAULT 'api_key',
  secret_ciphertext text NOT NULL,
  secret_hint text NOT NULL DEFAULT '',
  actor text,
  environment text NOT NULL DEFAULT 'development',
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  description text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_used_at timestamptz,
  usage_count integer NOT NULL DEFAULT 0,
  last_test_status text,
  last_test_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_user_idx ON public.api_keys (user_id, created_at DESC);
CREATE INDEX api_keys_provider_idx ON public.api_keys (provider_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own keys" ON public.api_keys FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER api_keys_touch BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- versions
CREATE TABLE public.api_key_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  key_id uuid NOT NULL REFERENCES public.api_keys ON DELETE CASCADE,
  version integer NOT NULL,
  secret_ciphertext text NOT NULL,
  secret_hint text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz,
  revoked_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_key_versions TO authenticated;
GRANT ALL ON public.api_key_versions TO service_role;
ALTER TABLE public.api_key_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own versions" ON public.api_key_versions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- api tokens
CREATE TABLE public.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  allowed_providers text[] NOT NULL DEFAULT '{}',
  allowed_environments text[] NOT NULL DEFAULT '{}',
  allowed_collections text[] NOT NULL DEFAULT '{}',
  rate_limit_per_hour integer NOT NULL DEFAULT 600,
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_tokens TO authenticated;
GRANT ALL ON public.api_tokens TO service_role;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tokens" ON public.api_tokens FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- key pools
CREATE TABLE public.key_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers ON DELETE CASCADE,
  strategy text NOT NULL DEFAULT 'round_robin',
  sticky_ttl_seconds integer NOT NULL DEFAULT 300,
  rr_cursor integer NOT NULL DEFAULT 0,
  skip_unhealthy boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX key_pools_user_provider ON public.key_pools (user_id, provider_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_pools TO authenticated;
GRANT ALL ON public.key_pools TO service_role;
ALTER TABLE public.key_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pools" ON public.key_pools FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- usage logs
CREATE TABLE public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  token_id uuid REFERENCES public.api_tokens ON DELETE SET NULL,
  token_name text,
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  provider_slug text,
  key_id uuid,
  key_name text,
  strategy text,
  status_code integer NOT NULL DEFAULT 200,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX usage_user_time ON public.api_usage_logs (user_id, created_at DESC);
GRANT SELECT ON public.api_usage_logs TO authenticated;
GRANT ALL ON public.api_usage_logs TO service_role;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage" ON public.api_usage_logs FOR SELECT TO authenticated USING (user_id = auth.uid());

-- audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_user_time ON public.audit_logs (user_id, created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own audit" ON public.audit_logs FOR SELECT TO authenticated USING (user_id = auth.uid());

-- provider catalog seed
INSERT INTO public.providers (name, slug, category, credential_type, website_url, docs_url) VALUES
('Claude Code','claude-code','coding','api_key','https://claude.ai/code','https://docs.anthropic.com'),
('Antigravity','antigravity','coding','api_key','https://antigravity.google',NULL),
('Qoder','qoder','coding','api_key','https://qoder.com',NULL),
('OpenAI Codex','openai-codex','coding','api_key','https://openai.com/codex','https://platform.openai.com/docs'),
('GitHub Copilot','github-copilot','coding','token','https://github.com/features/copilot','https://docs.github.com/copilot'),
('Cursor IDE','cursor','coding','api_key','https://cursor.com',NULL),
('Kilo Code','kilo-code','coding','api_key','https://kilocode.ai',NULL),
('Cline','cline','coding','api_key','https://cline.bot',NULL),
('ClinePass','clinepass','coding','api_key','https://cline.bot',NULL),
('CodeBuddy','codebuddy','coding','api_key','https://copilot.tencent.com',NULL),
('CodeBuddy CN','codebuddy-cn','coding','api_key','https://copilot.tencent.com',NULL),
('Kimi','kimi','ai','api_key','https://platform.moonshot.cn',NULL),
('Grok CLI (Grok Build)','grok-cli','ai','api_key','https://x.ai',NULL),
('xAI (Grok)','xai','ai','api_key','https://x.ai','https://docs.x.ai'),
('Xiaomi MiMo','xiaomi-mimo','ai','api_key','https://xiaomimimo.com',NULL),
('Gemini','gemini','ai','api_key','https://aistudio.google.com/apikey','https://ai.google.dev/docs'),
('OpenAI','openai','ai','api_key','https://platform.openai.com/api-keys','https://platform.openai.com/docs'),
('Anthropic','anthropic','ai','api_key','https://console.anthropic.com/settings/keys','https://docs.anthropic.com'),
('Google Gemini','google-gemini','ai','api_key','https://aistudio.google.com/apikey','https://ai.google.dev/docs'),
('GitHub','github','developer','token','https://github.com/settings/tokens','https://docs.github.com/rest'),
('GitLab','gitlab','developer','token','https://gitlab.com/-/user_settings/personal_access_tokens',NULL),
('Groq','groq','ai','api_key','https://console.groq.com/keys',NULL),
('Cloudflare','cloudflare','cloud','token','https://dash.cloudflare.com/profile/api-tokens',NULL),
('Discord','discord','automation','bot_token','https://discord.com/developers/applications',NULL),
('Telegram','telegram','automation','bot_token','https://core.telegram.org/bots',NULL),
('Resend','resend','developer','api_key','https://resend.com/api-keys',NULL),
('Hugging Face','huggingface','ai','token','https://huggingface.co/settings/tokens',NULL),
('Replicate','replicate','ai','api_key','https://replicate.com/account/api-tokens',NULL),
('Supabase','supabase','cloud','api_key','https://supabase.com/dashboard',NULL),
('Vercel','vercel','cloud','token','https://vercel.com/account/tokens',NULL),
('Netlify','netlify','cloud','token','https://app.netlify.com/user/applications',NULL),
('AWS','aws','cloud','custom','https://console.aws.amazon.com',NULL),
('Google Cloud','google-cloud','cloud','custom','https://console.cloud.google.com',NULL),
('Microsoft Azure','azure','cloud','custom','https://portal.azure.com',NULL),
('DeepSeek','deepseek','ai','api_key','https://platform.deepseek.com',NULL),
('Mistral','mistral','ai','api_key','https://console.mistral.ai',NULL),
('Cohere','cohere','ai','api_key','https://dashboard.cohere.com/api-keys',NULL),
('Custom Provider','custom','custom','custom',NULL,NULL);
