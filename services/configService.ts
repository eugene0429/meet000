import { supabase } from '../lib/supabaseClient';
import templateIds from '../templates/templates.json';

export interface SystemConfig {
    templates: Record<string, string>;
    paymentLinkFirst?: string;
    paymentAmountFirst?: string;
    paymentLinkFinal?: string;
    paymentAmountFinal?: string;
}

// Default config from JSON file + Env for payment
const defaultConfig: SystemConfig = {
    templates: {
        HOST_REGISTERED: templateIds.HOST_REGISTERED || '',
        GUEST_APPLIED: templateIds.GUEST_APPLIED || '',
        HOST_NEW_APPLICANT: templateIds.HOST_NEW_APPLICANT || '',
        FIRST_MATCH_COMPLETE: templateIds.FIRST_MATCH_COMPLETE || '',
        NOT_SELECTED: templateIds.NOT_SELECTED || '',
        PAYMENT_REQUEST: templateIds.PAYMENT_REQUEST || '',
        INFO_DELIVERED: templateIds.INFO_DELIVERED || '',
        INFO_DENIED_CONTINUE: templateIds.INFO_DENIED_CONTINUE || '',
        WAIT_OTHER_TEAM: templateIds.WAIT_OTHER_TEAM || '',
        FINAL_PAYMENT_REQUEST: templateIds.FINAL_PAYMENT_REQUEST || '',
        FINAL_MATCH_COMPLETE: templateIds.FINAL_MATCH_COMPLETE || '',
        PROCESS_CANCELLED: templateIds.PROCESS_CANCELLED || '',
        HOST_CANCELLED_ALL: templateIds.HOST_CANCELLED_ALL || '',
        GUEST_CANCELLED_AFTER_FIRST: templateIds.GUEST_CANCELLED_AFTER_FIRST || '',
        GUEST_CANCELLED_HOST_NOTIFY: templateIds.GUEST_CANCELLED_HOST_NOTIFY || '',
        GUEST_CANCELLED_BEFORE_FIRST: templateIds.GUEST_CANCELLED_BEFORE_FIRST || '',
        GUEST_CANCELLED_BEFORE_HOST_NOTIFY: templateIds.GUEST_CANCELLED_BEFORE_HOST_NOTIFY || '',

        // Additional templates
        PUBLIC_ROOM_FIRST_MATCH: templateIds.PUBLIC_ROOM_FIRST_MATCH || '',
        STUDENT_ID_REJECTED: templateIds.STUDENT_ID_REJECTED || '',
        REFUND_GUIDE: templateIds.REFUND_GUIDE || '',
        NO_REFUND_NOTICE: templateIds.NO_REFUND_NOTICE || '',
        MATCH_REMINDER: templateIds.MATCH_REMINDER || '',
        DECISION_TIME: templateIds.DECISION_TIME || '',
    },
    paymentLinkFirst: import.meta.env.VITE_PAYMENT_LINK_FIRST || '',
    paymentAmountFirst: import.meta.env.VITE_PAYMENT_AMOUNT_FIRST || '',
    paymentLinkFinal: import.meta.env.VITE_PAYMENT_LINK_FINAL || '',
    paymentAmountFinal: import.meta.env.VITE_PAYMENT_AMOUNT_FINAL || '',
};

export const fetchSystemConfig = async (): Promise<SystemConfig> => {
    try {
        const { data, error } = await supabase
            .from('admin_settings')
            .select('key, value');

        if (error || !data) {
            console.warn("Failed to fetch system config from DB, using default config:", error);
            return defaultConfig;
        }

        const config: SystemConfig = {
            templates: { ...defaultConfig.templates },
            paymentLinkFirst: defaultConfig.paymentLinkFirst,
            paymentAmountFirst: defaultConfig.paymentAmountFirst,
            paymentLinkFinal: defaultConfig.paymentLinkFinal,
            paymentAmountFinal: defaultConfig.paymentAmountFinal,
        };

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
            } else if (row.key === 'payment_link_first') {
                config.paymentLinkFirst = row.value;
            } else if (row.key === 'payment_amount_first') {
                config.paymentAmountFirst = row.value;
            } else if (row.key === 'payment_link_final') {
                config.paymentLinkFinal = row.value;
            } else if (row.key === 'payment_amount_final') {
                config.paymentAmountFinal = row.value;
            }
        });

        return config;
    } catch (err) {
        console.error("Error in fetchSystemConfig:", err);
        return defaultConfig;
    }
};
