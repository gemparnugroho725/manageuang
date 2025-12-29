-- Safe migrations for type separation and description support
-- Columns (safe with IF NOT EXISTS)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.categories  ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.titles     ADD COLUMN IF NOT EXISTS type text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- Constraints: use DO blocks (ADD CONSTRAINT doesn't support IF NOT EXISTS)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_type_chk'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_type_chk
      CHECK (type IN ('income','expense','transfer'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_type_chk'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_type_chk
      CHECK (type IN ('income','expense'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'titles_type_chk'
  ) THEN
    ALTER TABLE public.titles
      ADD CONSTRAINT titles_type_chk
      CHECK (type IN ('income','expense'));
  END IF;
END $$;

-- Optional: validate existing data before constraints (runs only if needed)
-- Example: ensure transactions.type uses allowed values or NULL
-- UPDATE public.transactions SET type = NULL WHERE type NOT IN ('income','expense','transfer');
-- UPDATE public.categories  SET type = NULL WHERE type NOT IN ('income','expense');
-- UPDATE public.titles     SET type = NULL WHERE type NOT IN ('income','expense');

-- Data migration: set existing categories & titles to 'expense'
-- This ensures current lists default to Expense until you reclassify.
UPDATE public.categories SET type = 'expense'
  WHERE type IS NULL OR type NOT IN ('income','expense');
UPDATE public.titles SET type = 'expense'
  WHERE type IS NULL OR type NOT IN ('income','expense');

-- Verify (run in SQL editor separately):
-- SELECT conname, convalidated FROM pg_constraint
--   WHERE conname IN ('transactions_type_chk','categories_type_chk','titles_type_chk');
-- SELECT COUNT(*) FROM public.categories WHERE type='expense';
-- SELECT COUNT(*) FROM public.titles WHERE type='expense';
