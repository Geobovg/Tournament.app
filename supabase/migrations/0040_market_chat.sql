-- Markedschat: én felles samtale på overgangsmarkedet for alle managere.
-- Meldinger eldre enn 7 dager ryddes bort hver gang noen sender en ny melding,
-- så tabellen holder seg liten uten en egen jobb.
create table market_chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  -- Managerne som er nevnt med @brukernavn, slik at de får uthevet meldingen og @ på telleren.
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index market_chat_messages_created_idx on market_chat_messages (created_at desc);
create index market_chat_messages_author_created_idx on market_chat_messages (author_id, created_at desc);
create index market_chat_messages_mentions_idx on market_chat_messages using gin (mentions);

-- Når hver manager sist hadde chatten åpen. Lagres på brukeren, så telleren stemmer på alle enheter.
create table market_chat_reads (
  user_id uuid primary key references profiles (id) on delete cascade,
  last_read_at timestamptz not null default now()
);

-- Ingen policyer: bare service role (serveren) kan lese og skrive.
alter table market_chat_messages enable row level security;
alter table market_chat_reads enable row level security;

create or replace function public.post_market_chat_message(target_author uuid, next_body text, next_mentions uuid[])
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  cleaned text := btrim(coalesce(next_body, ''));
  new_id uuid;
begin
  if cleaned = '' then raise exception 'Skriv en melding først'; end if;
  if char_length(cleaned) > 300 then raise exception 'Meldingen kan være maks 300 tegn'; end if;

  -- Låsen per manager hindrer at mange meldinger sendt samtidig sniker seg forbi spamgrensa.
  perform pg_advisory_xact_lock(hashtext('market_chat:' || target_author::text));
  if (select count(*) from market_chat_messages where author_id = target_author and created_at > now() - interval '30 seconds') >= 5 then
    raise exception 'Du sender for mange meldinger. Vent litt før du skriver igjen.';
  end if;

  delete from market_chat_messages where created_at < now() - interval '7 days';

  insert into market_chat_messages (author_id, body, mentions)
  values (
    target_author,
    cleaned,
    coalesce((select array_agg(distinct profile.id) from profiles profile where profile.id = any(coalesce(next_mentions, '{}')) and profile.id <> target_author), '{}')
  )
  returning id into new_id;
  return new_id;
end;
$fn$;

revoke all on function public.post_market_chat_message(uuid, text, uuid[]) from public, anon, authenticated;
