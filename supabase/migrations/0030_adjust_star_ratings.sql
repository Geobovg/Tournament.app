-- Ny rating og pris for Raphinha, Lamine Yamal, Ødegaard og Haaland. 0022 (Raphinha 90) ble aldri kjørt i databasen,
-- så den tas med her. Prisen følger de andre kortene med samme rating (90 koster 220–250, 94 koster 320).
-- Stats-ene flyttes like mye som ratingen, og kort som allerede er eid får samme endring.
-- Målverdiene er faste, så migrasjonen kan kjøres flere ganger uten å endre mer.
with target (slug, overall, price) as (
  values
    ('raphinha', 90, 240),
    ('lamine-yamal', 90, 240),
    ('odegaard', 90, 240),
    ('haaland', 92, 280)
), changes as (
  select catalog.id, target.overall, target.price, target.overall - catalog.overall as delta
  from player_catalog as catalog
  join target on target.slug = catalog.slug
)
update player_catalog as catalog
set overall = changes.overall,
    price = changes.price,
    attributes = (
      select jsonb_object_agg(key, least(99, greatest(20, value::int + changes.delta)))
      from jsonb_each_text(catalog.attributes)
    )
from changes
where catalog.id = changes.id;

update manager_cards
set overall = catalog.overall,
    attributes = catalog.attributes
from player_catalog as catalog
where manager_cards.catalog_id = catalog.id
  and catalog.slug in ('raphinha', 'lamine-yamal', 'odegaard', 'haaland')
  and manager_cards.overall is distinct from catalog.overall;
