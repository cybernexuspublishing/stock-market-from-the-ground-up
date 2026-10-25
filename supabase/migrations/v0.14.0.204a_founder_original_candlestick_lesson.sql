-- v0.14.0.204A Original founder sample lesson, no external market data.
INSERT INTO public.gu_founder_educational_releases_v014190
(slug,title,category,audience,body,competency_code,review_state,rights_cleared,available_from,reviewed_by)
SELECT 'founder-candlestick-worked-example-01','Candlestick Body and Range: Worked Lesson',
'early_teaching','shared',
'OPEN means the first price in an interval; HIGH is the highest; LOW is the lowest; CLOSE is the last. A candle real body is absolute(Close minus Open). Its full range is High minus Low. The upper and lower wicks connect the real body with the extreme prices. Fictional example: Open $3.10; High $3.38; Low $3.04; Close $3.31. Body = $0.21, range = $0.34, body divided by range times 100 = 61.76%. Upper wick = $0.07; lower wick = $0.06. This is a completed bullish candle, not proof that the next candle will rise. High volume, wide spreads and nearby resistance can change the interpretation. Try independently: Open $4.22, High $4.40, Low $4.11, Close $4.15. Determine bearish or bullish, body, range, wick lengths, and body percentage. Explain why observing one candle alone cannot guarantee an entry.',
'CANDLE_READING','approved',true,now(),r.user_id
FROM public.admin_user_roles r WHERE r.role_code='OWNER'
AND (r.expires_at IS NULL OR r.expires_at>now()) LIMIT 1
ON CONFLICT(slug) DO NOTHING;