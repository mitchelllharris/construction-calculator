import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { post } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import AuthLayout from '../layouts/Auth.jsx';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { MdEmail } from 'react-icons/md';

export default function ResendVerification() {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email.trim()) {
            showError('Email is required');
            return;
        }

        // Stricter email validation: requires at least 1 char before @, domain with at least 1 char, and TLD with at least 3 chars (.com, .org, .net, etc.)
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{3,}$/;
        if (!emailRegex.test(email.trim())) {
            showError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            const result = await post(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, { email });
            showSuccess(result.message || 'Verification email sent! Redirecting to login...');
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            showError(err.message || 'Failed to resend verification email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className='justify-center basis-3/8 flex flex-col gap-6 grow p-10'>
                <h1 className='text-4xl font-medium'>Resend Verification Email</h1>

                <form className='flex flex-col gap-3' onSubmit={handleSubmit}>
                    <Input 
                        type="email" 
                        placeholder="Email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={MdEmail}
                        iconColor="text-gray-500"
                        iconSize={18}
                    />

                    <Button 
                        type="submit" 
                        text={loading ? 'Sending...' : 'Resend Verification Email'} 
                    />
                    
                    <div className='flex flex-col gap-2 text-sm'>
                        <Link to="/login" className='text-blue-600 hover:opacity-70'>
                            Back to login
                        </Link>
                        <Link to="/register" className='text-blue-600 hover:opacity-70'>
                            Create new account
                        </Link>
                    </div>
                </form>
            </div>
        </AuthLayout>
    );
}

