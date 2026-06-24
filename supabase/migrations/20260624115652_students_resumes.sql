-- students + resumes, and the private Storage bucket for resume files.
--
-- The first platform feature collects a student's name, email, and resume. The
-- file goes into the `resumes` Storage bucket; the row in public.resumes points
-- at it. Both tables have RLS enabled and DENY by default — all access today
-- goes through the server (service role, which bypasses RLS). When student auth
-- lands, add owner-scoped policies (see the commented templates at the bottom).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.students (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists students_email_idx on public.students (email);

create table if not exists public.resumes (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students (id) on delete cascade,
  storage_path text not null,
  filename     text not null,
  content_type text not null,
  size_bytes   integer not null,
  created_at   timestamptz not null default now()
);
create index if not exists resumes_student_id_idx on public.resumes (student_id);

-- RLS on, no policies yet → only the service role can read/write. Anon and any
-- future authenticated role are denied until we add explicit policies.
alter table public.students enable row level security;
alter table public.resumes  enable row level security;

-- ---------------------------------------------------------------------------
-- Storage bucket for resume files (private; never publicly listable)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by Supabase. With no policy granting
-- the anon role access to the `resumes` bucket, uploads/downloads are only
-- possible via the service role (server-side). That is the intended model until
-- student auth exists.

-- ---------------------------------------------------------------------------
-- FUTURE — once students authenticate (Supabase Auth), link rows to auth.uid()
-- and enable owner-scoped access. Templates (leave commented until then):
--
-- alter table public.students add column user_id uuid references auth.users (id);
-- alter table public.resumes  add column user_id uuid references auth.users (id);
--
-- create policy "students read own" on public.students
--   for select to authenticated using (user_id = auth.uid());
-- create policy "resumes read own" on public.resumes
--   for select to authenticated using (user_id = auth.uid());
--
-- create policy "upload own resume" on storage.objects
--   for insert to authenticated
--   with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
-- ---------------------------------------------------------------------------
