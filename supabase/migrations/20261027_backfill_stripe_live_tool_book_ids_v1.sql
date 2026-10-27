BEGIN;
DO $$ BEGIN IF (SELECT count(*) FROM public.admin_user_roles WHERE role_code='OWNER' AND (expires_at IS NULL OR expires_at>now()))<>1 THEN RAISE EXCEPTION 'Owner count mismatch';END IF;END $$;
WITH valid_owner AS(SELECT user_id FROM public.admin_user_roles WHERE role_code='OWNER' AND (expires_at IS NULL OR expires_at>now()) LIMIT 1), provider(sku,stripe_product_id,stripe_price_id,amount_cents,billing_interval,billing_interval_count,imported_name) AS(VALUES
('tool:CATALYST_RESEARCH','prod_VVFErOSLDZIl4i','price_1UVBpEJL0O4GGVBHgcmPVtbh',2999,'month',1,'Catalyst & Filing Research Lab'),
('tool:DISCOVERY_LAB','prod_VVFE7g3aq89hU1','price_1UVBr0JL0O4GGVBHZhPdch97',2999,'month',1,'Market Discovery Lab'),
('tool:EXECUTION_LAB','prod_VVFEWiiHPGk8Zg','price_1UVBr2JL0O4GGVBHBCes5ewc',2999,'month',1,'Execution Laboratory'),
('tool:FLOAT_SUPPLY_LAB','prod_VVFES4NQsL6kem','price_1UVBr4JL0O4GGVBHfX15NwBv',2999,'month',1,'Float & Supply Lab'),
('tool:HALT_SSR_LAB','prod_VVFE0iqaN8KDRK','price_1UVBrAJL0O4GGVBHFXE2lIsT',2999,'month',1,'Halt / SSR / Abnormal Market Lab'),
('tool:LIQUIDITY_SPREAD_LAB','prod_VVFEm1EgtTWkMO','price_1UVBrGJL0O4GGVBHVyvOFQyC',2999,'month',1,'Liquidity & Spread Laboratory'),
('tool:MARKET_CONTEXT_LAB','prod_VVFF0rVRbDkAMt','price_1UVBrJJL0O4GGVBHkgGwGitH',2999,'month',1,'Market Context & Regime Lab'),
('tool:MARKET_STRUCTURE_LAB','prod_VVFEkusXCmhEXW','price_1UVBrLJL0O4GGVBHNRekpBBp',2999,'month',1,'Market Structure Lab'),
('tool:MULTI_TIMEFRAME_LAB','prod_VVFEsWYqxibbXw','price_1UVBrPJL0O4GGVBH6uL6AeU3',2999,'month',1,'Multi-Timeframe Synchronizer'),
('tool:OPTIONS_LAB','prod_VVFF75hJByAITm','price_1UVBrSJL0O4GGVBHneUj0zyG',2999,'month',1,'Options Learning & Simulator'),
('tool:ORDER_FLOW_TAPE_LAB','prod_VVFFl4d3SGMVvo','price_1UVBrUJL0O4GGVBH41ZvHq9d',2999,'month',1,'Order Flow & Tape Laboratory'),
('tool:PATTERN_FAILURE_LIBRARY','prod_VVFFpFTp2NVDFX','price_1UVBrWJL0O4GGVBHlmAwU7jY',2999,'month',1,'Pattern & Failure Library'),
('tool:RISK_POSITION_LAB','prod_VVFE6c4XzMeAaQ','price_1UVBrZJL0O4GGVBHbNO7mJid',2999,'month',1,'Risk & Position Sizing Laboratory'),
('tool:SCANNER_BUILDER','prod_VVFE9nJisIEK9V','price_1UVBrdJL0O4GGVBHEopUgmP3',2999,'month',1,'Scanner Builder & Historical Scanner Replay'),
('tool:STRATEGY_VALIDATION','prod_VVFFKsNPjqsbPz','price_1UVBrfJL0O4GGVBHdSfEjiex',2999,'month',1,'Strategy Validation Lab'),
('tool:TRADE_REVIEW_REPLAY','prod_VVFFz2AvIrnuIh','price_1UVBrhJL0O4GGVBHrZceXiPZ',2999,'month',1,'Trade Review Replay'),
('tool:WATCHLIST_WORKBENCH','prod_VVFEBTamFTyFg0','price_1UVBrpJL0O4GGVBHbys0HsLy',2999,'month',1,'Watchlist & Trade-Plan Workbench'),
('book:FOUNDATION_BOOK_1','prod_VVF91RJdGeiACx','price_1UVBsDJL0O4GGVBHdqAaP15z',1099,'one_time',1,'Stock Market Foundations — Book I'),
('book:FOUNDATION_BOOK_2','prod_VVF9wc6b7YQs2g','price_1UVBsFJL0O4GGVBHP75QJV4N',1099,'one_time',1,'Stock Market Foundations — Book II'),
('book:FOUNDATION_BOOK_3','prod_VVF9qOuhSENuNW','price_1UVBsLJL0O4GGVBH37PPBw4s',1199,'one_time',1,'Stock Market Foundations — Book III (with RCT)'),
('book:DAY_TRADING_BOOK_1','prod_VVF98mZY1vlf3n','price_1UVBsPJL0O4GGVBH1cdsLBT3',1499,'one_time',1,'Day Trading — J. S. Grant'),
('book:READING_THE_TAPE','prod_VVF92FwnEje0ow','price_1UVBsSJL0O4GGVBHjElhhG8W',1499,'one_time',1,'Reading the Tape — Time & Sales, Level II and Order Flow')
)
INSERT INTO public.gu_owner_stripe_registry_v1(sku,stripe_product_id,stripe_price_id,amount_cents,billing_interval,billing_interval_count,imported_name,imported_by)
SELECT p.sku,p.stripe_product_id,p.stripe_price_id,p.amount_cents,p.billing_interval,p.billing_interval_count,p.imported_name,o.user_id FROM provider p CROSS JOIN valid_owner o
ON CONFLICT(sku) DO NOTHING;
INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
VALUES(NULL,'OWNER_STRIPE_LIVE_PRICE_REGISTRY_BACKFILL','commerce','2026-10-27',jsonb_build_object('existing_beta_tool_prices',17,'existing_book_ebook_prices',5,'new_provider_prices_created',false,'checkout_enabled_by_backfill',false));
COMMIT;