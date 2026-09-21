-- Keep trigger functions deterministic even if a role changes its PostgreSQL search path.
alter function public.seed_manager_starter_squad(uuid) set search_path = public, pg_temp;
alter function public.create_career_profile() set search_path = public, pg_temp;
