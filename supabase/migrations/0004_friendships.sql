-- Venner: en forespørsel mellom to profiler som må godkjennes av mottakeren.
create table friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles (id) on delete cascade,
  recipient_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> recipient_id),
  unique (requester_id, recipient_id)
);

create index friend_requests_recipient_idx on friend_requests (recipient_id, status);
create index friend_requests_requester_idx on friend_requests (requester_id, status);

alter table friend_requests enable row level security;
