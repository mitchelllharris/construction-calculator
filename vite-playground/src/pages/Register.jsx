import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import AuthLayout from '../layouts/Auth.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { useFormValidation } from '../hooks/useFormValidation.js';
import { MdEmail, MdPerson } from 'react-icons/md';
import { RiLockPasswordFill } from 'react-icons/ri';

export default function Register() {
    const navigate = useNavigate();
    const { register, loading } = useAuth();
    const { showError, showSuccess } = useToast();

    const {
        values: formData,
        getFieldProps,
        handleSubmit: handleFormSubmit,
        setError,
        touched,
    } = useFormValidation(
        {
            username: '',
            email: '',
            firstName: '',
            lastName: '',
            password: '',
            confirmPassword: '',
        },
        {},
        {
            validateOnChange: true,
            validateOnBlur: true,
        }
    );

    // Custom validation rules that need access to form values
    const validateField = (fieldName, value) => {
        switch (fieldName) {
            case 'username':
                if (!value || !value.trim()) return 'Username is required';
                if (value.length < 3) return 'Username must be at least 3 characters';
                if (value.length > 30) return 'Username must be no more than 30 characters';
                if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
                return null;
            case 'email':
                if (!value || !value.trim()) return 'Email is required';
                // Stricter email validation: requires at least 1 char before @, domain with at least 1 char, and TLD with at least 3 chars (.com, .org, .net, etc.)
                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{3,}$/;
                if (!emailRegex.test(value.trim())) return 'Please enter a valid email address';
                return null;
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
            case 'firstName':
                if (!value || !value.trim()) return 'First name is required';
                if (value.trim().length > 50) return 'First name must be less than 50 characters';
                return null;
            case 'lastName':
                if (!value || !value.trim()) return 'Last name is required';
                if (value.trim().length > 50) return 'Last name must be less than 50 characters';
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
                // Real-time validation after field is touched
                if (touched[fieldName]) {
                    const error = validateField(fieldName, e.target.value);
                    setError(fieldName, error);
                }
                // Special handling for password confirmation
                if (fieldName === 'password' && formData.confirmPassword) {
                    const confirmError = validateField('confirmPassword', formData.confirmPassword);
                    setError('confirmPassword', confirmError);
                }
            },
        };
    };

    const onSubmit = async (values) => {
        const result = await register({
            username: values.username,
            email: values.email,
            firstName: values.firstName,
            lastName: values.lastName,
            password: values.password,
        });

        if (result.success) {
            showSuccess('Registration successful! Please check your email to verify your account before logging in.');
            navigate('/login');
        } else {
            showError(result.message);
        }
    };

    return (
        <AuthLayout>
            <div className='justify-center basis-3/8 flex flex-col gap-6 grow p-10'>
                <h1 className='text-4xl font-medium'>Sign up</h1>

                <form className='flex flex-col gap-3' onSubmit={handleFormSubmit(onSubmit)}>
                    <div>
                        <Input 
                            type="text" 
                            placeholder="Username" 
                            icon={MdPerson}
                            iconColor="text-gray-500"
                            iconSize={18}
                            {...getFieldPropsWithValidation('username')}
                        />
                    </div>

                    <div>
                        <Input 
                            type="email" 
                            placeholder="Email" 
                            icon={MdEmail}
                            iconColor="text-gray-500"
                            iconSize={18}
                            {...getFieldPropsWithValidation('email')}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Input 
                                type="text" 
                                placeholder="First Name" 
                                icon={MdPerson}
                                iconColor="text-gray-500"
                                iconSize={18}
                                {...getFieldPropsWithValidation('firstName')}
                            />
                        </div>
                        <div>
                            <Input 
                                type="text" 
                                placeholder="Last Name" 
                                icon={MdPerson}
                                iconColor="text-gray-500"
                                iconSize={18}
                                {...getFieldPropsWithValidation('lastName')}
                            />
                        </div>
                    </div>

                    <div>
                        <Input 
                            type="password" 
                            placeholder="Password" 
                            icon={RiLockPasswordFill}
                            iconColor="text-gray-500"
                            iconSize={18}
                            {...getFieldPropsWithValidation('password')}
                        />
                    </div>

                    <div>
                        <Input 
                            type="password" 
                            placeholder="Confirm Password" 
                            icon={RiLockPasswordFill}
                            iconColor="text-gray-500"
                            iconSize={18}
                            {...getFieldPropsWithValidation('confirmPassword')}
                        />
                    </div>

                    <Button 
                        type="submit" 
                        text={loading ? 'Signing up...' : 'Sign up'} 
                    />
                    <span className='text-sm'>
                        Already have an account?{' '}
                        <Link className='text-blue-600 hover:opacity-70' to="/login">
                            Log in
                        </Link>
                    </span>
                </form>
            </div>
        </AuthLayout>
    );
}