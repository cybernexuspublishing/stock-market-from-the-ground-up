-- v0.14.0.234: Efficient, anonymous first-party session ad frequency checks.
-- Token is random per browser tab; no IP, email, user ID or cross-site tracker.
CREATE INDEX IF NOT EXISTS gu_ad_events_session_frequency_v014234
 ON public.ad_events(session_token,event_type,created_at DESC)
 WHERE session_token IS NOT NULL;
