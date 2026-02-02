
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module dirname setting
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        let value = valueParts.join('=');
        // Remove quotes if present
        value = value.replace(/^['"](.*)['"]$/, '$1').trim();
        envConfig[key.trim()] = value;
    }
});

// 2. Initialize Supabase Admin Client
const supabaseUrl = envConfig['VITE_SUPABASE_URL'];
const serviceRoleKey = envConfig['VITE_SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Supabase URL or Service Role Key missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// 3. Define Mappings (Env Var -> DB Key)
const mapping = {
    // Payment
    'VITE_PAYMENT_LINK_FIRST': 'payment_link_first',
    'VITE_PAYMENT_LINK_FINAL': 'payment_link_final',
    'VITE_PAYMENT_AMOUNT_FIRST': 'payment_amount_first',
    'VITE_PAYMENT_AMOUNT_FINAL': 'payment_amount_final',
    // Solapi (Optional: Store in DB if you want to manage rotation dynamically, 
    // but usually these stay in env for security. Here strictly following user request to move config)
    // 'VITE_SOLAPI_API_KEY': 'solapi_api_key', 
    // 'VITE_SOLAPI_PF_ID': 'solapi_pf_id',
    // 'VITE_SOLAPI_SENDER': 'solapi_sender',
    // Note: Secrets should ideally stay in env or Vault, but templates are fine in DB.
};

// Auto-map all templates
Object.keys(envConfig).forEach(key => {
    if (key.startsWith('VITE_TEMPLATE_')) {
        // VITE_TEMPLATE_HOST_REGISTERED -> template_host_registered
        const dbKey = key.replace('VITE_', '').toLowerCase();
        mapping[key] = dbKey;
    }
});

async function migrate() {
    console.log('🚀 Starting Admin Settings Migration...');
    const upsertData = [];

    for (const [envKey, dbKey] of Object.entries(mapping)) {
        const value = envConfig[envKey];
        if (value && value !== 'placeholder_value') { // Filter basic placeholders if needed
            upsertData.push({
                key: dbKey,
                value: value
            });
            console.log(`Prepared: ${envKey} -> ${dbKey}`);
        }
    }

    if (upsertData.length === 0) {
        console.log('⚠️ No data to migrate.');
        return;
    }

    // 4. Perform Upsert
    const { error } = await supabase
        .from('admin_settings')
        .upsert(upsertData, { onConflict: 'key' });

    if (error) {
        console.error('❌ Migration Failed:', error.message);
    } else {
        console.log('✅ Migration Successful!');
        console.log(`Synced ${upsertData.length} configuration items to Supabase DB.`);
    }
}

migrate();
