-- Site-exclusive private instructional row compatibility. No content or answer keys in Git.
-- Preflight evidence: 83 existing canonical SITE-018..SITE-100 platform_labs book_code=SITE_EXCLUSIVE,
-- zero existing SITE rows in private lab_instruction_v014, CHECK book_number 1..3.
-- Do not change grants or RLS, existing editorial-reviewed rows, other books or answers.
DO $migration$
DECLARE con text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO con
  FROM pg_constraint c WHERE c.conrelid='public.lab_instruction_v014'::regclass
    AND c.conname='lab_instruction_v014_book_number_check';
  IF con IS NULL THEN RAISE EXCEPTION 'Private Lab book-number constraint missing; stop'; END IF;
  IF con NOT LIKE '%book_number <= 3%' AND con NOT LIKE '%book_number <= 6%' THEN
    RAISE EXCEPTION 'Unexpected private Lab book-number constraint: %',con;
  END IF;
  IF (SELECT count(*) FROM public.platform_labs
    WHERE lab_id BETWEEN 'SITE-018' AND 'SITE-100' AND book_code='SITE_EXCLUSIVE') <> 83 THEN
    RAISE EXCEPTION 'Canonical 83 Site-exclusive IDs changed; stop'; END IF;
  IF con LIKE '%book_number <= 3%' THEN
    ALTER TABLE public.lab_instruction_v014 DROP CONSTRAINT lab_instruction_v014_book_number_check;
    ALTER TABLE public.lab_instruction_v014 ADD CONSTRAINT lab_instruction_v014_book_number_check
      CHECK (book_number BETWEEN 1 AND 6);
  END IF;
END $migration$;
COMMENT ON CONSTRAINT lab_instruction_v014_book_number_check
 ON public.lab_instruction_v014 IS '1-3 Foundation books, 6 Site-exclusive original teaching; existing RLS and grading unchanged';