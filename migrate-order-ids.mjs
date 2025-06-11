// Migration script for order ID changes
// Run this script with: node migrate-order-ids.mjs

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';

config({ path: '.env.local' });

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
            console.error('Orders error:', ordersError);
            console.error('Items error:', itemsError);
            throw new Error('Failed to fetch data for backup');
        }
        
        // Save backup to files
        fs.writeFileSync('backup-orders.json', JSON.stringify(orders, null, 2));
        fs.writeFileSync('backup-order-items.json', JSON.stringify(orderItems, null, 2));
        console.log('Backup saved to backup-orders.json and backup-order-items.json');
        console.log(`Found ${orders?.length || 0} orders and ${orderItems?.length || 0} order items`);
        
        if (!orders || orders.length === 0) {
            console.log('No orders found to migrate.');
            return;
        }
        
        // Step 2: Create mapping of old IDs to new IDs
        console.log('Step 2: Creating ID mapping...');
        const idMapping = {};
        
        // Sort all orders by creation date
        const sortedOrders = orders.sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
        );
        
        // Generate new IDs in YYMM-XXX format based on order date
        let currentMonth = '';
        let monthCounter = 0;
        
        sortedOrders.forEach(order => {
            const orderDate = new Date(order.order_date || order.created_at);
            const year = orderDate.getFullYear().toString().slice(-2);
            const month = String(orderDate.getMonth() + 1).padStart(2, '0');
            const yearMonth = `${year}${month}`;
            
            // Reset counter for new month
            if (yearMonth !== currentMonth) {
                currentMonth = yearMonth;
                monthCounter = 0;
            }
            
            monthCounter++;
            const newId = `${yearMonth}-${String(monthCounter).padStart(3, '0')}`;
            idMapping[order.id] = newId;
        });
        
        console.log('ID mapping created:', idMapping);
        
        // Step 3: Temporarily disable foreign key checks by working with the constraint
        console.log('Step 3: Preparing for migration...');
        
        // First, delete all order_items (we have them backed up)
        console.log('Deleting existing order_items...');
        const { error: deleteAllItemsError } = await supabase
            .from('order_items')
            .delete()
            .gte('id', 0); // Delete all
            
        if (deleteAllItemsError) {
            console.error('Failed to delete order items:', deleteAllItemsError);
            throw deleteAllItemsError;
        }
        
        // Step 4: Delete all orders (we have them backed up)
        console.log('Step 4: Deleting existing orders...');
        const { error: deleteAllOrdersError } = await supabase
            .from('orders')
            .delete()
            .gte('id', ''); // Delete all
            
        if (deleteAllOrdersError) {
            console.error('Failed to delete orders:', deleteAllOrdersError);
            throw deleteAllOrdersError;
        }
        
        // Step 5: Insert orders with new IDs
        console.log('Step 5: Inserting orders with new IDs...');
        const newOrders = orders.map(order => ({
            ...order,
            id: idMapping[order.id]
        }));
        
        const { error: insertOrdersError } = await supabase
            .from('orders')
            .insert(newOrders);
            
        if (insertOrdersError) {
            console.error('Failed to insert new orders:', insertOrdersError);
            throw insertOrdersError;
        }
        
        // Step 6: Insert order_items with updated order_ids
        console.log('Step 6: Inserting order_items with new order IDs...');
        if (orderItems && orderItems.length > 0) {
            const newOrderItems = orderItems.map(item => ({
                ...item,
                order_id: idMapping[item.order_id]
            }));
            
            const { error: insertItemsError } = await supabase
                .from('order_items')
                .insert(newOrderItems);
                
            if (insertItemsError) {
                console.error('Failed to insert new order items:', insertItemsError);
                throw insertItemsError;
            }
        }
        
        console.log('Migration completed successfully!');
        
        // Verify migration
        const { data: finalOrders } = await supabase.from('orders').select('id');
        const { data: finalItems } = await supabase.from('order_items').select('id, order_id');
        
        console.log('\nMigration Summary:');
        console.log(`Total orders migrated: ${finalOrders?.length || 0}`);
        console.log(`Total order items migrated: ${finalItems?.length || 0}`);
        console.log('\nNew order IDs:', finalOrders?.map(o => o.id));
        
    } catch (error) {
        console.error('Migration failed:', error);
        console.log('\nTo restore from backup:');
        console.log('1. Use the backup files: backup-orders.json and backup-order-items.json');
        console.log('2. Run: node restore-from-backup.mjs');
    }
}

// Run migration
migrateOrderIds();