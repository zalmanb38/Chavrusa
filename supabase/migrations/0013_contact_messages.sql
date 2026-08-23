-- Contact form submissions.
--
-- Stored first, emailed second. The form carries a "Report a safety
-- issue" option, so a message that only ever existed as an email would be
-- lost outright if Resend erred or it landed in spam. Persisting it makes
-- the email a notification rather than the record.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null,
  message text not null,
  -- Set when the sender happened to be signed in; the form works either way.
  user_id uuid references public.profiles(id) on delete set null,
  -- Hashed, not raw: enough to rate-limit a spammer, not a stored
  -- identifier for everyone who ever used the form.
  ip_hash text,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_idx
  on public.contact_messages (created_at desc);
create index if not exists contact_messages_ip_idx
  on public.contact_messages (ip_hash, created_at desc);

alter table public.contact_messages enable row level security;

-- No insert policy on purpose: writes go through the API route using the
-- service role, so the rate limit and honeypot can't be skipped by
-- POSTing at PostgREST directly.
drop policy if exists "Admins can view contact messages" on public.contact_messages;
create policy "Admins can view contact messages"
  on public.contact_messages for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update contact messages" on public.contact_messages;
create policy "Admins can update contact messages"
  on public.contact_messages for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete contact messages" on public.contact_messages;
create policy "Admins can delete contact messages"
  on public.contact_messages for delete
  to authenticated
  using (public.is_admin());
