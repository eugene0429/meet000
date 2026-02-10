import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeams() {
    console.log('Checking teams for 2026-02-04...');

    // 1. Exact match check
    const { data: exactData, error: exactError } = await supabase
        .from('teams')
        .select('id, date, time, gender, role')
        .eq('date', '2026-02-04');

    if (exactError) {
        console.error('Error fetching exact date:', exactError);
    } else {
        console.log('Exact Match (2026-02-04):', exactData);
    }

    // 2. Broad check for Feb 2026
    const { data: broadData, error: broadError } = await supabase
        .from('teams')
        .select('id, date, time, gender, role')
        .like('date', '2026-02%')
        .order('date');

    if (broadError) {
        console.error('Error fetching broad date:', broadError);
    } else {
        console.log('All teams in Feb 2026:', broadData);
    }
}

checkTeams();
