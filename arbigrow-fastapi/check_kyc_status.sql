SELECT admin_kyc_status, COUNT(*) as cnt FROM users GROUP BY admin_kyc_status ORDER BY admin_kyc_status;
