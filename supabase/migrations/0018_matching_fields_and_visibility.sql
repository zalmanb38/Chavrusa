-- Matching detail fields, and a per-field visibility switch.
--
-- Several things asked for here already existed and are untouched:
-- topics have always been multi-select (`topics` is an array), `level`
-- already holds beginner/intermediate/advanced, and `preference` already
-- holds remote/in_person/both.

-- ─── per-field visibility ───────────────────────────────────────────────
-- One array of hidden field names rather than a boolean per field, so
-- adding the next sensitive field is a code change and not a migration.
--
-- Note what this must also do: a hidden field cannot be filterable. If
-- someone hides their age but an age filter still matches them, the
-- filter answers the question the toggle was meant to refuse — so Browse
-- excludes hidden values from those filters as well as from display.
--
-- Full name is deliberately NOT part of this system. It's governed by the
-- match-reveal rule in profile_names, which is a safety property rather
-- than a preference, and a user-facing toggle would imply otherwise.

alter table public.profiles
  add column if not exists hidden_fields text[] not null default '{}';

-- ─── study vs. conversation language ────────────────────────────────────
-- `languages` keeps its column name and now means the language you want
-- to CONVERSE in. The language of the text itself is separate: someone
-- may want to learn Gemara in the original while talking it through in
-- English.

alter table public.profiles
  add column if not exists study_languages text[] not null default '{}';

-- ─── session shape ──────────────────────────────────────────────────────
-- All optional, so '' is valid everywhere and means "no preference".

alter table public.profiles
  add column if not exists frequency text not null default ''
    check (frequency in ('', 'once_week', 'twice_week', 'three_week', 'daily')),
  add column if not exists time_of_day text not null default ''
    check (time_of_day in ('', 'morning', 'afternoon', 'evening', 'flexible')),
  add column if not exists session_length text not null default ''
    check (session_length in ('', '30', '45', '60', '90', '120'));

-- ─── what they're looking for ───────────────────────────────────────────
-- Free text, and searchable — so it gets a trigram index rather than
-- leaving every search to scan the table.

alter table public.profiles
  add column if not exists blurb text not null default '';

create extension if not exists pg_trgm;

create index if not exists profiles_blurb_trgm_idx
  on public.profiles using gin (blurb gin_trgm_ops);

create index if not exists profiles_frequency_idx
  on public.profiles (frequency)
  where is_active and phone_verified and frequency <> '';

create index if not exists profiles_time_of_day_idx
  on public.profiles (time_of_day)
  where is_active and phone_verified and time_of_day <> '';
