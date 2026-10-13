-- v0.2 migration: allow a signed-in user to reset/delete only their own lab progress row.
-- Required for the Lab Registry "Not started" reset action.

drop policy if exists "delete own progress" on public.lab_progress;
create policy "delete own progress"
on public.lab_progress
for delete
using (auth.uid() = user_id);
