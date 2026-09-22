-- User-directed rating adjustment. Existing owners keep their acquisition price,
-- but their Raphinha card receives the new permanent rating and attributes.
with raphinha as (
  select id,
    jsonb_build_object(
      'pace', 97,
      'shooting', 93,
      'passing', 90,
      'dribbling', 95,
      'defending', 65,
      'physical', 85
    ) as attributes
  from player_catalog
  where slug = 'raphinha'
)
update player_catalog
set overall = 90,
    price = 250,
    attributes = raphinha.attributes
from raphinha
where player_catalog.id = raphinha.id;

update manager_cards
set overall = catalog.overall,
    attributes = catalog.attributes
from player_catalog as catalog
where manager_cards.catalog_id = catalog.id
  and catalog.slug = 'raphinha';
