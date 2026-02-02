import { supabase } from '../lib/supabaseClient';

export interface SystemConfig {
    paymentLinkFirst: string;
    paymentLinkFinal: string;
    paymentAmountFirst: string;
    paymentAmountFinal: string;
    templates: Record<string, string>;
}

// Default config from Environment Variables
const envConfig: SystemConfig = {
    paymentLinkFirst: import.meta.env.VITE_PAYMENT_LINK_FIRST || 'https://pay.example.com',
    paymentLinkFinal: import.meta.env.VITE_PAYMENT_LINK_FINAL || 'https://pay.example.com/final',
    paymentAmountFirst: import.meta.env.VITE_PAYMENT_AMOUNT_FIRST || '5000',
    paymentAmountFinal: import.meta.env.VITE_PAYMENT_AMOUNT_FINAL || '10000',
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

        const config = { ...envConfig, templates: { ...envConfig.templates } };

        data.forEach(row => {
            // Payment Config
            if (row.key === 'payment_link_first') config.paymentLinkFirst = row.value;
            if (row.key === 'payment_link_final') config.paymentLinkFinal = row.value;
            if (row.key === 'payment_amount_first') config.paymentAmountFirst = row.value;
            if (row.key === 'payment_amount_final') config.paymentAmountFinal = row.value;

            // Template Config Overrides (e.g. key: "template_host_registered")
            if (row.key.startsWith('template_')) {
                const templateKey = row.key.replace('template_', '').toUpperCase();
                // Only update if it allows mapping to one of our keys, or just add it dynamic
                // Here we try to map to known keys if possible, or fuzzy match

                // Exact match check
                if (config.templates[templateKey] !== undefined) {
                    config.templates[templateKey] = row.value;
                } else {
                    // Try to find matching key
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
