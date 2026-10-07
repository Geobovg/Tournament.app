-- Ungdomstoooor var litt for god. Nå er alle fem kortene garantert 84+ i stedet for 86+.
-- De fire vanlige kortene trekkes blant 84+, med vekt på 84–85. Det garanterte TOTS-kortet (88–95) er uendret.
update manager_packs set
  guarantee_min = 84,
  odds = '[{"min":84,"max":85,"weight":60},{"min":86,"max":87,"weight":28},{"min":88,"max":89,"weight":9},{"min":90,"max":99,"weight":3}]',
  description = 'Gratis! Fem kort på 84+, garantert minst én TOTS. Én per dag til og med søndag.'
where key = 'ungdomstoooor';
