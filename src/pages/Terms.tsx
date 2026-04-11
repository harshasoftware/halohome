import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import Footer from '@/components/Footer';
import './Landing.css';

const LAST_UPDATED = 'February 4, 2026';

export default function Terms() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="page-root">
      <SEO
        title="Terms of Service | Halo Home"
        description="Read the Halo Home Terms of Service, including account use, acceptable use, and service limitations."
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
              Terms of Service
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-secondary, #52525B)' }}>
              Last updated: {LAST_UPDATED}
            </p>
            <p className="text-base mb-6" style={{ color: 'var(--text-secondary, #52525B)' }}>
              This page is a concise overview intended for clarity. Replace this summary with your
              official Terms of Service to ensure legal completeness.
            </p>
            <div className="space-y-6 text-base" style={{ color: 'var(--text-secondary, #52525B)' }}>
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>
                  1. Acceptance of Terms
                </h2>
                <p>
                  By accessing Halo Home, you agree to comply with these terms and all applicable laws.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>
                  2. Accounts and Access
                </h2>
                <p>
                  You are responsible for safeguarding your account credentials and for all activity
                  under your account.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>
                  3. Acceptable Use
                </h2>
                <p>
                  You agree not to misuse the service, attempt unauthorized access, or disrupt systems.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>
                  4. Service Limitations
                </h2>
                <p>
                  Halo Home provides informational analysis and recommendations. Results are not
                  guarantees and should be used alongside professional judgment.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>
                  5. Contact
                </h2>
                <p>
                  For questions about these terms, contact the Halo Home team.
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
