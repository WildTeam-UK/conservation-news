-- The first source-discovery preview grouped some institutional subdomains too
-- broadly. Recommendations are derived entirely from saved research packs, so
-- clear the preview results once and rebuild them with the calibrated rules.

delete from public.source_suggestion_mentions;
delete from public.source_suggestions;
