// Migration script for order ID changes
// Run this script with: node migrate-order-ids.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateOrderIds() {
    console.log('Starting order ID migration...');
    
    try {
        // Step 1: Backup current data
        console.log('Step 1: Creating backup...');
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*');
        
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('*');
            
        if (ordersError || itemsError) {
            throw new Error('Failed to fetch data for backup');
        }
        
        // Save backup to files
        const fs = require('fs');
        fs.writeFileSync('backup-orders.json', JSON.stringify(orders, null, 2));
        fs.writeFileSync('backup-order-items.json', JSON.stringify(orderItems, null, 2));
        console.log('Backup saved to backup-orders.json and backup-order-items.json');
        
        // Step 2: Create mapping of old IDs to new IDs
        console.log('Step 2: Creating ID mapping...');
        const idMapping = {};
        
        // Group orders by year-month
        const ordersByMonth = {};
        orders.forEach(order => {
            const yearMonth = order.id.substring(0, 4); // Extract YYMM
            if (!ordersByMonth[yearMonth]) {
                ordersByMonth[yearMonth] = [];
            }
            ordersByMonth[yearMonth].push(order);
        });
        
        // Generate new IDs (modify this logic based on your new ID strategy)
        Object.keys(ordersByMonth).forEach(yearMonth => {
            const monthOrders = ordersByMonth[yearMonth].sort((a, b) => 
                new Date(a.created_at) - new Date(b.created_at)
            );
            
            monthOrders.forEach((order, index) => {
                // Example: Change format from YYMM-XXX to YYYYMM-XXXX
                const year = '20' + yearMonth.substring(0, 2);
                const month = yearMonth.substring(2, 4);
                const newId = `${year}${month}-${String(index + 1).padStart(4, '0')}`;
                idMapping[order.id] = newId;
            });
        });
        
        console.log('ID mapping created:', idMapping);
        
        // Step 3: Disable foreign key checks (if your database supports it)
        // Note: Supabase doesn't allow disabling foreign keys directly
        // We'll need to work around this by updating in the correct order
        
        // Step 4: Update order_items first with new order_ids
        console.log('Step 3: Updating order_items with new order IDs...');
        for (const item of orderItems) {
            const newOrderId = idMapping[item.order_id];
            if (newOrderId) {
                // Create a new item with the new order_id
                const { error } = await supabase
                    .from('order_items')
                    .insert({
                        ...item,
                        order_id: newOrderId,
                        id: item.id + 1000000 // Temporary ID to avoid conflicts
                    });
                    
                if (error) {
                    console.error(`Failed to create new order_item for ${item.id}:`, error);
                }
            }
        }
        
        // Step 5: Delete old order_items
        console.log('Step 4: Removing old order_items...');
        const oldItemIds = orderItems.map(item => item.id);
        const { error: deleteItemsError } = await supabase
            .from('order_items')
            .delete()
            .in('id', oldItemIds);
            
        if (deleteItemsError) {
            console.error('Failed to delete old order items:', deleteItemsError);
        }
        
        // Step 6: Update orders with new IDs
        console.log('Step 5: Updating orders with new IDs...');
        for (const order of orders) {
            const newId = idMapping[order.id];
            if (newId) {
                // Insert new order with new ID
                const { error } = await supabase
                    .from('orders')
                    .insert({
                        ...order,
                        id: newId
                    });
                    
                if (error) {
                    console.error(`Failed to create new order ${newId}:`, error);
                }
            }
        }
        
        // Step 7: Delete old orders
        console.log('Step 6: Removing old orders...');
        const oldOrderIds = orders.map(order => order.id);
        const { error: deleteOrdersError } = await supabase
            .from('orders')
            .delete()
            .in('id', oldOrderIds);
            
        if (deleteOrdersError) {
            console.error('Failed to delete old orders:', deleteOrdersError);
        }
        
        // Step 8: Fix order_item IDs
        console.log('Step 7: Fixing order_item IDs...');
        const { data: newOrderItems } = await supabase
            .from('order_items')
            .select('*')
            .gt('id', 1000000);
            
        for (const item of newOrderItems) {
            const { error } = await supabase
                .from('order_items')
                .update({ id: item.id - 1000000 })
                .eq('id', item.id);
                
            if (error) {
                console.error(`Failed to fix order_item ID ${item.id}:`, error);
            }
        }
        
        console.log('Migration completed successfully!');
        
        // Verify migration
        const { data: finalOrders } = await supabase.from('orders').select('id');
        const { data: finalItems } = await supabase.from('order_items').select('id, order_id');
        
        console.log('\nMigration Summary:');
        console.log(`Total orders migrated: ${finalOrders.length}`);
        console.log(`Total order items migrated: ${finalItems.length}`);
        console.log('\nNew order IDs:', finalOrders.map(o => o.id));
        
    } catch (error) {
        console.error('Migration failed:', error);
        console.log('\nTo restore from backup:');
        console.log('1. Use the backup files: backup-orders.json and backup-order-items.json');
        console.log('2. Manually restore the data using Supabase dashboard or API');
    }
}

// Run migration
migrateOrderIds();