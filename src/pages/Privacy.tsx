import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import Footer from '@/components/Footer';
import './Landing.css';

const LAST_UPDATED = 'February 4, 2026';

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="page-root">
      <SEO
        title="Privacy Policy | Halo Home"
        description="Read the Halo Home Privacy Policy, including data usage, security practices, and your choices."
      />
      <div className="bg-noise" />

      <nav className="nav-fixed">
        <div className="nav-container">
          <Link to="/" className="nav-logo flex items-center gap-2">
            <img src="/logo.png" alt="Halo Home" className="w-6 h-6 rounded-md" />
            Halo Home
          </Link>
          <div className="nav-links hidden md:flex items-center">
            <a href="/#features" className="nav-link">Features</a>
            <a href="/#pricing" className="nav-link">Pricing</a>
            <a href="/sample-report" className="nav-link">Sample Report</a>
            <a href="/blog" className="nav-link">Blog</a>
          </div>
        </div>
      </nav>

      <main>
        <div className="bg-section-white section-block">
          <div className="section-wrapper max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-serif mb-4" style={{ color: 'var(--text-primary, #18181B)' }}>
              Privacy Policy
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-secondary, #52525B)' }}>
              Last updated: {LAST_UPDATED}
            </p>
            <p className="text-base mb-6" style={{ color: 'var(--text-secondary, #52525B)' }}>
              This page is a concise overview intended for clarity. Replace this summary with your
              official Privacy Policy to ensure legal completeness.
            </p>
            <div className="space-y-6 text-base" style={{ color: 'var(--text-secondary, #52525B)' }}>
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>
                  1. Information We Collect
                </h2>
                <p>
                  We collect account information you provide and usage data needed to deliver the service.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>
                  2. How We Use Data
                </h2>
                <p>
                  Data is used to provide analysis, improve the product, and support user experience.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>
                  3. Security
                </h2>
                <p>
                  We use industry-standard security practices to protect information.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>
                  4. Your Choices
                </h2>
                <p>
                  You can access, update, or request deletion of your data subject to legal requirements.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>
                  5. Contact
                </h2>
                <p>
                  For privacy questions, contact the Halo Home team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer showInstallButton={false} />
    </div>
  );
}
