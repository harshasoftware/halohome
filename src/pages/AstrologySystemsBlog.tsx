/**
 * AstrologySystemsBlog - Deep dive into multi-system support
 *
 * This page explains our support for Western/Vedic traditions,
 * Tropical/Sidereal zodiacs, and 8 house systems - positioning
 * the app as a serious research-grade tool.
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, Globe, Layers, Star, Moon, Sun,
  ChevronRight, CheckCircle, Sparkles, BookOpen, Calculator
} from 'lucide-react';
import Footer from '@/components/Footer';
import BlogNavbar from '@/components/BlogNavbar';
import './ScoutAlgorithmBlog.css';
import './Landing.css';

const AstrologySystemsBlog: React.FC = () => {
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
          <Compass className="w-4 h-4" />
          <span>Professional Tools</span>
        </div>
        <h1 className="blog-title">
          Every Planet. Every Line.<br />Every System.
        </h1>
        <p className="blog-subtitle">
          Built for serious astrologers. Western or Vedic. Tropical or Sidereal.
          Eight house systems. All ten celestial bodies mapped with precision.
        </p>
        <div className="blog-meta">
          <span>8 min read</span>
          <span className="blog-meta-dot">•</span>
          <span>Last updated: December 2024</span>
        </div>
      </header>

      {/* Content */}
      <article className="blog-content">
        {/* Introduction */}
        <section className="blog-section">
          <h2>Why System Choice Matters</h2>
          <p>
            Most astrocartography tools force you into a single system — usually
            Western Tropical with Placidus houses. But astrology is a rich tradition
            spanning thousands of years and multiple cultures. Your choice of zodiac,
            house system, and calculation method profoundly affects your chart — and
            your astrocartography lines.
          </p>
          <p>
            We built the first astrocartography platform that respects this diversity.
            Whether you practice Western, Vedic, or comparative astrology, you'll find
            every tool you need.
          </p>
        </section>

        {/* Zodiac Systems */}
        <section className="blog-section">
          <div className="section-icon">
            <Globe className="w-6 h-6" />
          </div>
          <h2>Two Zodiacs, Two Worldviews</h2>

          <div className="system-cards">
            <div className="system-card western">
              <div className="system-card-header">
                <span className="system-symbol">♈</span>
                <div>
                  <h4>Western (Tropical)</h4>
                  <span className="system-tag">Season-based</span>
                </div>
              </div>
              <p>
                Aligned with the seasons and equinoxes. The Tropical zodiac fixes
                0° Aries to the Spring Equinox, creating a system tied to Earth's
                relationship with the Sun.
              </p>
              <ul className="system-features">
                <li>Standard in Western astrology</li>
                <li>Emphasizes psychological archetypes</li>
                <li>Consistent with seasonal symbolism</li>
              </ul>
            </div>

            <div className="system-card vedic">
              <div className="system-card-header">
                <span className="system-symbol">ॐ</span>
                <div>
                  <h4>Vedic (Sidereal)</h4>
                  <span className="system-tag">Star-based</span>
                </div>
              </div>
              <p>
                Aligned with the actual constellations. The Sidereal zodiac accounts
                for the precession of equinoxes, keeping signs fixed to their
                stellar positions.
              </p>
              <ul className="system-features">
                <li>Traditional in Jyotish (Indian astrology)</li>
                <li>Astronomically aligned with stars</li>
                <li>~24° offset from Tropical (Lahiri ayanamsa)</li>
              </ul>
            </div>
          </div>

          <div className="info-box">
            <h4>What This Means for Your Lines</h4>
            <p>
              A planet at 15° Aries Tropical might be at ~21° Pisces Sidereal.
              This shifts when that planet crosses an angle — and where your
              astrocartography lines fall on the map. The difference can be
              hundreds of kilometers.
            </p>
          </div>
        </section>

        {/* House Systems */}
        <section className="blog-section">
          <div className="section-icon">
            <Layers className="w-6 h-6" />
          </div>
          <h2>Eight House Systems</h2>
          <p>
            The house system determines where your Ascendant, Midheaven, and
            intermediate cusps fall. Different systems produce different house
            boundaries — and different astrocartography lines.
          </p>

          <div className="house-grid">
            <div className="house-card">
              <h4>Placidus</h4>
              <p>Most popular in modern Western astrology. Time-based divisions.</p>
              <span className="house-tag popular">Most Popular</span>
            </div>
            <div className="house-card">
              <h4>Whole Sign</h4>
              <p>Ancient system where each sign = one house. Rising sign is 1st house.</p>
              <span className="house-tag traditional">Traditional</span>
            </div>
            <div className="house-card">
              <h4>Koch</h4>
              <p>Time-based like Placidus but using birthplace latitude differently.</p>
            </div>
            <div className="house-card">
              <h4>Equal</h4>
              <p>Each house spans exactly 30° from the Ascendant.</p>
            </div>
            <div className="house-card">
              <h4>Campanus</h4>
              <p>Space-based division of the prime vertical.</p>
            </div>
            <div className="house-card">
              <h4>Regiomontanus</h4>
              <p>Space-based division of the celestial equator.</p>
            </div>
            <div className="house-card">
              <h4>Porphyry</h4>
              <p>Trisects the arcs between angles. Simple and elegant.</p>
            </div>
            <div className="house-card">
              <h4>Morinus</h4>
              <p>Divides the equator without reference to Ascendant.</p>
            </div>
          </div>

          <div className="verify-box">
            <Sparkles className="w-5 h-5" />
            <div>
              <h4>Switch Instantly</h4>
              <p>
                Change house systems with one tap and watch your lines update
                in real-time. Compare how different systems affect your power
                locations without recalculating from scratch.
              </p>
            </div>
          </div>
        </section>

        {/* Celestial Bodies */}
        <section className="blog-section">
          <div className="section-icon">
            <Star className="w-6 h-6" />
          </div>
          <h2>All Ten Celestial Bodies</h2>
          <p>
            Every major celestial body in astrology, mapped with astronomical precision.
            Each generates four lines crossing the angles (ASC, DSC, MC, IC).
          </p>

          <div className="planets-showcase">
            <div className="planet-row luminaries">
              <div className="planet-item">
                <Sun className="w-6 h-6" />
                <span>Sun</span>
              </div>
              <div className="planet-item">
                <Moon className="w-6 h-6" />
                <span>Moon</span>
              </div>
              <span className="planet-label">Luminaries</span>
            </div>
            <div className="planet-row personal">
              <div className="planet-item"><span className="planet-glyph">☿</span><span>Mercury</span></div>
              <div className="planet-item"><span className="planet-glyph">♀</span><span>Venus</span></div>
              <div className="planet-item"><span className="planet-glyph">♂</span><span>Mars</span></div>
              <span className="planet-label">Personal</span>
            </div>
            <div className="planet-row social">
              <div className="planet-item"><span className="planet-glyph">♃</span><span>Jupiter</span></div>
              <div className="planet-item"><span className="planet-glyph">♄</span><span>Saturn</span></div>
              <span className="planet-label">Social</span>
            </div>
            <div className="planet-row transpersonal">
              <div className="planet-item"><span className="planet-glyph">♅</span><span>Uranus</span></div>
              <div className="planet-item"><span className="planet-glyph">♆</span><span>Neptune</span></div>
              <div className="planet-item"><span className="planet-glyph">♇</span><span>Pluto</span></div>
              <span className="planet-label">Transpersonal</span>
            </div>
          </div>

          <div className="info-box">
            <h4>40 Lines Per Chart</h4>
            <p>
              10 planets × 4 angles = 40 planetary lines mapping your unique
              cosmic geography. Plus crossing points (parans) where planets
              share angular significance.
            </p>
          </div>
        </section>

        {/* AI Integration */}
        <section className="blog-section">
          <div className="section-icon">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2>AI That Speaks Your Language</h2>
          <p>
            Our AI astrologer doesn't just understand Western Tropical interpretations.
            It's trained on both traditions and adapts its analysis based on your
            chosen system.
          </p>

          <div className="comparison-card">
            <div className="comparison-side good" style={{ gridColumn: '1 / -1' }}>
              <div className="comparison-header">
                <CheckCircle className="w-5 h-5" />
                <h4>System-Aware Interpretations</h4>
              </div>
              <ul className="ai-features">
                <li>
                  <strong>Vedic mode:</strong> References nakshatras, dashas, and
                  traditional Jyotish concepts
                </li>
                <li>
                  <strong>Western mode:</strong> Draws on modern psychological
                  astrology and archetypal symbolism
                </li>
                <li>
                  <strong>House-aware:</strong> Interpretations account for your
                  chosen house system's cusps
                </li>
                <li>
                  <strong>Research mode:</strong> Compare interpretations across
                  systems for deeper insight
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Research Tools */}
        <section className="blog-section">
          <div className="section-icon">
            <Calculator className="w-6 h-6" />
          </div>
          <h2>Built for Research</h2>
          <p>
            Whether you're testing astrological hypotheses, comparing client
            relocations across systems, or exploring the effects of different
            house calculations, you'll find the precision tools you need.
          </p>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">2</span>
              <span className="stat-label">Zodiac Systems</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">8</span>
              <span className="stat-label">House Systems</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">10</span>
              <span className="stat-label">Celestial Bodies</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">40</span>
              <span className="stat-label">Lines Per Chart</span>
            </div>
          </div>

          <div className="example-box">
            <h4>Use Cases</h4>
            <div className="use-cases">
              <div className="use-case">
                <span className="use-case-title">Comparative Analysis</span>
                <p>See how Tropical vs Sidereal shifts your Venus line — and what that means for love locations.</p>
              </div>
              <div className="use-case">
                <span className="use-case-title">Client Consultations</span>
                <p>Show clients their lines in both Placidus and Whole Sign to validate recommendations.</p>
              </div>
              <div className="use-case">
                <span className="use-case-title">Academic Research</span>
                <p>Export precise coordinates for statistical analysis of astrological correlations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="blog-section blog-summary">
          <h2>Professional-Grade Astrocartography</h2>
          <p>
            This isn't a simplified "astrology for beginners" tool. It's built for
            practitioners who understand the nuances of different systems — and need
            software that respects those differences.
          </p>

          <div className="summary-list">
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Western (Tropical) and Vedic (Sidereal) zodiac support</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>8 house systems: Placidus, Whole Sign, Koch, Equal, Campanus, Regiomontanus, Porphyry, Morinus</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>All 10 celestial bodies with precise ephemeris calculations</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Real-time system switching without recalculation delays</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>AI interpretations trained on both traditions</span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="blog-cta-section">
          <h3>Ready to explore your cosmic geography?</h3>
          <p>
            Enter your birth data and discover how different systems reveal
            different aspects of your astrological landscape.
          </p>
          <Link to="/guest" className="blog-cta-btn">
            Launch the App
            <ChevronRight className="w-5 h-5" />
          </Link>
        </section>
      </article>

      <Footer showInstallButton={false} />
    </div>
  );
};

export default AstrologySystemsBlog;
