/**
 * HarmonyScoreBlog - GEO-optimized post: "What Is a Harmony Score?"
 *
 * Built for AI citation: question title, TL;DR, definitions, FAQ, author, last updated.
 * See docs/GEO_AUDIT.md and geo-fundamentals skill.
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Home, Compass, CheckCircle, HelpCircle,
  ChevronRight, Sparkles, BookOpen
} from 'lucide-react';
import Footer from '@/components/Footer';
import BlogNavbar from '@/components/BlogNavbar';
import SEO from '@/components/SEO';
import { buildArticleSchema, buildFaqSchema, buildPersonSchema } from '@/lib/seo';
import './ScoutAlgorithmBlog.css';
import './Landing.css';

const LAST_UPDATED = 'February 4, 2026';
const PUBLISHED_DATE = '2026-02-04';
const AUTHOR_NAME = 'Halo Home Team';
const DESCRIPTION =
  "A clear definition of the Harmony Score, how it's calculated, and how to use it to find Vastu-aligned homes and improve your space.";

const FAQS = [
  {
    question: 'What is a Harmony Score?',
    answer:
      "The Harmony Score is Halo Home's 0-100 rating of how well a property aligns with Vastu Shastra. It is based on orientation, eight-direction zones, entrance direction, and property shape.",
  },
  {
    question: 'How does Halo Home calculate the Harmony Score?',
    answer:
      'Halo Home uses satellite and parcel data to detect boundaries and orientation, maps the property into Vastu zones, detects the main entrance direction, and scores zone alignment and element balance. These are combined into a single 0-100 score.',
  },
  {
    question: 'Can I improve a low Harmony Score?',
    answer:
      'Yes. Halo Home provides prioritized remedies and recommendations so you can improve energy flow without major renovations.',
  },
  {
    question: 'Is the Harmony Score only for new homes?',
    answer:
      "No. You can get a Harmony Score for any address or ZIP code. For your current home's interior, the Scan app uses LiDAR to analyze layout and suggest improvements.",
  },
  {
    question: 'Do I need to know Vastu to use the Harmony Score?',
    answer:
      'No. The score and reports are designed to be easy to understand, with plain-language explanations and actionable remedies.',
  },
];

const HarmonyScoreBlog: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const structuredData = [
    buildArticleSchema({
      title: 'What Is a Harmony Score? How Halo Home Evaluates Properties',
      description: DESCRIPTION,
      path: '/blog/what-is-harmony-score',
      datePublished: PUBLISHED_DATE,
      dateModified: PUBLISHED_DATE,
      authorName: AUTHOR_NAME,
    }),
    buildFaqSchema(FAQS),
    buildPersonSchema(AUTHOR_NAME, 'Research Team'),
  ];

  return (
    <div className="blog-page">
      <SEO
        title="What Is a Harmony Score? How Halo Home Evaluates Properties"
        description={DESCRIPTION}
        type="article"
        structuredData={structuredData}
      />
      <div className="blog-noise" />

      <BlogNavbar />

      <header className="blog-hero">
        <div className="blog-hero-badge">
          <TrendingUp className="w-4 h-4" />
          <span>Guide</span>
        </div>
        <h1 className="blog-title">
          What Is a Harmony Score?<br />How Halo Home Evaluates Properties
        </h1>
        <p className="blog-subtitle">
          A clear definition of the Harmony Score, how it's calculated, and how
          you can use it to find Vastu-aligned homes and improve your space.
        </p>
        <div className="blog-meta">
          <span>6 min read</span>
          <span className="blog-meta-dot">•</span>
          <span>Last updated: {LAST_UPDATED}</span>
        </div>
      </header>

      <article className="blog-content">
        {/* TL;DR - GEO: summary at top for AI extraction */}
        <section className="blog-section blog-summary" aria-label="Summary">
          <h2>TL;DR</h2>
          <p>
            The <strong>Harmony Score</strong> is Halo Home's 0-100 rating of a property's
            alignment with Vastu Shastra principles. It combines orientation, entrance
            direction, zone balance, and property shape. Higher scores indicate better
            energy flow and more auspicious placement; you get actionable remedies
            to improve any property.
          </p>
        </section>

        {/* Definitions - GEO: clear, extractable definitions */}
        <section className="blog-section">
          <h2>Key Definitions</h2>

          <div className="info-box" style={{ marginBottom: '1.5rem' }}>
            <h3>Harmony Score</h3>
            <p>
              A <strong>Harmony Score</strong> is a single number from 0 to 100 that
              summarizes how well a property aligns with Vastu Shastra. It is
              calculated from orientation, eight-direction zone analysis, entrance
              direction, and shape. Source: Halo Home methodology.
            </p>
          </div>

          <div className="info-box" style={{ marginBottom: '1.5rem' }}>
            <h3>Vastu Shastra</h3>
            <p>
              <strong>Vastu Shastra</strong> is an ancient Indian system of design and
              placement that links the layout and orientation of buildings to natural
              forces and directions. It uses eight cardinal and intercardinal directions
              (N, NE, E, SE, S, SW, W, NW) plus the center, each associated with
              elements and ideal uses.
            </p>
          </div>

          <div className="info-box" style={{ marginBottom: '1.5rem' }}>
            <h3>8 Direction Zones</h3>
            <p>
              <strong>8 direction zones</strong> (or Vastu zones) divide a property into
              nine areas: North, Northeast, East, Southeast, South, Southwest, West,
              Northwest, and Center. Each zone has an element (e.g. Water, Fire, Earth)
              and recommended uses; alignment with the ideal orientation improves the
              Harmony Score.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="blog-section">
          <div className="section-icon">
            <Compass className="w-6 h-6" />
          </div>
          <h2>How the Harmony Score Is Calculated</h2>
          <p>
            Halo Home uses satellite imagery and parcel data to detect property
            boundaries and orientation. The system then:
          </p>
          <div className="summary-list" style={{ marginTop: '1rem' }}>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Maps the property into eight Vastu zones plus center</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Detects entrance direction (Northeast is most auspicious in Vastu)</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Scores zone alignment, element balance, and shape</span>
            </div>
            <div className="summary-item">
              <CheckCircle className="w-5 h-5" />
              <span>Combines factors into a weighted 0-100 Harmony Score</span>
            </div>
          </div>
          <p style={{ marginTop: '1rem' }}>
            For interiors, the Scan app uses LiDAR to map rooms and apply the same
            zone logic, so you get a score and remedies for your current layout.
          </p>
        </section>

        {/* What the numbers mean */}
        <section className="blog-section">
          <h2>What Do the Numbers Mean?</h2>
          <p>
            A higher Harmony Score generally means better alignment with Vastu
            principles and more supportive energy flow. Halo Home also provides
            category-specific feedback (e.g. entrance, zones, remedies) so you
            know what to improve. Even lower-scoring properties can be improved
            with the suggested remedies.
          </p>
        </section>

        {/* FAQ - GEO: 3-5 Q&A for AI and users */}
        <section className="blog-section" aria-label="Frequently asked questions">
          <h2>
            <HelpCircle className="w-5 h-5" style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Frequently Asked Questions
          </h2>
          {FAQS.map((faq) => (
            <div key={faq.question} className="info-box" style={{ marginBottom: '1rem' }}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </div>
          ))}
        </section>

        {/* Author - GEO: credentials for authority */}
        <section className="blog-section" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '2rem' }}>
          <p className="blog-meta" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
            <BookOpen className="w-4 h-4" style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            <strong>Author:</strong> {AUTHOR_NAME}. We build tools that combine
            Vastu Shastra with modern data (satellite, parcel, LiDAR) so you can
            evaluate and improve your space. Last updated: {LAST_UPDATED}.
          </p>
        </section>

        {/* CTA */}
        <section className="blog-cta-section">
          <h3>See your property's Harmony Score</h3>
          <p>
            Enter an address or ZIP code to get an instant Harmony Score and
            personalized remedies.
          </p>
          <Link to="/guest" className="blog-cta-btn">
            Try Halo Home Free
            <ChevronRight className="w-5 h-5" />
          </Link>
        </section>
      </article>

      <Footer showInstallButton={false} />
    </div>
  );
};

export default HarmonyScoreBlog;
