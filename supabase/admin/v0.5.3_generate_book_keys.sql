-- Generate one shared Book Key per Foundations book.
-- Run these manually in Supabase SQL Editor and save the plaintext keys securely.
-- The database stores only SHA-256 hashes.

select * from public.admin_generate_book_key(
  'FOUNDATION_BOOK_1',
  'Foundation Book I',
  null,
  null
);

select * from public.admin_generate_book_key(
  'FOUNDATION_BOOK_2',
  'Foundation Book II',
  null,
  null
);

select * from public.admin_generate_book_key(
  'FOUNDATION_BOOK_3',
  'Foundation Book III',
  null,
  null
);
