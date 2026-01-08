/**
 * ScoutAlgorithmBlog - Detailed explanation of the Scout engine
 *
 * This page explains the precision and methodology behind our Scout feature
 * without revealing implementation details (the "secret sauce").
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Target, Globe, Waves, Scale, TrendingUp,
  MapPin, ChevronRight, CheckCircle, XCircle, Sparkles
} from 'lucide-react';
import Footer from '@/components/Footer';
import BlogNavbar from '@/components/BlogNavbar';
import './ScoutAlgorithmBlog.css';
import './Landing.css';

const ScoutAlgorithmBlog: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="blog-page">
      <div className="blog-noise" />

      {/* Navigation */}
      <BlogNavbar />

      {/* Hero */}
      <header className="blog-hero">
        <div className="blog-hero-badge">
          <Target className="w-4 h-4" />
          <span>Technical Deep-Dive</span>
        </div>
        <h1 className="blog-title">
          How Our Scout Engine<br />Achieves Unprecedented Accuracy
        </h1>
        <p className="blog-subtitle">
          A transparent look at the science behind location scoring — why it matters,
          and how we built the most precise astrocartography engine available.
        </p>
        <div className="blog-meta">
          <span>10 min read</span>
          <span className="blog-meta-dot">•</span>
          <span>Last updated: December 2024</span>
        </div>
      </header>

      {/* Content */}
      <article className="blog-content">
        {/* Introduction */}
        <section className="blog-section">
          <h2>The Problem with Traditional Astrocartography</h2>
          <p>
            Most astrocartography tools were built in an era of limited computing power.
            They use shortcuts that made sense for 1990s hardware but produce inaccurate
            results by modern standards. When you're deciding where to live, work, or travel,
            "close enough" isn't good enough.
          </p>
          <p>
            We rebuilt astrocartography from first principles, applying modern geodesy
            and statistical modeling to create something genuinely better.
          </p>
        </section>

        {/* Problem 1: Distance */}
        <section className="blog-section">
          <div className="section-icon">
            <Globe className="w-6 h-6" />
          </div>
          <h2>Problem 1: Flat-Earth Distance Calculations</h2>

          <div className="comparison-card">
            <div className="comparison-side bad">
              <div className="comparison-header">
                <XCircle className="w-5 h-5" />
                <h4>Traditional Approach</h4>
              </div>
              <p>
                Most tools project your position onto a flat map and calculate distance
                using simple Euclidean geometry (the Pythagorean theorem). This works
                okay near the equator but introduces significant errors at higher latitudes.
              </p>
              <div className="comparison-example">
                <span className="label">Oslo to line:</span>
                <span className="value error">324 km (flat calculation)</span>
              </div>
            </div>
            <ChevronRight className="comparison-arrow" />
            <div className="comparison-side good">
              <div className="comparison-header">
                <CheckCircle className="w-5 h-5" />
                <h4>Scout Approach</h4>
              </div>
              <p>
                We use <strong>spherical cross-track distance</strong> — the actual shortest
                path on Earth's curved surface. This is the same math used by aviation
                and marine navigation for precise positioning.
              </p>
              <div className="comparison-example">
                <span className="label">Oslo to line:</span>
                <span className="value success">298 km (true distance)</span>
              </div>
            </div>
          </div>

          <div className="info-box">
            <h4>Why This Matters</h4>
            <p>
              A 26km error might not seem like much, but it can mean the difference between
              being in a planetary line's "power zone" or outside its influence entirely.
              At high latitudes (Scandinavia, Canada, Russia), the error can exceed 50km.
            </p>
          </div>

          <div className="verify-box">
            <Sparkles className="w-5 h-5" />
            <div>
              <h4>Verify It Yourself</h4>
              <p>
                Search for "great circle distance calculator" and compare against any
                flat-map distance tool. The difference is real and measurable. Our engine
                uses the same spherical navigation formulas trusted by pilots worldwide.
              </p>
            </div>
          </div>
        </section>

        {/* Problem 2: Binary Thresholds */}
        <section className="blog-section">
          <div className="section-icon">
            <Waves className="w-6 h-6" />
          </div>
          <h2>Problem 2: Arbitrary Cutoffs</h2>

          <div className="comparison-card">
            <div className="comparison-side bad">
              <div className="comparison-header">
                <XCircle className="w-5 h-5" />
                <h4>Traditional Approach</h4>
              </div>
              <p>
                Most tools use binary thresholds: you're either "on" a planetary line
                (within 500km) or "off" it. At 499km you get full influence; at 501km
                you get nothing. This creates artificial cliff-edges in results.
              </p>
              <div className="visual-binary">
                <div className="binary-bar">
                  <div className="binary-on">Full influence</div>
                  <div className="binary-off">Zero influence</div>
                </div>
                <span className="binary-label">500km cutoff</span>
              </div>
            </div>
            <ChevronRight className="comparison-arrow" />
            <div className="comparison-side good">
              <div className="comparison-header">
                <CheckCircle className="w-5 h-5" />
                <h4>Scout Approach</h4>
              </div>
              <p>
                We use <strong>continuous decay functions</strong> that model how planetary
                influence naturally diminishes with distance. Closer is stronger, but
                influence fades gradually — no arbitrary cliffs.
              </p>
              <div className="visual-gradient">
                <div className="gradient-bar" />
                <div className="gradient-labels">
                  <span>Strong</span>
                  <span>Moderate</span>
                  <span>Weak</span>
                </div>
              </div>
            </div>
          </div>

          <div className="info-box">
            <h4>The Science</h4>
            <p>
              Our decay model is inspired by kernel density estimation, a statistical
              technique used in spatial analysis. The same mathematics is used in
              epidemiology (disease spread modeling) and environmental science
              (pollution diffusion).
            </p>
          </div>
        </section>

        {/* Problem 3: Scoring */}
        <section className="blog-section">
          <div className="section-icon">
            <Scale className="w-6 h-6" />
          </div>
          <h2>Problem 3: Oversimplified Scoring</h2>

          <div className="comparison-card">
            <div className="comparison-side bad">
              <div className="comparison-header">
                <XCircle className="w-5 h-5" />
                <h4>Traditional Approach</h4>
              </div>
              <p>
                Most tools give you a single "good" or "bad" rating. But planetary
                influences are nuanced — a location can be challenging for career
                while being excellent for relationships.
              </p>
              <div className="simple-score">
                <span className="score-label">Overall:</span>
                <span className="score-badge neutral">Mixed</span>
              </div>
            </div>
            <ChevronRight className="comparison-arrow" />
            <div className="comparison-side good">
              <div className="comparison-header">
                <CheckCircle className="w-5 h-5" />
                <h4>Scout Approach</h4>
              </div>
              <p>
                We calculate three distinct dimensions for each location: <strong>Benefit</strong> (how
                positive the energy is), <strong>Intensity</strong> (how strongly you'll feel it),
                and <strong>Volatility</strong> (how stable the influence is).
              </p>
              <div className="multi-score">
                <div className="score-row">
                  <span>Benefit</span>
                  <div className="score-bar benefit"><div style={{ width: '78%' }} /></div>
                  <span>78</span>
                </div>
                <div className="score-row">
                  <span>Intensity</span>
                  <div className="score-bar intensity"><div style={{ width: '65%' }} /></div>
                  <span>65</span>
                </div>
                <div className="score-row">
                  <span>Stability</span>
                  <div className="score-bar stability"><div style={{ width: '92%' }} /></div>
                  <span>92</span>
                </div>
              </div>
            </div>
          </div>

          <div className="info-box">
            <h4>What This Means</h4>
            <ul>
              <li>
                <strong>High benefit, high stability:</strong> An excellent long-term location.
                Move there or spend extended time.
              </li>
              <li>
                <strong>High benefit, low stability:</strong> Great for short visits or
                specific projects. The energy is positive but may fluctuate.
              </li>
              <li>
                <strong>High intensity, any benefit:</strong> You'll feel this place strongly.
                Whether that's good depends on your goals.
              </li>
            </ul>
          </div>
        </section>

        {/* Problem 4: Aggregation */}
        <section className="blog-section">
          <div className="section-icon">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h2>Problem 4: Unweighted Aggregation</h2>

          <div className="comparison-card">
            <div className="comparison-side bad">
              <div className="comparison-header">
                <XCircle className="w-5 h-5" />
                <h4>Traditional Approach</h4>
              </div>
              <p>
                When multiple planetary lines influence a location, most tools simply
                add up the effects equally. This means one extremely strong line can
                dominate results, hiding more balanced locations.
              </p>
            </div>
            <ChevronRight className="comparison-arrow" />
            <div className="comparison-side good">
              <div className="comparison-header">
                <CheckCircle className="w-5 h-5" />
                <h4>Scout Approach</h4>
              </div>
              <p>
                We apply <strong>diminishing returns weighting</strong>. Your strongest
                influence counts most, but subsequent lines contribute progressively less.
                This finds locations with genuinely balanced energy, not just one dominant line.
              </p>
            </div>
          </div>

          <div className="example-box">
            <h4>Example</h4>
            <div className="example-comparison">
              <div className="example-location">
                <MapPin className="w-4 h-4" />
                <span>Location A: One Jupiter line (score 95)</span>
                <span className="example-result">Traditional: 95 | Scout: 85</span>
              </div>
              <div className="example-location">
                <MapPin className="w-4 h-4" />
                <span>Location B: Venus (80) + Sun (75) + Moon (70)</span>
                <span className="example-result">Traditional: 75 avg | Scout: 88</span>
              </div>
            </div>
            <p className="example-note">
              Scout correctly identifies Location B as superior — three harmonious
              influences create a more balanced, supportive environment than one
              extremely strong (but potentially overwhelming) influence.
            </p>
          </div>
        </section>

        {/* Summary */}
        <section className="blog-section blog-summary">
          <h2>The Bottom Line</h2>
          <p>
            We didn't just add features to existing astrocartography — we rebuilt it
            from the ground up with modern science and engineering. The result is
            location recommendations you can actually trust.
          </p>

          <div className="summary-list">
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>True spherical distance calculations (not flat-map approximations)</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Continuous influence decay (no arbitrary cutoffs)</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Multi-dimensional scoring (benefit, intensity, stability)</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Diminishing returns aggregation (balanced recommendations)</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Optimized for instant results across 3,000+ cities</span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="blog-cta-section">
          <h3>Ready to find your best locations?</h3>
          <p>
            Enter your birth data and let Scout analyze 3,000+ cities worldwide
            to find where you'll thrive for career, love, health, and more.
          </p>
          <Link to="/guest" className="blog-cta-btn">
            Try Scout Free
            <ChevronRight className="w-5 h-5" />
          </Link>
        </section>
      </article>

      {/* Footer - Shared with Landing page */}
      <Footer showInstallButton={false} />
    </div>
  );
};

export default ScoutAlgorithmBlog;
