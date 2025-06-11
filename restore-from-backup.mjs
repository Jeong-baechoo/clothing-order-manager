// Restore script from backup
// Run this script with: node restore-from-backup.mjs

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreFromBackup() {
    console.log('Starting restore from backup...');
    
    try {
        // Read backup files
        const ordersBackup = JSON.parse(fs.readFileSync('backup-orders.json', 'utf8'));
        const orderItemsBackup = JSON.parse(fs.readFileSync('backup-order-items.json', 'utf8'));
        
        console.log(`Found ${ordersBackup.length} orders and ${orderItemsBackup.length} order items in backup`);
        
        // Step 1: Delete all existing data
        console.log('Step 1: Clearing existing data...');
        
        // Delete order_items first (foreign key constraint)
        const { error: deleteItemsError } = await supabase
            .from('order_items')
            .delete()
            .gte('id', 0);
            
        if (deleteItemsError) {
            console.error('Failed to delete order items:', deleteItemsError);
        }
        
        // Delete orders
        const { error: deleteOrdersError } = await supabase
            .from('orders')
            .delete()
            .gte('id', '');
            
        if (deleteOrdersError) {
            console.error('Failed to delete orders:', deleteOrdersError);
        }
        
        // Step 2: Restore orders
        console.log('Step 2: Restoring orders...');
        const { error: insertOrdersError } = await supabase
            .from('orders')
            .insert(ordersBackup);
            
        if (insertOrdersError) {
            console.error('Failed to restore orders:', insertOrdersError);
            throw insertOrdersError;
        }
        
        // Step 3: Restore order_items
        console.log('Step 3: Restoring order items...');
        if (orderItemsBackup.length > 0) {
            const { error: insertItemsError } = await supabase
                .from('order_items')
                .insert(orderItemsBackup);
                
            if (insertItemsError) {
                console.error('Failed to restore order items:', insertItemsError);
                throw insertItemsError;
            }
        }
        
        console.log('Restore completed successfully!');
        
        // Verify restore
        const { data: finalOrders } = await supabase.from('orders').select('id');
        const { data: finalItems } = await supabase.from('order_items').select('id, order_id');
        
        console.log('\nRestore Summary:');
        console.log(`Total orders restored: ${finalOrders?.length || 0}`);
        console.log(`Total order items restored: ${finalItems?.length || 0}`);
        
    } catch (error) {
        console.error('Restore failed:', error);
    }
}

// Run restore
restoreFromBackup();