-- ============================================================================
-- reset_user_statistics.sql
-- Safely reset approved per-user numeric balances/statistics to 0.
--
-- SCOPE (explicit allow-list only -- never widen without review):
--   users.main_wallet, users.deposit_wallet, users.withdraw_wallet,
--   users.referral_wallet, users.generation_wallet,
--   users.arbx_wallet, users.arbx_mining_wallet,
--   users.captcha_wallet, users.ad_view_wallet, users.ecommerce_wallet,
--   users.matching_bonus_wallet,
--   users.daily_mined,
--   users.team_volume, users.current_rank_id
--   (team_volume / current_rank_id are derived caches: they are recomputed
--   from lifetime deposits on the next rank evaluation.)
--
-- EXPLICITLY EXCLUDED (never touch):
--   users.bonused_up_to ......... watermark; zeroing it would RE-PAY old
--                                   matching-bonus bands (double payment).
--   users.kyc_approved_team_volume  permanent KYC snapshot; zeroing it would
--                                   make pre-KYC volume bonusable.
--   Identity/KYC/referral/history/investment/order/product/security columns.
--   ALL historical tables (deposits, withdrawals, bonuses, ledger, ...).
--
-- USAGE (staging dry-run first):
--   psql ... -v ON_ERROR_STOP=1 -f reset_user_statistics.sql
-- The script runs inside one transaction. For a dry run, wrap it:
--   BEGIN; \i reset_user_statistics.sql  -- then ROLLBACK (dry run) or COMMIT.
-- NOTE: this file already contains BEGIN/COMMIT. For a dry run, comment out
-- the COMMIT line and issue ROLLBACK manually instead.
-- ============================================================================

BEGIN;

-- --------------- PRE-RESET SNAPSHOT (reported, not modified) ---------------
SELECT count(*) AS user_count FROM users;
SELECT
    sum(main_wallet)         AS main_wallet,
    sum(deposit_wallet)      AS deposit_wallet,
    sum(withdraw_wallet)     AS withdraw_wallet,
    sum(referral_wallet)     AS referral_wallet,
    sum(generation_wallet)   AS generation_wallet,
    sum(arbx_wallet)         AS arbx_wallet,
    sum(arbx_mining_wallet)  AS arbx_mining_wallet,
    sum(captcha_wallet)      AS captcha_wallet,
    sum(ad_view_wallet)      AS ad_view_wallet,
    sum(ecommerce_wallet)    AS ecommerce_wallet,
    sum(matching_bonus_wallet) AS matching_bonus_wallet,
    sum(daily_mined)         AS daily_mined,
    sum(team_volume)         AS team_volume
FROM users;

-- --------------- RESET (explicit columns only) -------------------------------
UPDATE users SET
    main_wallet            = 0,
    deposit_wallet         = 0,
    withdraw_wallet        = 0,
    referral_wallet        = 0,
    generation_wallet      = 0,
    arbx_wallet            = 0,
    arbx_mining_wallet     = 0,
    captcha_wallet         = 0,
    ad_view_wallet         = 0,
    ecommerce_wallet       = 0,
    matching_bonus_wallet  = 0,
    daily_mined            = 0,
    team_volume            = 0,
    current_rank_id        = NULL;

-- --------------- POST-RESET VERIFICATION (must all be 0 / NULL) ---------------
SELECT
    sum(main_wallet)         AS main_wallet,
    sum(deposit_wallet)      AS deposit_wallet,
    sum(withdraw_wallet)     AS withdraw_wallet,
    sum(referral_wallet)     AS referral_wallet,
    sum(generation_wallet)   AS generation_wallet,
    sum(arbx_wallet)         AS arbx_wallet,
    sum(arbx_mining_wallet)  AS arbx_mining_wallet,
    sum(captcha_wallet)      AS captcha_wallet,
    sum(ad_view_wallet)      AS ad_view_wallet,
    sum(ecommerce_wallet)    AS ecommerce_wallet,
    sum(matching_bonus_wallet) AS matching_bonus_wallet,
    sum(daily_mined)         AS daily_mined,
    sum(team_volume)         AS team_volume,
    count(*) FILTER (WHERE current_rank_id IS NOT NULL) AS ranked_users
FROM users;

-- --------------- GUARDRAILS (must be unchanged) -------------------------------
SELECT count(*) AS user_count_after FROM users;
SELECT count(*) AS deposits_after FROM deposits;
SELECT count(*) AS withdrawals_after FROM withdrawals;
SELECT count(*) AS matching_bonuses_after FROM matching_bonuses;
SELECT count(*) AS referral_history_after FROM referral_profit_history;
SELECT sum(bonused_up_to) AS bonused_up_to_total FROM users;
SELECT count(*) AS kyc_snapshot_rows FROM users WHERE kyc_approved_team_volume IS NOT NULL;

COMMIT;
