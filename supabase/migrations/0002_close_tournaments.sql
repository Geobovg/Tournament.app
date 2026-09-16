-- Ferdigspilte turneringer kan lukkes, slik at de ikke lenger listes på forsiden.
-- Dataene beholdes; turneringen er fortsatt tilgjengelig via direkte lenke.
alter table tournaments
  add column closed boolean not null default false;
