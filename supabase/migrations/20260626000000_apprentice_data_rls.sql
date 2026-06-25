-- apprentice_data_rls — owner-scoped read access to students/resumes for
-- authenticated apprentices, plus staff read-all. Fulfils the "FUTURE" note left
-- in 20260624115652_students_resumes.sql now that accounts exist.
--
-- In-app reads/writes are server-mediated (Drizzle over DATABASE_URL bypasses
-- RLS; resume files are served via short-lived signed URLs minted server-side
-- after an ownership check). These policies are defense-in-depth and enable any
-- future direct client reads. Writes/uploads stay on the server (service role).

-- Authenticated users may read their own student row; staff read all.
create policy "students select own" on public.students
  for select to authenticated using (user_id = auth.uid());
create policy "students staff all" on public.students
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Resumes inherit their student's ownership.
create policy "resumes select own" on public.resumes
  for select to authenticated using (
    exists (
      select 1 from public.students s
      where s.id = resumes.student_id and s.user_id = auth.uid()
    )
  );
create policy "resumes staff all" on public.resumes
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Table privileges so the policies above are usable by signed-in users (RLS
-- still gates the rows). The anon/public resume-intake path keeps using the
-- service role, so anon needs nothing here.
grant select on public.students, public.resumes to authenticated;
