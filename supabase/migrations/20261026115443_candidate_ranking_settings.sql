-- Configurable candidate freshness and the small wildlife relevance bonus used
-- when the daily workflow ranks the complete pool of qualifying candidates.

alter table public.editorial_run_settings
  add column candidate_freshness_days integer not null default 7,
  add column candidate_freshness_decay_per_day numeric(5, 2) not null default 2.00,
  add column candidate_wildlife_bonus numeric(5, 2) not null default 3.00;

alter table public.editorial_run_settings
  add constraint editorial_run_settings_candidate_freshness_days_check
    check (candidate_freshness_days between 1 and 30),
  add constraint editorial_run_settings_candidate_freshness_decay_check
    check (candidate_freshness_decay_per_day between 0 and 20),
  add constraint editorial_run_settings_candidate_wildlife_bonus_check
    check (candidate_wildlife_bonus between 0 and 10);
