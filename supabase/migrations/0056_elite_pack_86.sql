-- Elitepakken koster 400 MB og garanterer i tillegg ett kort på 86+.
-- Som i gullpakken krever hvert nivå egne kort: 2× 84+ og 1× 86+ betyr tre forskjellige kort.
update manager_packs set price = 400, guarantee_min = 84, guarantee_count = 3,
  guarantees = '[{"min":84,"count":2},{"min":86,"count":1}]',
  description = 'Tolv kort, garantert to på 84+ og ett på 86+.'
where key = 'elite';
