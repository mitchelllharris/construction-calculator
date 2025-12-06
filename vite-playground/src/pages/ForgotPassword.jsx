import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { post } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import { useFormValidation } from '../hooks/useFormValidation';
import AuthLayout from '../layouts/Auth.jsx';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { MdEmail } from 'react-icons/md';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const [loading, setLoading] = useState(false);

    const {
        getFieldProps,
        handleSubmit: handleFormSubmit,
        setError,
        touched,
    } = useFormValidation(
        {
            email: '',
        },
        {},
        {
            validateOnChange: true,
            validateOnBlur: true,
        }
    );

    const validateField = (fieldName, value) => {
        switch (fieldName) {
            case 'email':
                if (!value || !value.trim()) return 'Email is required';
                // Stricter email validation: requires at least 1 char before @, domain with at least 1 char, and TLD with at least 3 chars (.com, .org, .net, etc.)
                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{3,}$/;
                if (!emailRegex.test(value.trim())) return 'Please enter a valid email address';
                return null;
            default:
                return null;
        }
    };

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
        setLoading(true);
        try {
            const result = await post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: values.email });
            showSuccess(result.message || 'If an account exists with this email, a password reset link has been sent.');
        } catch (err) {
            showError(err.message || 'Failed to send password reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className='justify-center basis-3/8 flex flex-col gap-6 grow p-10'>
                <h1 className='text-4xl font-medium'>Forgot Password</h1>
                <p className='text-gray-600'>
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                <form className='flex flex-col gap-3' onSubmit={handleFormSubmit(onSubmit)}>
                    <Input 
                        type="email" 
                        placeholder="Email" 
                        icon={MdEmail}
                        iconColor="text-gray-500"
                        iconSize={18}
                        {...getFieldPropsWithValidation('email')}
                    />

                    <Button 
                        type="submit" 
                        text={loading ? 'Sending...' : 'Send Reset Link'} 
                    />
                    
                    <div className='flex flex-col gap-2 text-sm'>
                        <Link to="/login" className='text-blue-600 hover:opacity-70'>
                            Back to login
                        </Link>
                    </div>
                </form>
            </div>
        </AuthLayout>
    );
}

