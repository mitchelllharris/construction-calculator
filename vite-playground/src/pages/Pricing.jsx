import React from 'react';
import { Link } from 'react-router-dom';

export default function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        'Basic authentication',
        'User profile management',
        'Email verification',
        'Community support',
        'Up to 100 users',
      ],
      cta: 'Get Started',
      ctaLink: '/register',
      popular: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'per month',
      description: 'For growing businesses',
      features: [
        'Everything in Free',
        'Advanced user management',
        'Priority support',
        'Custom integrations',
        'Up to 1,000 users',
        'Analytics dashboard',
      ],
      cta: 'Start Free Trial',
      ctaLink: '/register',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations',
      features: [
        'Everything in Pro',
        'Unlimited users',
        'Dedicated support',
        'Custom development',
        'SLA guarantee',
        'On-premise deployment',
      ],
      cta: 'Contact Sales',
      ctaLink: '/contact',
      popular: false,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-gray-600">
          Choose the plan that's right for you
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg shadow-lg p-8 ${
              plan.popular
                ? 'border-2 border-blue-500 transform scale-105'
                : 'border border-gray-200'
            }`}
          >
            {plan.popular && (
              <div className="bg-blue-500 text-white text-sm font-semibold px-4 py-1 rounded-full inline-block mb-4">
                Most Popular
              </div>
            )}
            <h3 className="text-2xl font-bold mb-2 text-gray-900">{plan.name}</h3>
            <p className="text-gray-600 mb-4">{plan.description}</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
              {plan.period && (
                <span className="text-gray-600 ml-2">/{plan.period}</span>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              to={plan.ctaLink}
              className={`w-full text-center block py-3 px-6 rounded-sm font-semibold transition-colors ${
                plan.popular
                  ? 'bg-blue-500 hover:bg-blue-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* Feature Comparison Table */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-center text-gray-900">
          Feature Comparison
        </h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Feature
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                  Free
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                  Pro
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 text-sm text-gray-700">User Management</td>
                <td className="px-6 py-4 text-center">
                  <span className="text-green-500">✓</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-green-500">✓</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-green-500">✓</span>
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-700">Email Support</td>
                <td className="px-6 py-4 text-center">
                  <span className="text-gray-400">—</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-green-500">✓</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-green-500">✓</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-700">Priority Support</td>
                <td className="px-6 py-4 text-center">
                  <span className="text-gray-400">—</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-green-500">✓</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-green-500">✓</span>
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-700">Custom Integrations</td>
                <td className="px-6 py-4 text-center">
                  <span className="text-gray-400">—</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-green-500">✓</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-green-500">✓</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-700">SLA Guarantee</td>
                <td className="px-6 py-4 text-center">
                  <span className="text-gray-400">—</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-gray-400">—</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-green-500">✓</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-center text-gray-900">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              Can I change plans later?
            </h3>
            <p className="text-gray-600">
              Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              What payment methods do you accept?
            </h3>
            <p className="text-gray-600">
              We accept all major credit cards and PayPal. Enterprise customers can also pay via invoice.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              Is there a free trial?
            </h3>
            <p className="text-gray-600">
              Yes, all paid plans come with a 14-day free trial. No credit card required to start.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              What happens if I exceed my user limit?
            </h3>
            <p className="text-gray-600">
              We'll notify you when you're approaching your limit. You can upgrade your plan or contact us for custom solutions.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Still have questions?</h2>
        <p className="text-blue-100 mb-6">
          Our team is here to help you choose the right plan for your needs.
        </p>
        <Link
          to="/contact"
          className="bg-white text-blue-600 font-semibold py-3 px-8 rounded-sm hover:bg-blue-50 transition-colors inline-block"
        >
          Contact Us
        </Link>
      </section>
    </div>
  );
}
