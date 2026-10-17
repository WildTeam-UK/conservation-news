-- Advance active editorial runs every minute. The database step lease prevents
-- overlapping heartbeats from performing the same work twice.

create extension if not exists pg_net
with schema extensions;

create extension if not exists pg_cron;

select cron.schedule(
  'wildnews-editorial-heartbeat',
  '* * * * *',
  $cron$
    select net.http_post(
      url := 'https://conservation-news.vercel.app/api/automation/editorial',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'wildnews_automation_secret'
        )
      ),
      body := jsonb_build_object('source', 'supabase_cron'),
      timeout_milliseconds := 60000
    ) as request_id;
  $cron$
);
