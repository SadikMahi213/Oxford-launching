-- Find which of the 55 users (199-253) are NOT in 203's downline
WITH RECURSIVE team_tree AS (
    SELECT id, 1 AS depth FROM users WHERE parent_lvl_1_id = 203
    UNION ALL
    SELECT u.id, tt.depth + 1 FROM users u
    INNER JOIN team_tree tt ON u.parent_lvl_1_id = tt.id
)
SELECT 'in_203_downline' as location, COUNT(*) FROM team_tree
UNION ALL
SELECT 'not_in_203_downline', COUNT(*) FROM users 
WHERE id BETWEEN 199 AND 253 
  AND id NOT IN (SELECT id FROM team_tree)
UNION ALL
SELECT 'total_non_admin_users', COUNT(*) FROM users WHERE is_admin = FALSE;

-- Show the specific users NOT in 203's downline
SELECT id, username, parent_lvl_1_id, created_at FROM users 
WHERE id BETWEEN 199 AND 253 
  AND id NOT IN (
    WITH RECURSIVE team_tree AS (
        SELECT id, 1 AS depth FROM users WHERE parent_lvl_1_id = 203
        UNION ALL
        SELECT u.id, tt.depth + 1 FROM users u
        INNER JOIN team_tree tt ON u.parent_lvl_1_id = tt.id
    )
    SELECT id FROM team_tree
  )
ORDER BY id;
