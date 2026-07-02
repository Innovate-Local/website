-- ===========================================================================
-- MatchCore — org-admin "Describe a project with MatchCore".
--
-- An org admin chats with Scout; the AI drafts the request fields and silently
-- scores complexity for staff. The request is built in a new 'drafting' status
-- (hidden from the staff open-queue) until the org submits it. Discovery runs
-- against the REQUEST (before any project exists); when staff convert the
-- request, the discovery is relinked to the new project so the matching engine
-- can use it without redoing discovery.
-- ===========================================================================

-- project_requests: carry AI-drafted project fields + the 'drafting' status.
alter table public.project_requests add column if not exists description text;
alter table public.project_requests add column if not exists skills_needed text[] not null default '{}';
alter table public.project_requests drop constraint if exists project_requests_status_check;
alter table public.project_requests add constraint project_requests_status_check
  check (status in ('drafting', 'open', 'converted', 'declined'));

-- project_discoveries can attach to a project OR a request. project_id becomes
-- nullable; a nullable request_id links a discovery to the request it was built
-- against. Convert sets project_id so the matching page (keyed on project_id)
-- finds it.
alter table public.project_discoveries alter column project_id drop not null;
alter table public.project_discoveries add column if not exists request_id uuid
  references public.project_requests (id) on delete cascade;
create index if not exists project_discoveries_request_idx on public.project_discoveries (request_id);

-- RLS: org members may read a discovery attached to their own org's request
-- (defence-in-depth; writes flow through authorized server actions via Drizzle).
create policy "discoveries select own-org-request" on public.project_discoveries
  for select to authenticated using (
    exists (
      select 1 from public.project_requests r
      join public.organization_members om on om.org_id = r.org_id
      where r.id = request_id and om.user_id = auth.uid()
    )
  );
