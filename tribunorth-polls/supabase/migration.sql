-- Tribu: anonymous landing-page polls ("pulse")
-- Run once in the Supabase SQL editor.
--
-- Privacy posture: this table cannot identify a person.
--   * no email, no name, no IP, no user agent
--   * device_token is a random UUID minted in the browser, used only to stop
--     one device voting twice. It is never linked to anything else.
--   * RLS is on with zero policies, so the anon/publishable key can neither
--     read nor write. All access goes through the Next.js route handler using
--     the service role key, which stays server-side.

create table if not exists public.pulse_votes (
  id            bigint generated always as identity primary key,
  poll_id       text        not null,
  option_id     text        not null,
  device_token  uuid        not null,
  created_at    timestamptz not null default now(),
  constraint pulse_votes_one_per_device unique (poll_id, device_token)
);

create index if not exists pulse_votes_poll_idx on public.pulse_votes (poll_id);

alter table public.pulse_votes enable row level security;
-- deliberately no policies: service role bypasses RLS, everyone else is locked out.

-- Aggregate counts for one poll. Returns nothing for a poll with no votes yet.
create or replace function public.pulse_results(p_poll_id text)
returns table (option_id text, votes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select option_id, count(*)::bigint as votes
  from public.pulse_votes
  where poll_id = p_poll_id
  group by option_id;
$$;

revoke all on function public.pulse_results(text) from public, anon, authenticated;
