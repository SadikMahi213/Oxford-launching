-- Phase 0.6: 14 critical database indexes
-- Run against production database

-- 1. referral_profit_history: profit history lookups are full table scans
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referral_profit_history_user_id ON referral_profit_history (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referral_profit_history_source_user_id ON referral_profit_history (source_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referral_profit_history_created_at ON referral_profit_history (created_at);

-- 2. deposits: filtered by user + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deposits_user_id_status ON deposits (user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deposits_status_created_at ON deposits (status, created_at);

-- 3. withdrawals: filtered by user + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawals_user_id_status ON withdrawals (user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawals_status ON withdrawals (status);

-- 4. transfer_logs: sender/receiver lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfer_logs_sender_id ON transfer_logs (sender_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfer_logs_receiver_id ON transfer_logs (receiver_id);

-- 5. investment_profit_history: user profit history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investment_profit_history_user_id ON investment_profit_history (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investment_profit_history_created_at ON investment_profit_history (created_at);

-- 6. mining_logs: user mining history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mining_logs_user_id ON mining_logs (user_id);

-- 7. admin_notifications: admin dashboard filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications (created_at DESC);

-- 8. kyc: user KYC lookups (already has FK index, ensure it's explicit)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kyc_user_id ON kyc (user_id);

-- 9. users: parent lookups for rank/referral queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_parent_lvl_1 ON users (parent_lvl_1_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_parent_lvl_2 ON users (parent_lvl_2_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_parent_lvl_3 ON users (parent_lvl_3_id);
