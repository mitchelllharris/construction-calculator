import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { post } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import AuthLayout from '../layouts/Auth.jsx';
import Button from '../components/Button.jsx';

export default function VerifyEmail() {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const token = searchParams.get('token');

    useEffect(() => {
        const verifyEmail = async () => {
            if (!token) {
                setStatus('error');
                showError('No verification token provided.');
                return;
            }

            try {
                const result = await post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token });
                setStatus('success');
                showSuccess(result.message || 'Email verified successfully! Redirecting to login...');
                
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/login', { 
                        state: { message: 'Email verified! You can now log in.' } 
                    });
                }, 3000);
            } catch (error) {
                setStatus('error');
                showError(error.message || 'Email verification failed. The link may have expired.');
            }
        };

        verifyEmail();
    }, [token, navigate, showSuccess, showError]);

    return (
        <AuthLayout>
            <div className='justify-center basis-3/8 flex flex-col gap-6 grow p-10'>
                <h1 className='text-4xl font-medium'>Email Verification</h1>
                
                {status === 'verifying' && (
                    <div className='text-gray-600'>
                        Verifying your email...
                    </div>
                )}

                {status === 'success' && (
                    <div className='flex flex-col gap-4'>
                        <p className='text-sm text-gray-600'>
                            Redirecting to login page...
                        </p>
                        <Link to="/login" className='text-blue-600 hover:opacity-70 text-sm'>
                            Or click here to go to login
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className='flex flex-col gap-4'>
                        <div className='flex flex-col gap-2'>
                            <Link to="/resend-verification" className='text-blue-600 hover:opacity-70 text-sm'>
                                Resend verification email
                            </Link>
                            <Link to="/login" className='text-blue-600 hover:opacity-70 text-sm'>
                                Go to login
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </AuthLayout>
    );
}

