-- Full user audit: all users with parent info and creation order
SELECT 
  u.id, 
  u.username, 
  u.full_name, 
  u.email,
  u.parent_lvl_1_id,
  u.parent_lvl_2_id,
  u.parent_lvl_3_id,
  u.parent_lvl_4_id,
  u.parent_lvl_5_id,
  u.referral_code,
  u.is_admin,
  u.created_at
FROM users u
ORDER BY u.id;
