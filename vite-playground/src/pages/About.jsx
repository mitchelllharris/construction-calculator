import React from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
          About Us
        </h1>
        <p className="text-xl text-gray-600">
          Building secure, scalable web applications
        </p>
      </div>

      {/* Overview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Our Story</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          We are dedicated to providing a production-ready boilerplate that developers can use as a foundation for their web applications. Our platform combines security, performance, and user experience to deliver exceptional results.
        </p>
        <p className="text-gray-700 leading-relaxed">
          Built with modern technologies and best practices, our boilerplate includes everything you need to get started quickly while maintaining the flexibility to customize for your specific needs.
        </p>
      </section>

      {/* Mission Section */}
      <section className="mb-12 bg-blue-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Our Mission</h2>
        <p className="text-gray-700 leading-relaxed">
          To provide developers with a secure, well-documented, and production-ready foundation that accelerates development while maintaining high standards for security and code quality.
        </p>
      </section>

      {/* Vision Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Our Vision</h2>
        <p className="text-gray-700 leading-relaxed">
          To become the go-to boilerplate for developers who value security, best practices, and clean code architecture. We believe in empowering developers to build amazing applications without compromising on security or quality.
        </p>
      </section>

      {/* Values Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900">Our Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Security First</h3>
            <p className="text-gray-600">
              We prioritize security in every aspect of our platform, implementing industry best practices and staying updated with the latest security standards.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Code Quality</h3>
            <p className="text-gray-600">
              Clean, maintainable code that follows best practices and is well-documented for easy understanding and extension.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Developer Experience</h3>
            <p className="text-gray-600">
              We focus on making development as smooth as possible with clear documentation, helpful error messages, and intuitive APIs.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Continuous Improvement</h3>
            <p className="text-gray-600">
              We continuously update and improve our platform based on feedback and emerging best practices in web development.
            </p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900">Built for Developers</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          This boilerplate is designed to be a starting point for your next project. Whether you're building a SaaS application, an internal tool, or a customer-facing platform, our boilerplate provides the foundation you need.
        </p>
        <p className="text-gray-700 leading-relaxed">
          Customize it, extend it, and make it your own. We've included all the essential features so you can focus on building what makes your application unique.
        </p>
      </section>

      {/* Contact Section */}
      <section className="bg-gray-50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Get in Touch</h2>
        <p className="text-gray-700 mb-6">
          Have questions or want to learn more? We'd love to hear from you.
        </p>
        <Link
          to="/contact"
          className="bg-blue-500 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-sm transition-colors inline-block"
        >
          Contact Us
        </Link>
      </section>
    </div>
  );
}
