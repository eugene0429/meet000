import { supabase } from '../lib/supabaseClient';

export interface SystemConfig {
    templates: Record<string, string>;
}

// Default config from Environment Variables
const envConfig: SystemConfig = {
    templates: {
        HOST_REGISTERED: import.meta.env.VITE_TEMPLATE_HOST_REGISTERED || '',
        GUEST_APPLIED: import.meta.env.VITE_TEMPLATE_GUEST_APPLIED || '',
        HOST_NEW_APPLICANT: import.meta.env.VITE_TEMPLATE_HOST_NEW_APPLICANT || '',
        FIRST_MATCH_COMPLETE: import.meta.env.VITE_TEMPLATE_FIRST_MATCH_COMPLETE || '',
        NOT_SELECTED: import.meta.env.VITE_TEMPLATE_NOT_SELECTED || '',
        PAYMENT_REQUEST: import.meta.env.VITE_TEMPLATE_PAYMENT_REQUEST || '',
        INFO_DELIVERED: import.meta.env.VITE_TEMPLATE_INFO_DELIVERED || '',
        INFO_DENIED_CONTINUE: import.meta.env.VITE_TEMPLATE_INFO_DENIED_CONTINUE || '',
        WAIT_OTHER_TEAM: import.meta.env.VITE_TEMPLATE_WAIT_OTHER_TEAM || '',
        FINAL_PAYMENT_REQUEST: import.meta.env.VITE_TEMPLATE_FINAL_PAYMENT_REQUEST || '',
        FINAL_MATCH_COMPLETE: import.meta.env.VITE_TEMPLATE_FINAL_MATCH_COMPLETE || '',
        PROCESS_CANCELLED: import.meta.env.VITE_TEMPLATE_PROCESS_CANCELLED || '',
        HOST_CANCELLED_ALL: import.meta.env.VITE_TEMPLATE_HOST_CANCELLED_ALL || '',
        GUEST_CANCELLED_AFTER_FIRST: import.meta.env.VITE_TEMPLATE_GUEST_CANCELLED_AFTER_FIRST || '',
        GUEST_CANCELLED_HOST_NOTIFY: import.meta.env.VITE_TEMPLATE_GUEST_CANCELLED_HOST_NOTIFY || '',
        GUEST_CANCELLED_BEFORE_FIRST: import.meta.env.VITE_TEMPLATE_GUEST_CANCELLED_BEFORE_FIRST || '',
        GUEST_CANCELLED_BEFORE_HOST_NOTIFY: import.meta.env.VITE_TEMPLATE_GUEST_CANCELLED_BEFORE_HOST_NOTIFY || '',
    }
};

export const fetchSystemConfig = async (): Promise<SystemConfig> => {
    try {
        const { data, error } = await supabase
            .from('admin_settings')
            .select('key, value');

        if (error || !data) {
            console.warn("Failed to fetch system config from DB, using env vars:", error);
            return envConfig;
        }

        const config = { templates: { ...envConfig.templates } };


        data.forEach(row => {
            if (row.key.startsWith('template_')) {
                const templateKey = row.key.replace('template_', '').toUpperCase();
                if (config.templates[templateKey] !== undefined) {
                    config.templates[templateKey] = row.value;
                } else {
                    const foundKey = Object.keys(config.templates).find(k => k === templateKey);
                    if (foundKey) {
                        config.templates[foundKey] = row.value;
                    }
                }
            }
        });

        return config;
    } catch (err) {
        console.error("Error in fetchSystemConfig:", err);
        return envConfig;
    }
};
