-- Migration Script for Order ID Change
-- This script handles the migration of order IDs while maintaining referential integrity

-- Step 1: Create backup tables
CREATE TABLE IF NOT EXISTS orders_backup AS SELECT * FROM orders;
CREATE TABLE IF NOT EXISTS order_items_backup AS SELECT * FROM order_items;

-- Step 2: Add new temporary ID column to orders table
ALTER TABLE orders ADD COLUMN new_id TEXT;

-- Step 3: Generate new IDs based on new strategy
-- Assuming you want to change from the current format to a new format
-- Example: Converting from 'YYMM-XXX' to a different format
-- Modify this UPDATE statement based on your new ID generation strategy
UPDATE orders 
SET new_id = 
    CASE 
        -- If you want to keep the same format but renumber sequentially
        WHEN id IS NOT NULL THEN 
            CONCAT(
                SUBSTRING(id, 1, 4), -- Keep YYMM prefix
                '-',
                LPAD(ROW_NUMBER() OVER (PARTITION BY SUBSTRING(id, 1, 4) ORDER BY created_at), 3, '0')
            )
        ELSE id
    END;

-- Step 4: Add new temporary order_id column to order_items table
ALTER TABLE order_items ADD COLUMN new_order_id TEXT;

-- Step 5: Update order_items with new order IDs
UPDATE order_items oi
SET new_order_id = o.new_id
FROM orders o
WHERE oi.order_id = o.id;

-- Step 6: Drop foreign key constraint on order_items
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;

-- Step 7: Update the actual ID columns
UPDATE orders SET id = new_id WHERE new_id IS NOT NULL;
UPDATE order_items SET order_id = new_order_id WHERE new_order_id IS NOT NULL;

-- Step 8: Drop temporary columns
ALTER TABLE orders DROP COLUMN new_id;
ALTER TABLE order_items DROP COLUMN new_order_id;

-- Step 9: Re-add foreign key constraint
ALTER TABLE order_items 
ADD CONSTRAINT order_items_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Step 10: Verify migration
SELECT 
    'Orders migrated:' as description, 
    COUNT(*) as count 
FROM orders
UNION ALL
SELECT 
    'Order items updated:' as description, 
    COUNT(*) as count 
FROM order_items
UNION ALL
SELECT 
    'Orders with null IDs:' as description, 
    COUNT(*) as count 
FROM orders WHERE id IS NULL
UNION ALL
SELECT 
    'Orphaned order items:' as description, 
    COUNT(*) as count 
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.id IS NULL;

-- To rollback if needed:
-- DROP TABLE IF EXISTS orders;
-- DROP TABLE IF EXISTS order_items;
-- ALTER TABLE orders_backup RENAME TO orders;
-- ALTER TABLE order_items_backup RENAME TO order_items;