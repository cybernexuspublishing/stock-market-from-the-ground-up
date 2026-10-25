-- v0.14.0.208: honest, private, factual official onboarding messages.
-- Published content is accessible only through Founders Commons RLS when a real member has access.
WITH owner AS (
 SELECT user_id FROM public.admin_user_roles
 WHERE role_code='OWNER' AND (expires_at IS NULL OR expires_at>now())
 ORDER BY granted_at LIMIT 1
), messages(notice_code,title,body,audience,priority) AS (
 VALUES
 ('F600_WELCOME_20261024',
 'Welcome to your private Founders Commons',
 'Your founding number stays with your original account. This private community has eight discussion sections and 32 official starting topics. Use Bug Reports for reproducible technical problems, Suggestions for constructive proposals, Learning Education for study questions, and private Support for billing or account-specific information. The foundering membership payment launch is not yet open; published member privileges require verified eligibility. Official issues receive visible review status, and educational discussions never constitute live buy or sell instructions.',
 'shared','important'),
 ('F600_COUNCIL_WELCOME_20261024',
 'Extended Design Council: how your vote works',
 'Eligible 60-day Extended Founders can vote once per official website-design ballot and participate in design proposals and the additional reviewed Learning Studio challenges. The Council may choose between vetted layouts, themes, navigation designs and instructor presentation options. Accessible and secure operation always overrides a popularity vote. Voting provides product influence, not company ownership or control over finances. Official ballots will appear only once the Owner opens them.',
 'council','normal')
)
INSERT INTO public.gu_founder_targeted_notices_v014206(
 notice_code,title,body,audience,priority,publication_state,authored_by,published_at)
SELECT m.notice_code,m.title,m.body,m.audience,m.priority,'published',o.user_id,now()
FROM messages m CROSS JOIN owner o
ON CONFLICT(notice_code) DO NOTHING;