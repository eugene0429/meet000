import React, { useState, useCallback } from 'react';

interface UseAdminAuthReturn {
    isAuthenticated: boolean;
    password: string;
    setPassword: (password: string) => void;
    loginError: string;
    handleLogin: (e: React.FormEvent) => void;
    setIsAuthenticated: (value: boolean) => void;
}

/**
 * 관리자 인증 로직을 처리하는 Hook
 */
export function useAdminAuth(): UseAdminAuthReturn {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const handleLogin = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        // Validation is done externally (in component), this just sets the state
        setIsAuthenticated(true);
        setLoginError('');
    }, []);

    return {
        isAuthenticated,
        password,
        setPassword,
        loginError,
        handleLogin,
        setIsAuthenticated,
    };
}
