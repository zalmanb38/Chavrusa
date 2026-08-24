-- Structured location on profiles.
--
-- `city` already exists as free text and keeps its role, now holding
-- either a value picked from the curated list or whatever someone typed
-- under "Other" — the column means the same thing either way, so existing
-- entries stay valid and simply read as "Other" in the form.
--
-- No NOT NULL or CHECK here: location is only compulsory for people who
-- meet exclusively in person, and a constraint enforcing that would
-- reject edits to profiles that predate the rule, locking people out of
-- their own settings over a field they never saw.

alter table public.profiles
  add column if not exists country text not null default '',
  add column if not exists region text not null default '',
  add column if not exists neighborhood text not null default '',
  add column if not exists meeting_spot text not null default '';

-- Browse filters on these three together, most-selective first.
create index if not exists profiles_location_idx
  on public.profiles (country, region, city)
  where is_active and phone_verified;
