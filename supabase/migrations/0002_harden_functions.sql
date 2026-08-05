-- Hardening pass, per the Supabase security advisor.

-- Pin search_path on set_updated_at (was mutable per the linter).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user is only meant to run as the auth.users signup trigger;
-- it doesn't need to be directly callable via the PostgREST API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
