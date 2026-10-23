alter table public.digest_settings
  add column social_distribution_mode text not null default 'queue'
    check (social_distribution_mode in ('queue', 'immediate'));

