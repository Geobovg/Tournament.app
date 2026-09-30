-- Sikkerhetsfikser. Kan kjøres før den nye koden er ute: den gamle koden virker fortsatt etterpå.

-- 1) Den sekssifrede koden trenger ikke være unik. Innlogging krever alltid brukernavnet også,
--    og kravet om unike koder gjorde det mulig å finne ut hvem som har hvilken kode.
--    Kolonnen brukes ikke lenger av appen og tømmes, så ingen avtrykk av kodene blir liggende.
alter table profiles drop constraint if exists profiles_code_fingerprint_key;
alter table profiles alter column code_fingerprint drop not null;
update profiles set code_fingerprint = null;

-- 2) Lengre invitasjonskoder: 8 tegn fra 32 lettleste tegn (uten I, O, 0 og 1), ca. 10^12
--    muligheter mot 16,7 millioner før. Tilfeldigheten hentes fra gen_random_uuid(), og bare
--    byte som er helt tilfeldige brukes (byte 6 og 8 har faste versjonsbiter).
create or replace function generate_invite_code() returns text
language sql volatile set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + get_byte(r.b, i) % 32, 1), '' order by i)
  from (select uuid_send(gen_random_uuid()) as b) as r,
       unnest(array[0, 1, 2, 3, 4, 5, 10, 11]) as i
$$;

revoke all on function public.generate_invite_code() from public, anon, authenticated;

alter table tournaments alter column invite_code set default public.generate_invite_code();
-- Alle gamle 6-tegnskoder byttes ut. Invitasjonslenkene (invite_token) er uendret og virker fortsatt.
update tournaments set invite_code = public.generate_invite_code();

-- 3) Begrens hvor mange feil invitasjonskoder én bruker kan prøve per time.
--    Én rad per kode som ikke fantes. Rader eldre enn et døgn slettes ved neste feilforsøk.
create table invite_code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index invite_code_attempts_user_created_idx on invite_code_attempts (user_id, created_at);

-- Ingen policyer: bare service role (serveren) kan lese og skrive.
alter table invite_code_attempts enable row level security;
