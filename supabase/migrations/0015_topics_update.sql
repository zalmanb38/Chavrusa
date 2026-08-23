-- Revised topic list, plus free text for the new "Other" option.
--
-- Three topics leave the list (yadHachazakah, tanach, hashkafa) and
-- several arrive. Stored topics are plain strings, so rows written under
-- the old list would otherwise keep keys the app no longer offers: the
-- profile form couldn't show them to be unchecked, and any page
-- translating them would fail on the missing key.

alter table public.profiles
  add column if not exists topic_other text not null default '';

-- yadHachazakah becomes rambam: the Yad HaChazakah is the Rambam's
-- Mishneh Torah, so this is the same subject under the name now used.
update public.profiles
set topics = array_replace(topics, 'yadHachazakah', 'rambam')
where 'yadHachazakah' = any(topics);

-- A profile that had both would now hold rambam twice.
update public.profiles
set topics = (
  select array_agg(distinct t order by t) from unnest(topics) as t
)
where 'rambam' = any(topics)
  and array_length(topics, 1) >
      (select count(distinct t) from unnest(topics) as t);

-- tanach and hashkafa have no equivalent in the new list, so they are
-- dropped rather than mapped onto something they don't mean. Affected
-- profiles keep every other topic and can pick again from the new list.
update public.profiles
set topics = array_remove(array_remove(topics, 'tanach'), 'hashkafa')
where 'tanach' = any(topics) or 'hashkafa' = any(topics);
