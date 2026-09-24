-- Gir brukeren "edwinjoh" 10 000 000 MB i managerbudsjett.
-- Setter beløpet i stedet for å legge til, så migrasjonen kan kjøres flere ganger uten å doble det.
update player_profiles
set manager_budget = 10000000, updated_at = now()
where user_id = (select id from profiles where lower(username) = 'edwinjoh');
