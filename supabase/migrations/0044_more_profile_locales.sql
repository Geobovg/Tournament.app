-- Flere språk kan nå lagres på profilen. Eksisterende en/no-verdier er fortsatt gyldige.
alter table profiles drop constraint if exists profiles_locale_check;
alter table profiles add constraint profiles_locale_check
  check (locale in ('en', 'no', 'sv', 'da', 'fi', 'es', 'de', 'fr', 'zh', 'it', 'ar'));
