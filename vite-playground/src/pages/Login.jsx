import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import AuthLayout from '../layouts/Auth.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { useFormValidation } from '../hooks/useFormValidation.js';
import { MdEmail } from 'react-icons/md';
import { RiLockPasswordFill } from "react-icons/ri";

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, loading, isAuthenticated } = useAuth();
    const { showSuccess, showError } = useToast();

    const {
        values,
        getFieldProps,
        handleSubmit: handleFormSubmit,
        setError,
        touched,
    } = useFormValidation(
        {
            username: '',
            password: '',
        },
        {},
        {
            validateOnChange: true,
            validateOnBlur: true,
        }
    );

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const from = location.state?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    // Show success message from registration
    useEffect(() => {
        if (location.state?.message) {
            showSuccess(location.state.message);
        }
    }, [location, showSuccess]);

    // Custom validation
    const validateField = (fieldName, value) => {
        switch (fieldName) {
            case 'username':
                if (!value || !value.trim()) return 'Username is required';
                return null;
            case 'password':
                if (!value) return 'Password is required';
                return null;
            default:
                return null;
        }
    };

    // Enhanced field props with custom validation
    const getFieldPropsWithValidation = (fieldName) => {
        const props = getFieldProps(fieldName);
        const originalOnBlur = props.onBlur;
        const originalOnChange = props.onChange;

        return {
            ...props,
            onBlur: (e) => {
                originalOnBlur(e);
                const error = validateField(fieldName, e.target.value);
                setError(fieldName, error);
            },
            onChange: (e) => {
                originalOnChange(e);
                if (touched[fieldName]) {
                    const error = validateField(fieldName, e.target.value);
                    setError(fieldName, error);
                }
            },
        };
    };

    const onSubmit = async (values) => {
        const result = await login({
            username: values.username.trim(),
            password: values.password,
        });

        if (result.success) {
            showSuccess('Login successful!');
            const from = location.state?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
        } else {
            showError(result.message);
        }
    };

    return (
        <AuthLayout>
            <div className='justify-center basis-3/8 flex flex-col gap-6 grow p-10'>
                <h1 className='text-4xl font-medium'>Log in</h1>
                
                <form className='flex flex-col gap-3' onSubmit={handleFormSubmit(onSubmit)}>
                    <Input 
                        type="text" 
                        placeholder="Username" 
                        icon={MdEmail}
                        iconColor="text-gray-500"
                        iconSize={18}
                        {...getFieldPropsWithValidation('username')}
                    />

                    <Input 
                        type="password" 
                        placeholder="Password" 
                        icon={RiLockPasswordFill}
                        iconColor="text-gray-500"
                        iconSize={18}
                        {...getFieldPropsWithValidation('password')}
                    />

                    <div className='flex gap-2 items-center text-sm'>
                        <input type="checkbox" className='border border-gray-200 w-4 h-4 rounded-xs' /> Remember me
                    </div>

                    <Button 
                        type="submit" 
                        text={loading ? 'Logging in...' : 'Log in'} 
                    />
                    
                    <div className='flex flex-col gap-2 text-sm'>
                        <Link to="/forgot-password" className='text-blue-600 hover:opacity-70 text-right'>
                            Forgot password?
                        </Link>
                        <span>
                            Don't have an account?{' '}
                            <Link className='text-blue-600 hover:opacity-70' to="/register">
                                Sign up
                            </Link>
                        </span>
                    </div>
                </form>
            </div>
        </AuthLayout>
    );
}