import React from 'react';
import { useFormValidation } from '../hooks/useFormValidation';
import { post } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import { MdEmail, MdPerson, MdSubject, MdMessage } from 'react-icons/md';

export default function Contact() {
    const { showSuccess, showError } = useToast();
    const [loading, setLoading] = React.useState(false);

    const {
        values: formData,
        getFieldProps,
        handleSubmit: handleFormSubmit,
        setError,
        touched,
        reset,
    } = useFormValidation(
        {
            name: '',
            email: '',
            subject: '',
            message: '',
        },
        {},
        {
            validateOnChange: true,
            validateOnBlur: true,
        }
    );

    // Custom validation
    const validateField = (fieldName, value) => {
        switch (fieldName) {
            case 'name':
                if (!value || !value.trim()) return 'Name is required';
                if (value.trim().length < 2) return 'Name must be at least 2 characters';
                if (value.trim().length > 100) return 'Name must be less than 100 characters';
                return null;
            case 'email':
                if (!value || !value.trim()) return 'Email is required';
                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{3,}$/;
                if (!emailRegex.test(value.trim())) return 'Please enter a valid email address';
                return null;
            case 'subject':
                if (!value || !value.trim()) return 'Subject is required';
                if (value.trim().length < 3) return 'Subject must be at least 3 characters';
                if (value.trim().length > 200) return 'Subject must be less than 200 characters';
                return null;
            case 'message':
                if (!value || !value.trim()) return 'Message is required';
                if (value.trim().length < 10) return 'Message must be at least 10 characters';
                if (value.trim().length > 5000) return 'Message must be less than 5000 characters';
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
        // Validate all fields before submission
        const errors = {};
        Object.keys(values).forEach((fieldName) => {
            const error = validateField(fieldName, values[fieldName]);
            if (error) {
                errors[fieldName] = error;
                setError(fieldName, error);
            }
        });

        // If there are validation errors, don't submit
        if (Object.keys(errors).length > 0) {
            const firstErrorField = Object.keys(errors)[0];
            const element = document.querySelector(`[name="${firstErrorField}"]`);
            if (element) {
                element.focus();
            }
            return;
        }

        setLoading(true);
        try {
            const result = await post(API_ENDPOINTS.CONTACT_FORM.SUBMIT, values);
            showSuccess(result.message || 'Thank you for your message! We\'ll get back to you soon.');
            reset(); // Clear form after successful submission
        } catch (error) {
            showError(error.message || 'Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
                <p className="text-gray-600 text-lg">
                    Have a question or want to get in touch? Send us a message and we'll respond as soon as possible.
                </p>
            </div>

            <div className="bg-white shadow rounded-lg p-8">
                <form className="space-y-6" onSubmit={handleFormSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Name *
                            </label>
                            <Input
                                type="text"
                                placeholder="Your full name"
                                icon={MdPerson}
                                iconColor="text-gray-500"
                                iconSize={18}
                                {...getFieldPropsWithValidation('name')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email *
                            </label>
                            <Input
                                type="email"
                                placeholder="your.email@example.com"
                                icon={MdEmail}
                                iconColor="text-gray-500"
                                iconSize={18}
                                {...getFieldPropsWithValidation('email')}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subject *
                        </label>
                        <Input
                            type="text"
                            placeholder="What is this regarding?"
                            icon={MdSubject}
                            iconColor="text-gray-500"
                            iconSize={18}
                            {...getFieldPropsWithValidation('subject')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message *
                        </label>
                        <div className="relative">
                            <div className="flex items-start">
                                <div className="absolute top-3 left-3 z-10">
                                    <MdMessage className="text-gray-500" size={18} />
                                </div>
                                <textarea
                                    name="message"
                                    value={formData.message || ''}
                                    onChange={(e) => {
                                        const props = getFieldPropsWithValidation('message');
                                        props.onChange(e);
                                    }}
                                    onBlur={(e) => {
                                        const props = getFieldPropsWithValidation('message');
                                        props.onBlur(e);
                                    }}
                                    placeholder="Tell us more about your inquiry..."
                                    rows={6}
                                    className={`
                                        w-full 
                                        border 
                                        ${touched.message && getFieldProps('message').error 
                                            ? 'border-red-500 bg-red-50' 
                                            : touched.message && !getFieldProps('message').error && formData.message
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 bg-white'
                                        } 
                                        pl-10
                                        pr-4 
                                        py-3 
                                        rounded-sm 
                                        outline-none 
                                        transition-colors
                                        resize-none
                                        focus-within:border-blue-500
                                    `}
                                />
                            </div>
                            {touched.message && getFieldProps('message').error && (
                                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                    <span>{getFieldProps('message').error}</span>
                                </p>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {formData.message?.length || 0} / 5000 characters
                        </p>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            text={loading ? 'Sending...' : 'Send Message'}
                        >
                            {loading && <Spinner size="sm" color="white" />}
                        </Button>
                    </div>
                </form>
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Other Ways to Reach Us</h3>
                <div className="space-y-2 text-blue-800">
                    <p><strong>Email:</strong> support@example.com</p>
                    <p><strong>Response Time:</strong> We typically respond within 24-48 hours</p>
                </div>
            </div>
        </div>
    );
}
