-- Make the editorial draft limit the single daily article target and move the
-- scheduled run one hour ahead of the 08:00 London publication window.
-- Existing future queue rows are intentionally untouched; they are audited and
-- resolved explicitly before this application batch is enabled.

alter table public.editorial_run_settings
  alter column daily_run_time set default '07:00';

update public.editorial_run_settings
set daily_run_time = '07:00',
    max_auto_publishes_per_day = max_new_drafts
where id = true;
