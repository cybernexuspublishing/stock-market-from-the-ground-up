-- v0.6 Book Key generator — returns all three newly generated plaintext keys in ONE result grid.
-- Run only when you intentionally want to create new keys. Save the plaintext output immediately.
-- Existing keys are not deleted or deactivated by this script.

select * from public.admin_generate_book_key('FOUNDATION_BOOK_1','Foundation Book I',null,null)
union all
select * from public.admin_generate_book_key('FOUNDATION_BOOK_2','Foundation Book II',null,null)
union all
select * from public.admin_generate_book_key('FOUNDATION_BOOK_3','Foundation Book III',null,null);
