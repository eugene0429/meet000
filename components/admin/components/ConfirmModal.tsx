import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, X, Check } from 'lucide-react';
import { ModalConfig } from '../types';

interface ConfirmModalProps {
    config: ModalConfig;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * 알림/확인 모달 컴포넌트
 */
export function ConfirmModal({ config, onClose, onConfirm }: ConfirmModalProps) {
    if (!config.isOpen) return null;

    const isAlert = config.type === 'ALERT';

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center"
            >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isAlert ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                    {isAlert ? (
                        <AlertCircle className="w-8 h-8 text-yellow-600" />
                    ) : (
                        <AlertTriangle className="w-8 h-8 text-blue-600" />
                    )}
                </div>

                <p className="text-gray-700 whitespace-pre-line mb-6 text-sm">
                    {config.message}
                </p>

                <div className="flex gap-3">
                    {isAlert ? (
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                        >
                            확인
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                취소
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                확인
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
