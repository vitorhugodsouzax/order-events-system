DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
