ALTER TABLE public.site_conteudo
ADD COLUMN IF NOT EXISTS hero_source text NOT NULL DEFAULT 'slides';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'site_conteudo_hero_source_check'
      AND conrelid = 'public.site_conteudo'::regclass
  ) THEN
    ALTER TABLE public.site_conteudo
    ADD CONSTRAINT site_conteudo_hero_source_check
    CHECK (hero_source IN ('slides', 'estoque'))
    NOT VALID;
  END IF;
END $$;

ALTER TABLE public.site_conteudo
VALIDATE CONSTRAINT site_conteudo_hero_source_check;
