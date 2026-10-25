-- v0.14.0.209: evergreen founder welcome notice text.
UPDATE public.gu_founder_targeted_notices_v014206
SET body=replace(body,
'The foundering membership payment launch is not yet open; published member privileges require verified eligibility.',
'Membership purchase availability is managed separately; viewing private topics always requires verified founder eligibility.'),
updated_at=now()
WHERE notice_code='F600_WELCOME_20261024'
AND body LIKE '%The foundering membership payment launch%';