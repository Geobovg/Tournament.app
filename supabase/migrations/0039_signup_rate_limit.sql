-- Registrering krever ikke lenger e-post, så vi begrenser hvor mange kontoer som kan opprettes
-- fra samme IP-adresse. Én rad per opprettet konto. IP-en lagres bare som HMAC (se ipFingerprint
-- i src/lib/auth.ts), og rader eldre enn et døgn slettes ved neste registrering.
create table signup_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index signup_attempts_ip_created_idx on signup_attempts (ip_hash, created_at);

-- Ingen policyer: bare service role (serveren) kan lese og skrive.
alter table signup_attempts enable row level security;
