/**
 * DuoModeBlog - Explanation of Duo Mode / Compatibility feature
 *
 * Explains how two people's astrocartography lines intersect and
 * how the algorithm finds the best shared locations.
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Heart, MapPin, ChevronRight, CheckCircle,
  Sparkles, Globe, Plane, Home, Briefcase, TrendingUp
} from 'lucide-react';
import Footer from '@/components/Footer';
import BlogNavbar from '@/components/BlogNavbar';
import './ScoutAlgorithmBlog.css';
import './Landing.css';

const DuoModeBlog: React.FC = () => {
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
          <Users className="w-4 h-4" />
          <span>Feature Guide</span>
        </div>
        <h1 className="blog-title">
          Duo Mode: Where<br />Two Worlds Align
        </h1>
        <p className="blog-subtitle">
          Discover how we find the perfect locations for couples, travel partners,
          and business duos — where both people's astrocartography lines intersect and thrive.
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
          <h2>The Challenge of Shared Destinations</h2>
          <p>
            Individual astrocartography is powerful — it shows where <em>you</em> thrive.
            But what happens when you're traveling with a partner, relocating with a spouse,
            or choosing a meeting spot with a business partner?
          </p>
          <p>
            Your ideal location might be challenging for them. Their power spot might
            drain your energy. <strong>Duo Mode</strong> solves this by analyzing both
            charts simultaneously to find locations where you <em>both</em> benefit.
          </p>

          <div className="info-box">
            <h4>Perfect For</h4>
            <ul>
              <li><Heart className="w-4 h-4 inline mr-2 text-pink-400" /> Honeymoon planning</li>
              <li><Home className="w-4 h-4 inline mr-2 text-blue-400" /> Couples relocating together</li>
              <li><Plane className="w-4 h-4 inline mr-2 text-cyan-400" /> Travel partners choosing destinations</li>
              <li><Briefcase className="w-4 h-4 inline mr-2 text-amber-400" /> Business partners meeting for deals</li>
              <li><Users className="w-4 h-4 inline mr-2 text-purple-400" /> Long-distance couples finding middle ground</li>
            </ul>
          </div>
        </section>

        {/* How Lines Intersect */}
        <section className="blog-section">
          <div className="section-icon">
            <Globe className="w-6 h-6" />
          </div>
          <h2>How Planetary Lines Intersect</h2>

          <p>
            Every person has their own unique set of planetary lines circling the globe.
            When two people's charts are overlaid, their lines create a complex web of
            intersections. Some crossings are magical; others are challenging.
          </p>

          <div className="example-box">
            <h4>Example: Venus Meets Sun</h4>
            <div className="example-comparison">
              <div className="example-location">
                <MapPin className="w-4 h-4" />
                <span>Your Venus line passes through Rome</span>
              </div>
              <div className="example-location">
                <MapPin className="w-4 h-4" />
                <span>Their Sun line passes through Rome</span>
              </div>
            </div>
            <p className="example-note">
              <Sparkles className="w-4 h-4 inline mr-2 text-pink-400" />
              When Venus meets Sun, romance ignites vitality. Rome becomes a place where
              love (Venus) amplifies confidence and joy (Sun) for both of you.
              This is the kind of intersection Duo Mode finds automatically.
            </p>
          </div>

          <p>
            Our algorithm scans all possible line intersections between both charts,
            calculating the distance between each pair of lines at every point on Earth.
            When lines come within <strong>300km of each other</strong>, we flag that
            zone as a potential shared hotspot.
          </p>
        </section>

        {/* Clustering & Scoring */}
        <section className="blog-section">
          <div className="section-icon">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h2>How We Score Shared Locations</h2>

          <p>
            Finding intersections is just the start. We then score each location
            based on multiple factors:
          </p>

          <div className="summary-list">
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <div>
                <strong>Individual Scores:</strong> How beneficial is this location for each person separately?
              </div>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <div>
                <strong>Overlap Bonus:</strong> Extra points when lines cross within 50km — a true power zone.
              </div>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <div>
                <strong>Clustering:</strong> Nearby intersections (within 200km) are grouped into hotspot zones.
              </div>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <div>
                <strong>Mode Weighting:</strong> Different modes prioritize different planetary combinations.
              </div>
            </div>
          </div>

          <p>
            The result is a ranked list of locations where <em>both</em> people will
            feel the positive influence — not just where one person shines while
            the other struggles.
          </p>
        </section>

        {/* Four Modes */}
        <section className="blog-section">
          <div className="section-icon">
            <Heart className="w-6 h-6" />
          </div>
          <h2>Four Specialized Modes</h2>

          <p>
            Not all trips are the same. A romantic getaway needs different energy
            than a business retreat. Duo Mode offers four specialized analysis modes,
            each weighting planets differently:
          </p>

          <div className="modes-grid">
            <div className="mode-card honeymoon">
              <div className="mode-header">
                <Heart className="w-5 h-5" />
                <h4>Honeymoon</h4>
              </div>
              <p>
                Prioritizes <strong>Venus</strong> (love, harmony), <strong>Moon</strong> (emotional connection),
                and <strong>Neptune</strong> (romance, magic). Perfect for newlyweds, anniversary trips,
                or rekindling the spark.
              </p>
              <div className="mode-planets">
                <span className="planet venus">Venus 2.0×</span>
                <span className="planet moon">Moon 1.5×</span>
                <span className="planet neptune">Neptune 1.3×</span>
              </div>
            </div>

            <div className="mode-card relocation">
              <div className="mode-header">
                <Home className="w-5 h-5" />
                <h4>Relocation</h4>
              </div>
              <p>
                Emphasizes <strong>Sun</strong> (identity, vitality), <strong>Jupiter</strong> (growth, opportunity),
                and <strong>Saturn</strong> (stability, long-term building). For couples moving together.
              </p>
              <div className="mode-planets">
                <span className="planet sun">Sun 1.3×</span>
                <span className="planet jupiter">Jupiter 1.5×</span>
                <span className="planet saturn">Saturn 1.0×</span>
              </div>
            </div>

            <div className="mode-card travel">
              <div className="mode-header">
                <Plane className="w-5 h-5" />
                <h4>Travel</h4>
              </div>
              <p>
                Boosts <strong>Mercury</strong> (communication, exploration), <strong>Jupiter</strong> (adventure, luck),
                and <strong>Uranus</strong> (excitement, discovery). For travel buddies seeking adventure.
              </p>
              <div className="mode-planets">
                <span className="planet mercury">Mercury 1.3×</span>
                <span className="planet jupiter">Jupiter 1.5×</span>
                <span className="planet uranus">Uranus 1.2×</span>
              </div>
            </div>

            <div className="mode-card business">
              <div className="mode-header">
                <Briefcase className="w-5 h-5" />
                <h4>Business</h4>
              </div>
              <p>
                Weights <strong>Sun</strong> (success, recognition), <strong>Jupiter</strong> (expansion, deals),
                and <strong>Saturn</strong> (structure, professionalism). For partners closing deals.
              </p>
              <div className="mode-planets">
                <span className="planet sun">Sun 1.5×</span>
                <span className="planet jupiter">Jupiter 1.5×</span>
                <span className="planet saturn">Saturn 1.3×</span>
              </div>
            </div>
          </div>
        </section>

        {/* Line Types */}
        <section className="blog-section">
          <div className="section-icon">
            <MapPin className="w-6 h-6" />
          </div>
          <h2>Which Lines Matter Most?</h2>

          <p>
            Not all planetary lines carry equal weight for relationships. We apply
            additional weighting based on line type:
          </p>

          <div className="info-box">
            <h4>Line Type Weights for Duo Mode</h4>
            <ul>
              <li>
                <strong>Descendant (DSC):</strong> Highest weight for relationships —
                this is literally the "partnership" angle in astrology.
              </li>
              <li>
                <strong>Midheaven (MC):</strong> Strong for public reputation and
                shared goals — how the world sees you as a pair.
              </li>
              <li>
                <strong>Ascendant (ASC):</strong> Your presentation and first impressions
                together — important for new relationships.
              </li>
              <li>
                <strong>IC (Imum Coeli):</strong> Home and foundations — crucial
                for couples considering living together.
              </li>
            </ul>
          </div>

          <p>
            When a <strong>Venus DSC</strong> line from one person crosses a
            <strong>Sun MC</strong> line from another, the algorithm recognizes
            this as a particularly powerful combination for romantic and public harmony.
          </p>
        </section>

        {/* Powerful Combinations */}
        <section className="blog-section">
          <div className="section-icon">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2>Magical Intersection Combinations</h2>

          <p>
            Some planetary meetings create exceptional synergy. Here are the combinations
            Duo Mode looks for:
          </p>

          <div className="combinations-list">
            <div className="combo-card romance">
              <div className="combo-planets">
                <span>Venus</span>
                <Heart className="w-4 h-4" />
                <span>Sun</span>
              </div>
              <p>Love meets vitality. Passion, warmth, and mutual appreciation flourish.</p>
            </div>

            <div className="combo-card romance">
              <div className="combo-planets">
                <span>Venus</span>
                <Heart className="w-4 h-4" />
                <span>Moon</span>
              </div>
              <p>Affection meets emotional depth. Nurturing, intimate connection.</p>
            </div>

            <div className="combo-card growth">
              <div className="combo-planets">
                <span>Jupiter</span>
                <TrendingUp className="w-4 h-4" />
                <span>Jupiter</span>
              </div>
              <p>Double expansion. Incredible luck and growth for both parties.</p>
            </div>

            <div className="combo-card success">
              <div className="combo-planets">
                <span>Sun</span>
                <CheckCircle className="w-4 h-4" />
                <span>Jupiter</span>
              </div>
              <p>Identity meets opportunity. Success, recognition, and abundance.</p>
            </div>

            <div className="combo-card stability">
              <div className="combo-planets">
                <span>Saturn</span>
                <Home className="w-4 h-4" />
                <span>Moon</span>
              </div>
              <p>Structure meets emotion. Stable, secure, long-lasting bonds.</p>
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="blog-section blog-summary">
          <h2>Why Duo Mode Changes Everything</h2>
          <p>
            Before Duo Mode, couples had to manually compare their individual charts,
            guess at where lines might overlap, and hope for the best. Now, our algorithm
            does the heavy lifting — analyzing thousands of potential intersections in seconds.
          </p>

          <div className="summary-list">
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Instant analysis of both charts simultaneously</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Ranked locations where BOTH people benefit</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Four specialized modes for different trip types</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Intelligent weighting of planetary combinations</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Up to 20 top locations with city names and themes</span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="blog-cta-section">
          <h3>Ready to find your shared paradise?</h3>
          <p>
            Enter both birth charts and let Duo Mode reveal the destinations
            where your stars align perfectly.
          </p>
          <div className="blog-cta-buttons">
            <Link to="/guest" className="blog-cta-btn">
              Try Duo Mode Free
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link to="/#duo-demo" className="blog-cta-btn secondary">
              See Interactive Demo
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </article>

      {/* Footer */}
      <Footer showInstallButton={false} />
    </div>
  );
};

export default DuoModeBlog;
