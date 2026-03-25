-- ─── profiles ────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name         TEXT,
  avatar_url           TEXT,
  dietary_preferences  TEXT[]  DEFAULT '{}',
  allergies            TEXT[]  DEFAULT '{}',
  cooking_skill        TEXT    DEFAULT 'beginner'
                               CHECK (cooking_skill IN ('beginner','intermediate','advanced')),
  onboarding_complete  BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ─── sessions ─────────────────────────────────────────────────────────────────
CREATE TABLE public.sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredients JSONB NOT NULL DEFAULT '[]',
  diet_filter TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON public.sessions FOR ALL
  USING (auth.uid() = user_id);

-- ─── recipes ──────────────────────────────────────────────────────────────────
CREATE TABLE public.recipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  cook_time       TEXT NOT NULL,
  calories        TEXT NOT NULL,
  diet_match      TEXT NOT NULL,
  gradient_colors TEXT[] NOT NULL,
  badges          JSONB NOT NULL DEFAULT '[]',
  stats           JSONB NOT NULL DEFAULT '[]',
  ingredients     TEXT[] NOT NULL DEFAULT '{}',
  steps           TEXT[] NOT NULL DEFAULT '{}',
  image_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recipes"
  ON public.recipes FOR ALL
  USING (auth.uid() = user_id);

-- ─── saved_recipes ────────────────────────────────────────────────────────────
CREATE TABLE public.saved_recipes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id  UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  saved_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved recipes"
  ON public.saved_recipes FOR ALL
  USING (auth.uid() = user_id);

-- ─── Auto-create profile on sign-up ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
