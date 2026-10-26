-- Publication copy clarification; technical infrastructure and checkout unchanged.
BEGIN;
DO $validate$ BEGIN
 IF (SELECT count(*) FROM public.legal_documents WHERE version='2.0' AND document_code IN ('PRIVACY','ACCESSIBILITY','COOKIES')) <> 3 THEN
  RAISE EXCEPTION 'Cannot amend unexpected policy versions';
 END IF;
END $validate$;
INSERT INTO public.legal_documents_publication_history_v2(document_code,version,title,slug,body_markdown,effective_at)
SELECT document_code,version,title,slug,body_markdown,effective_at
FROM public.legal_documents WHERE document_code IN ('PRIVACY','ACCESSIBILITY','COOKIES') AND version='2.0'
ON CONFLICT(document_code,version) DO NOTHING;
UPDATE public.legal_documents SET body_markdown=replace(replace(replace(replace(replace(replace(body_markdown,'Do not represent behavioral profiles or trading ideas as licensed professional advice.','We do not treat learning-progress records or Journal entries as requests for individualized investment advice.'),'Do not claim that data is never shared, never trained on or never transferred overseas without auditing service contracts and settings.','External providers may process or retain information under their own relevant agreements, which can include processing in other jurisdictions; zero retention or zero secondary use is not promised.'),'A verified retention schedule must identify categories, retention periods, legitimate exceptions and deletion jobs.','Retention periods vary with the data category, business need, financial obligations and applicable legal requirements.'),'The Support Center and privacy contact should authenticate sensitive requests without collecting excessive additional information.','We may verify the requester''s identity before releasing private information or changing sensitive account records.'),'any applicable appeal, opt-out, authorized-agent, sensitive-data and nonretaliation mechanisms must be implemented before claiming availability.','any applicable appeal, opt-out, authorized-agent and sensitive-data rights will be evaluated under the law governing the request.'),'Avoid collecting unneeded brokerage passwords, SSNs, precise financial-account information or special-category data.','Members should not submit brokerage passwords, Social Security numbers, financial-account credentials or other unnecessary sensitive information in learning or community content.'),version='2.0.1',updated_at=now(),effective_at=now() WHERE document_code='PRIVACY' AND version='2.0';
UPDATE public.legal_documents SET body_markdown=replace(body_markdown,'Fictional and historical information must not be mislabeled as live brokerage data.','Illustrative, simulated and historical information is not presented as live brokerage-execution data.'),version='2.0.1',updated_at=now(),effective_at=now() WHERE document_code='ACCESSIBILITY' AND version='2.0';
UPDATE public.legal_documents SET body_markdown=replace(body_markdown,'Where optional storage choices are offered, they should be accessible through appropriate Privacy/Consent settings and operate before applicable trackers fire.','Where optional storage choices are available, members can review the related Privacy or Consent settings; essential session storage is needed for some secure site features.'),version='2.0.1',updated_at=now(),effective_at=now() WHERE document_code='COOKIES' AND version='2.0';
DO $validate$ BEGIN
 IF (SELECT count(*) FROM public.legal_documents WHERE version='2.0.1' AND document_code IN ('PRIVACY','ACCESSIBILITY','COOKIES'))<>3
 OR (SELECT count(*) FROM public.legal_documents_publication_history_v2 WHERE version='2.0' AND document_code IN ('PRIVACY','ACCESSIBILITY','COOKIES'))<>3 THEN
  RAISE EXCEPTION 'Revision history or publication row mismatch';
 END IF;
END $validate$;
COMMIT;