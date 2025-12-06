import React, { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { post } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import { useFormValidation } from '../hooks/useFormValidation';
import AuthLayout from '../layouts/Auth.jsx';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { RiLockPasswordFill } from 'react-icons/ri';

export default function ResetPassword() {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [loading, setLoading] = React.useState(false);

    const {
        values: formData,
        getFieldProps,
        handleSubmit: handleFormSubmit,
        setError,
        touched,
    } = useFormValidation(
        {
            password: '',
            confirmPassword: '',
        },
        {},
        {
            validateOnChange: true,
            validateOnBlur: true,
        }
    );

    useEffect(() => {
        if (!token) {
            showError('No reset token provided. Please use the link from your email.');
        }
    }, [token, showError]);

    const validateField = (fieldName, value) => {
        switch (fieldName) {
            case 'password':
                if (!value) return 'Password is required';
                if (value.length < 8) return 'Password must be at least 8 characters';
                if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
                if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
                if (!/\d/.test(value)) return 'Password must contain at least one number';
                if (!/[@$!%*?&]/.test(value)) return 'Password must contain at least one special character (@$!%*?&)';
                return null;
            case 'confirmPassword':
                if (!value) return 'Please confirm your password';
                if (value !== formData.password) return 'Passwords do not match';
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
                if (fieldName === 'password' && formData.confirmPassword) {
                    const confirmError = validateField('confirmPassword', formData.confirmPassword);
                    setError('confirmPassword', confirmError);
                }
            },
        };
    };

    const onSubmit = async (values) => {
        if (!token) {
            showError('No reset token provided. Please use the link from your email.');
            return;
        }

        setLoading(true);
        try {
            const result = await post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
                token,
                password: values.password,
            });
            showSuccess(result.message || 'Password reset successfully! Redirecting to login...');
            
            setTimeout(() => {
                navigate('/login', { 
                    state: { message: 'Password reset successfully! You can now log in with your new password.' } 
                });
            }, 3000);
        } catch (err) {
            showError(err.message || 'Password reset failed. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className='justify-center basis-3/8 flex flex-col gap-6 grow p-10'>
                <h1 className='text-4xl font-medium'>Reset Password</h1>

                <form className='flex flex-col gap-3' onSubmit={handleFormSubmit(onSubmit)}>
                    <div>
                        <Input 
                            type="password" 
                            placeholder="New Password" 
                            icon={RiLockPasswordFill}
                            iconColor="text-gray-500"
                            iconSize={18}
                            {...getFieldPropsWithValidation('password')}
                        />
                    </div>

                    <div>
                        <Input 
                            type="password" 
                            placeholder="Confirm New Password" 
                            icon={RiLockPasswordFill}
                            iconColor="text-gray-500"
                            iconSize={18}
                            {...getFieldPropsWithValidation('confirmPassword')}
                        />
                    </div>

                        <Button 
                            type="submit" 
                            text={loading ? 'Resetting...' : 'Reset Password'} 
                        />
                        
                        <Link to="/login" className='text-blue-600 hover:opacity-70 text-sm'>
                            Back to login
                        </Link>
                    </form>
            </div>
        </AuthLayout>
    );
}

