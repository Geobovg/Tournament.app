-- Career mode: permanent progression, manager squads, friend challenges and the transfer market.
-- Rewards are a ledger, so confirmed tournament history survives tournament deletion.
create table player_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  player_name text not null default 'Min spiller' check (char_length(player_name) between 2 and 24),
  primary_position text not null default 'midfielder' check (primary_position in ('forward', 'midfielder', 'defender')),
  player_points integer not null default 20 check (player_points >= 0),
  player_points_earned integer not null default 20 check (player_points_earned >= 0),
  manager_budget integer not null default 20 check (manager_budget >= 0),
  manager_budget_earned integer not null default 20 check (manager_budget_earned >= 0),
  club_name text not null default 'Mitt lag' check (char_length(club_name) between 2 and 32),
  club_style jsonb not null default '{"primary":"#35d06a","secondary":"#071a10","crest":"shield"}'::jsonb,
  appearance jsonb not null default '{"skinTone":"medium","hair":"short","hairColor":"brown","beard":"none","kitNumber":10,"boots":"black","armband":false}'::jsonb,
  stats jsonb not null default '{"acceleration":56,"sprintSpeed":56,"agility":56,"tempo":56,"finishing":54,"shotPower":54,"longShots":54,"volleys":54,"longPassing":58,"shortPassing":58,"crossing":58,"curve":58,"ballControl":58,"dribbling":58,"vision":58,"balance":58,"standingTackle":48,"slidingTackle":48,"heading":48,"interceptions":48,"jumping":54,"stamina":56,"strength":54,"passion":56}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into player_profiles (user_id)
select id from profiles on conflict (user_id) do nothing;

create table career_reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source_type text not null check (source_type in ('starter', 'tournament_match', 'tournament_champion', 'tournament_finalist', 'career_match', 'market_sale')),
  source_id uuid,
  reward_key text not null,
  player_points integer not null default 0 check (player_points >= 0),
  manager_budget integer not null default 0 check (manager_budget >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id, reward_key)
);

create table player_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  position text not null check (position in ('GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST')),
  overall integer not null check (overall between 40 and 99),
  price integer not null check (price >= 5),
  attributes jsonb not null default '{}'::jsonb,
  accent text not null default '#35d06a',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table manager_cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  catalog_id uuid references player_catalog(id) on delete set null,
  name text not null,
  position text not null,
  overall integer not null check (overall between 40 and 99),
  attributes jsonb not null default '{}'::jsonb,
  tradable boolean not null default true,
  is_starter boolean not null default false,
  acquired_price integer not null default 0 check (acquired_price >= 0),
  created_at timestamptz not null default now()
);
create index manager_cards_owner_idx on manager_cards(owner_id);

create table manager_lineups (
  user_id uuid primary key references profiles(id) on delete cascade,
  formation text not null default '4-3-3',
  starters uuid[] not null default '{}',
  bench uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table career_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references profiles(id) on delete cascade,
  opponent_id uuid not null references profiles(id) on delete cascade,
  mode text not null check (mode in ('player', 'manager')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'in_progress', 'completed', 'forfeit')),
  expires_at timestamptz not null default now() + interval '5 minutes',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (challenger_id <> opponent_id)
);
create index career_challenges_opponent_idx on career_challenges(opponent_id, status);

create table career_matches (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid unique references career_challenges(id) on delete set null,
  mode text not null check (mode in ('player', 'manager')),
  home_user_id uuid not null references profiles(id) on delete cascade,
  away_user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'live', 'completed', 'forfeit')),
  home_score integer not null default 0,
  away_score integer not null default 0,
  winner_id uuid references profiles(id) on delete set null,
  events jsonb not null default '[]'::jsonb,
  tactics jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index career_matches_user_idx on career_matches(home_user_id, away_user_id, created_at desc);

create table market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  card_id uuid not null unique references manager_cards(id) on delete cascade,
  starting_price integer not null check (starting_price >= 1),
  buy_now_price integer not null check (buy_now_price >= starting_price),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'sold', 'expired', 'cancelled')),
  buyer_id uuid references profiles(id) on delete set null,
  sold_price integer check (sold_price >= 0),
  created_at timestamptz not null default now()
);
create index market_listings_seller_idx on market_listings(seller_id, status);

create table market_bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references market_listings(id) on delete cascade,
  bidder_id uuid not null references profiles(id) on delete cascade,
  amount integer not null check (amount >= 1),
  created_at timestamptz not null default now(),
  unique (listing_id, bidder_id, amount)
);
create index market_bids_listing_idx on market_bids(listing_id, amount desc, created_at asc);

alter table player_profiles enable row level security;
alter table career_reward_events enable row level security;
alter table player_catalog enable row level security;
alter table manager_cards enable row level security;
alter table manager_lineups enable row level security;
alter table career_challenges enable row level security;
alter table career_matches enable row level security;
alter table market_listings enable row level security;
alter table market_bids enable row level security;

-- Every manager can play immediately. These academy cards are deliberately non-tradable.
create or replace function seed_manager_starter_squad(target_user uuid) returns void language plpgsql as $$
declare
  card_ids uuid[];
begin
  if exists (select 1 from manager_cards where owner_id = target_user) then return; end if;
  with inserted as (
    insert into manager_cards (owner_id, name, position, overall, tradable, is_starter, attributes)
    select target_user, name, position, overall, false, true, jsonb_build_object('pace', overall, 'shooting', overall, 'passing', overall, 'dribbling', overall, 'defending', overall, 'physical', overall)
    from (values ('Academy GK', 'GK', 58), ('Academy RB', 'RB', 57), ('Academy CB', 'CB', 60), ('Academy CB', 'CB', 59), ('Academy LB', 'LB', 57), ('Academy CM', 'CM', 60), ('Academy CM', 'CM', 59), ('Academy RW', 'RW', 58), ('Academy CAM', 'CAM', 61), ('Academy LW', 'LW', 58), ('Academy ST', 'ST', 61)) as squad(name, position, overall)
    returning id
  ) select array_agg(id) into card_ids from inserted;
  insert into manager_lineups (user_id, starters, bench) values (target_user, card_ids, '{}') on conflict (user_id) do nothing;
end;
$$;

create or replace function create_career_profile() returns trigger language plpgsql as $$
begin
  perform seed_manager_starter_squad(new.user_id);
  return new;
end;
$$;
create trigger player_profile_starter_squad after insert on player_profiles for each row execute function create_career_profile();

-- First season: a deliberately curated sample. More cards can be added without code changes.
insert into player_catalog (slug, name, position, overall, price, attributes, accent) values
 ('haaland','Erling Haaland','ST',91,250,'{"pace":88,"shooting":92,"passing":70,"dribbling":82,"defending":45,"physical":88}','#7bb8ff'),
 ('mbappe','Kylian Mbappé','ST',91,260,'{"pace":97,"shooting":90,"passing":80,"dribbling":92,"defending":36,"physical":76}','#2f72ff'),
 ('odegaard','Martin Ødegaard','CAM',88,135,'{"pace":72,"shooting":83,"passing":91,"dribbling":89,"defending":58,"physical":65}','#d73a49'),
 ('vinicius','Vinícius Júnior','LW',90,220,'{"pace":95,"shooting":84,"passing":81,"dribbling":93,"defending":30,"physical":70}','#f2c94c'),
 ('bellingham','Jude Bellingham','CAM',89,175,'{"pace":80,"shooting":84,"passing":86,"dribbling":87,"defending":78,"physical":82}','#f2c94c'),
 ('rodri','Rodri','CDM',91,240,'{"pace":66,"shooting":80,"passing":86,"dribbling":84,"defending":87,"physical":85}','#6bb8ff'),
 ('salah','Mohamed Salah','RW',89,170,'{"pace":89,"shooting":88,"passing":82,"dribbling":89,"defending":45,"physical":75}','#d9252a'),
 ('van-dijk','Virgil van Dijk','CB',89,160,'{"pace":78,"shooting":60,"passing":72,"dribbling":73,"defending":90,"physical":86}','#d9252a'),
 ('hakimi','Achraf Hakimi','RB',86,105,'{"pace":91,"shooting":76,"passing":78,"dribbling":82,"defending":77,"physical":77}','#1b76d1'),
 ('wirtz','Florian Wirtz','CAM',88,130,'{"pace":82,"shooting":82,"passing":88,"dribbling":90,"defending":55,"physical":66}','#e62b3f'),
 ('isak','Alexander Isak','ST',85,95,'{"pace":84,"shooting":85,"passing":75,"dribbling":83,"defending":40,"physical":73}','#121212'),
 ('palmer','Cole Palmer','CAM',85,90,'{"pace":76,"shooting":83,"passing":84,"dribbling":86,"defending":48,"physical":64}','#2c65d9')
on conflict (slug) do nothing;

-- Existing accounts get their academy squad the first time this migration runs.
do $$ declare profile_id uuid; begin for profile_id in select user_id from player_profiles loop perform seed_manager_starter_squad(profile_id); end loop; end $$;
