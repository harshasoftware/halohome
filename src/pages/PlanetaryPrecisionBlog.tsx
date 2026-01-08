/**
 * PlanetaryPrecisionBlog - Understanding planetary precision in astrocartography
 *
 * Educational blog about astronomical precision with subtle professional positioning.
 * Teaches readers about the science while demonstrating expertise.
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, Moon, Sun,
  ChevronRight, CheckCircle, XCircle, Sparkles,
  Orbit, Navigation, Zap, Target, AlertTriangle
} from 'lucide-react';
import Footer from '@/components/Footer';
import BlogNavbar from '@/components/BlogNavbar';
import './ScoutAlgorithmBlog.css';
import './Landing.css';

const PlanetaryPrecisionBlog: React.FC = () => {
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
          <Orbit className="w-4 h-4" />
          <span>Technical Deep-Dive</span>
        </div>
        <h1 className="blog-title">
          The Hidden Science Behind<br />Planetary Line Accuracy
        </h1>
        <p className="blog-subtitle">
          Why calculating where planets actually are is surprisingly hard —
          and what separates precise astrocartography from guesswork.
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
          <h2>When Fractions of a Degree Matter</h2>
          <p>
            You'd think calculating where Mars is would be straightforward. Point a telescope
            at the sky, note the position, done. But for astrocartography — where planetary
            positions translate directly to lines on Earth's surface — the math gets
            surprisingly complex.
          </p>
          <p>
            A single degree of error in planetary position can shift your lines by over
            100 kilometers. That's the difference between a line passing through your
            city or missing it entirely. Understanding what creates precision (and what
            destroys it) helps you evaluate any astrocartography tool you use.
          </p>
        </section>

        {/* The Time Problem */}
        <section className="blog-section">
          <div className="section-icon">
            <Clock className="w-6 h-6" />
          </div>
          <h2>The Time Problem Nobody Talks About</h2>

          <p>
            Here's something that trips up even experienced developers: "time" isn't
            as simple as the clock on your wall.
          </p>
          <p>
            Astronomers use different time scales for different purposes. Your birth
            certificate records civil time (UTC). But the equations that calculate
            planetary positions expect "dynamical time" — a perfectly steady time scale
            that doesn't wobble with Earth's irregular rotation.
          </p>

          <div className="info-box">
            <h4>Why Earth's Rotation Matters</h4>
            <p style={{ marginTop: '0.75rem' }}>
              Earth doesn't spin at a perfectly constant rate. Earthquakes, ocean currents,
              and even melting ice sheets speed it up or slow it down by tiny amounts.
              These variations accumulate — by 2024, the difference between "clock time"
              and "physics time" has grown to about 70 seconds.
            </p>
          </div>

          <p>
            70 seconds matters because the Moon moves about 35 arc-seconds every second.
            Skip the time conversion, and your lunar lines could be off by over 40 arc-minutes —
            enough to shift them by tens of kilometers on the map.
          </p>

          <div className="comparison-card">
            <div className="comparison-side bad">
              <div className="comparison-header">
                <XCircle className="w-5 h-5" />
                <h4>Common Shortcut</h4>
              </div>
              <p>
                Treat clock time as if it were dynamical time. Simpler to implement,
                but introduces growing errors for any date far from the reference year.
              </p>
            </div>
            <ChevronRight className="comparison-arrow" />
            <div className="comparison-side good">
              <div className="comparison-header">
                <CheckCircle className="w-5 h-5" />
                <h4>Proper Approach</h4>
              </div>
              <p>
                Convert through the full chain: UTC → UT1 (Earth rotation time) →
                TT (dynamical time). This is what observatories and space agencies do.
              </p>
            </div>
          </div>
        </section>

        {/* The Moon Problem */}
        <section className="blog-section">
          <div className="section-icon">
            <Moon className="w-6 h-6" />
          </div>
          <h2>The Moon's Chaotic Dance</h2>

          <p>
            If you had to pick the hardest celestial body to track accurately,
            it would be the Moon.
          </p>
          <p>
            Planets orbit the Sun in relatively clean ellipses. The Moon orbits Earth
            while Earth orbits the Sun, and the Sun pulls directly on the Moon too.
            This three-body gravitational ballet creates an orbit so complex that
            accurately predicting it requires accounting for over 100 separate influences.
          </p>

          <div className="info-box">
            <h4>What Tugs on the Moon</h4>
            <ul style={{ marginTop: '0.75rem', marginLeft: '1rem', listStyle: 'disc' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                Earth's gravity (the main force, obviously)
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                The Sun's direct pull — surprisingly strong at lunar distance
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Jupiter — massive enough to tug on everything in the solar system
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Earth's equatorial bulge — our planet isn't perfectly spherical
              </li>
              <li>
                And dozens more periodic wobbles and secular drifts
              </li>
            </ul>
          </div>

          <p>
            Simple lunar calculations can be off by several arc-minutes. When you're
            trying to determine if your Moon line passes through Barcelona or misses
            it by 50km, that error matters.
          </p>
        </section>

        {/* Different Bodies, Different Methods */}
        <section className="blog-section">
          <div className="section-icon">
            <Orbit className="w-6 h-6" />
          </div>
          <h2>Why One Formula Doesn't Fit All</h2>

          <p>
            Here's where many tools cut corners: they use the same calculation method
            for everything from Mercury to Pluto. It's simpler to build — but some
            bodies have quirks that break generic approaches.
          </p>

          <p>
            <strong>Pluto</strong> is the classic example. Its orbit is locked in a
            gravitational resonance with Neptune — for every two Pluto orbits,
            Neptune completes exactly three. This cosmic dance amplifies their mutual
            influence in ways that standard planetary formulas can't capture.
            Pluto needs perturbation theory that specifically accounts for Neptune's pull.
          </p>

          <p>
            <strong>Chiron</strong> presents different challenges. As a minor planet
            with a chaotic orbit between Saturn and Uranus, it requires proper orbital
            mechanics with iterative equation solving — not the simplified approaches
            that work for major planets.
          </p>

          <div className="verify-box">
            <Sparkles className="w-5 h-5" />
            <div>
              <h4>The Takeaway</h4>
              <p>
                Precision requires matching the calculation method to each body's
                orbital characteristics. The Moon needs lunar theory. Pluto needs
                perturbation methods. Chiron needs orbital mechanics. One-size-fits-all
                is a red flag.
              </p>
            </div>
          </div>
        </section>

        {/* True Node vs Mean Node */}
        <section className="blog-section">
          <div className="section-icon">
            <Navigation className="w-6 h-6" />
          </div>
          <h2>The Node Controversy</h2>

          <p>
            The Lunar Nodes — where the Moon's orbital plane crosses the ecliptic —
            are some of the most important points in astrocartography. They're also
            where one of the biggest precision debates plays out.
          </p>

          <p>
            There are two ways to calculate the North Node:
          </p>

          <div className="comparison-card">
            <div className="comparison-side bad">
              <div className="comparison-header">
                <XCircle className="w-5 h-5" />
                <h4>Mean Node</h4>
              </div>
              <p>
                A smoothed average that follows a steady path, ignoring the Moon's
                actual orbital oscillations. Computationally simpler.
              </p>
              <div className="comparison-example">
                <span className="label">Deviation from true:</span>
                <span className="value error">Up to 1.7°</span>
              </div>
            </div>
            <ChevronRight className="comparison-arrow" />
            <div className="comparison-side good">
              <div className="comparison-header">
                <CheckCircle className="w-5 h-5" />
                <h4>True Node</h4>
              </div>
              <p>
                The actual position where the Moon's orbit crosses the ecliptic
                at that specific moment, including all wobbles.
              </p>
              <div className="comparison-example">
                <span className="label">Accuracy:</span>
                <span className="value success">Astronomically correct</span>
              </div>
            </div>
          </div>

          <p>
            1.7° is enormous in astrocartography terms. On Earth's surface, that
            translates to over 100 kilometers. Your North Node line could be showing
            you a completely different region than where the influence actually falls.
          </p>

          <p>
            Astrologers debate which has more "meaning," but astronomically, the True
            Node is simply where the node actually is. If you're making real-world
            decisions about where to live or travel, accuracy seems preferable to
            philosophical smoothing.
          </p>
        </section>

        {/* Coordinate Transformation */}
        <section className="blog-section">
          <div className="section-icon">
            <Zap className="w-6 h-6" />
          </div>
          <h2>From Sky to Earth</h2>

          <p>
            Even with perfect planetary positions, there's another layer where precision
            can be lost: translating cosmic coordinates to lines on Earth.
          </p>
          <p>
            Planets are tracked in "ecliptic coordinates" — relative to Earth's orbital
            plane around the Sun. But your astrocartography lines depend on "equatorial
            coordinates" — relative to Earth's equator. Converting between them requires
            knowing the exact tilt of Earth's axis.
          </p>

          <div className="info-box">
            <h4>Earth's Axis Isn't Constant</h4>
            <p style={{ marginTop: '0.75rem' }}>
              Earth's axial tilt changes slowly over time — about 47 arc-seconds per
              century. There's also <strong>nutation</strong>, an 18.6-year wobble
              caused by the Moon's gravity, which can shift positions by up to 9
              arc-seconds.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              These are small effects individually, but they compound with every other
              approximation in the chain. Rigorous tools calculate the exact tilt and
              nutation for each specific moment.
            </p>
          </div>
        </section>

        {/* Error Scope */}
        <section className="blog-section">
          <div className="section-icon">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2>The Real-World Cost of Errors</h2>

          <p>
            Let's quantify what these shortcuts actually mean for your map. When errors
            compound across time conversion, planetary theory, and coordinate transformation,
            the results can be surprisingly large.
          </p>

          <div className="info-box">
            <h4>Typical Error Sources &amp; Magnitudes</h4>
            <ul style={{ marginTop: '0.75rem', marginLeft: '1rem', listStyle: 'disc' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Skipping ΔT correction:</strong> 70+ seconds of timing error by 2024,
                shifting the Moon by ~40 arc-minutes (50-70 km line displacement)
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Mean Node vs True Node:</strong> Up to 1.7° difference
                (~100-190 km line displacement)
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Simplified lunar theory:</strong> Several arc-minutes of error
                (~30-60 km for Moon lines)
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Generic Pluto formulas:</strong> Can miss Neptune perturbations
                by 10+ arc-minutes in some eras
              </li>
              <li>
                <strong>Flat-Earth distance math:</strong> Grows to 1-2% error for
                distant locations (~50-100 km at continental scales)
              </li>
            </ul>
          </div>

          <p>
            Combined, a tool taking multiple shortcuts might place your lines
            50-200 kilometers from their true positions. That's not a rounding error —
            that's a different city, a different region, sometimes a different country.
          </p>

          <div className="comparison-card">
            <div className="comparison-side bad">
              <div className="comparison-header">
                <XCircle className="w-5 h-5" />
                <h4>Consumer-Grade</h4>
              </div>
              <p>
                Simplified ephemeris, Mean Node, no ΔT, flat-map approximations.
                Fast to build, but errors can exceed 100 km.
              </p>
              <div className="comparison-example">
                <span className="label">Typical accuracy:</span>
                <span className="value error">50-200 km</span>
              </div>
            </div>
            <ChevronRight className="comparison-arrow" />
            <div className="comparison-side good">
              <div className="comparison-header">
                <CheckCircle className="w-5 h-5" />
                <h4>Professional-Grade</h4>
              </div>
              <p>
                High-precision ephemeris (AA+ algorithms), True Node, proper time scales,
                spherical geodesy. Sub-arcminute accuracy across all bodies.
              </p>
              <div className="comparison-example">
                <span className="label">Typical accuracy:</span>
                <span className="value success">&lt; 5 km</span>
              </div>
            </div>
          </div>

          <p>
            The difference matters most for localized decisions: which neighborhood,
            which city, which side of a border. If your tool says Barcelona but
            the line actually runs through Girona, you're making decisions based on
            incorrect information.
          </p>
        </section>

        {/* How to Evaluate */}
        <section className="blog-section">
          <h2>What to Look For</h2>
          <p>
            Now that you understand what creates (and destroys) precision, here's how
            to evaluate any astrocartography tool:
          </p>

          <div className="info-box">
            <h4>Questions Worth Asking</h4>
            <ul style={{ marginTop: '0.75rem', marginLeft: '1rem', listStyle: 'disc' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Time handling:</strong> Does it convert to dynamical time, or
                treat your clock time as-is?
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Node calculation:</strong> True Node or Mean Node? (If unspecified,
                assume Mean.)
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Body-specific methods:</strong> Does it use different approaches
                for Moon, Pluto, Chiron?
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Distance calculations:</strong> Spherical geodesy or flat-map
                approximation?
              </li>
              <li>
                <strong>Verifiability:</strong> Can you compare positions against
                Swiss Ephemeris or JPL Horizons?
              </li>
            </ul>
          </div>

          <p>
            Most apps don't document these details — which usually means they're taking
            shortcuts. The ones that do the work tend to talk about it.
          </p>
        </section>

        {/* Summary */}
        <section className="blog-section">
          <h2>Why We Care About This</h2>
          <p>
            We built our platform because we kept finding astrocartography tools that
            looked beautiful but got the fundamentals wrong. Pretty lines don't help
            if they're in the wrong place.
          </p>
          <p>
            So we did the work: proper time conversions, high-precision ephemeris,
            True Node calculations, spherical geodesy for distances. Not
            because it was easy — it wasn't — but because precision is the whole point.
          </p>
          <p>
            If you're making decisions about where to live, work, or travel based on
            your chart, you deserve lines that are actually where they should be.
          </p>

          <div className="cta-box">
            <h3>See the Difference</h3>
            <p>
              Generate your astrocartography map and explore your planetary lines
              with precision you can trust. Free to start.
            </p>
            <Link to="/guest" className="cta-button">
              Generate Your Map
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Related Posts */}
        <section className="blog-section">
          <h2>Continue Reading</h2>
          <div className="related-posts">
            <Link to="/blog/scout-algorithm" className="related-post">
              <div className="related-post-icon">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h4>How Our Scout Engine Works</h4>
                <p>The science behind location scoring</p>
              </div>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link to="/blog/astrology-systems" className="related-post">
              <div className="related-post-icon">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h4>Two Zodiacs, Eight House Systems</h4>
                <p>Western and Vedic traditions explained</p>
              </div>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </article>

      <Footer />
    </div>
  );
};

export default PlanetaryPrecisionBlog;
