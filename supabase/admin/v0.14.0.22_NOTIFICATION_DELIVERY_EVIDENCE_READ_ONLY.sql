-- v0.14.0.22 | READ ONLY. Owner-only operational evidence; aggregates only.
-- Counts are NOT evidence of delivery without role-scoped member E2E acceptance.
BEGIN TRANSACTION READ ONLY;
SELECT
  count(*) FILTER (WHERE notification_type='forum_reply' AND metadata->>'origin'='v01420') AS subscription_alert_rows,
  count(DISTINCT user_id) FILTER (WHERE notification_type='forum_reply' AND metadata->>'origin'='v01420') AS unique_recipients,
  max(created_at) FILTER (WHERE notification_type='forum_reply' AND metadata->>'origin'='v01420') AS last_subscription_alert_at
FROM public.user_notifications;
-- Every produced notice should be unique to the recipient/post pair.
SELECT count(*) AS duplicate_pairs
FROM (
  SELECT user_id,metadata->>'post_id' AS post_id
  FROM public.user_notifications
  WHERE notification_type='forum_reply' AND metadata->>'origin'='v01420'
  GROUP BY user_id,metadata->>'post_id' HAVING count(*)>1
) collisions;
-- This tests stored historic alerts, not whether a member opened the alert.
ROLLBACK;
