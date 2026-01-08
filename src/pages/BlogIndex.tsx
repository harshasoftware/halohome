/**
 * BlogIndex - Lists all blog articles
 *
 * Main blog landing page showing all available articles.
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Target, Compass, Users, Orbit, Telescope,
  ChevronRight, BookOpen
} from 'lucide-react';
import Footer from '@/components/Footer';
import BlogNavbar from '@/components/BlogNavbar';
import './ScoutAlgorithmBlog.css';
import './Landing.css';

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  readTime: string;
}

const blogPosts: BlogPost[] = [
  {
    slug: '/blog/methodology',
    title: 'The Science Behind Your Stars',
    description: 'Professional-grade astrocartography powered by NASA-grade ephemeris data and ancient wisdom — our technical foundation explained.',
    icon: <Telescope className="w-6 h-6" />,
    badge: 'Methodology',
    readTime: '8 min read',
  },
  {
    slug: '/blog/scout-algorithm',
    title: 'How Our Scout Engine Achieves Unprecedented Accuracy',
    description: 'A transparent look at the science behind location scoring — why it matters, and how we built the most precise astrocartography engine available.',
    icon: <Target className="w-6 h-6" />,
    badge: 'Technical Deep-Dive',
    readTime: '10 min read',
  },
  {
    slug: '/blog/planetary-precision',
    title: 'The Hidden Science Behind Planetary Line Accuracy',
    description: 'Why calculating where planets actually are is surprisingly hard — and what separates precise astrocartography from guesswork.',
    icon: <Orbit className="w-6 h-6" />,
    badge: 'Technical Deep-Dive',
    readTime: '8 min read',
  },
  {
    slug: '/blog/astrology-systems',
    title: 'Every Planet. Every Line. Every System.',
    description: 'Built for serious astrologers. Western or Vedic. Tropical or Sidereal. Eight house systems. All ten celestial bodies mapped with precision.',
    icon: <Compass className="w-6 h-6" />,
    badge: 'Professional Tools',
    readTime: '8 min read',
  },
  {
    slug: '/blog/duo-mode',
    title: 'Duo Mode: Where Two Worlds Align',
    description: 'Discover how we find the perfect locations for couples, travel partners, and business duos — where both people\'s astrocartography lines intersect.',
    icon: <Users className="w-6 h-6" />,
    badge: 'Feature Guide',
    readTime: '8 min read',
  },
];

const BlogIndex: React.FC = () => {
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
          <BookOpen className="w-4 h-4" />
          <span>Blog</span>
        </div>
        <h1 className="blog-title">
          Insights &amp; Deep Dives
        </h1>
        <p className="blog-subtitle">
          Explore the science, methodology, and features behind
          the most precise astrocartography platform available.
        </p>
      </header>

      {/* Blog Grid */}
      <section className="blog-content">
        <div className="blog-grid" style={{
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              to={post.slug}
              className="blog-card"
              style={{
                display: 'block',
                padding: '1.5rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '1rem',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(168,85,247,0.9)',
                }}>
                  {post.icon}
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  color: 'rgba(168,85,247,0.8)',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {post.badge}
                </span>
              </div>

              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'white',
                marginBottom: '0.75rem',
                lineHeight: 1.3,
              }}>
                {post.title}
              </h3>

              <p style={{
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.6,
                marginBottom: '1rem',
              }}>
                {post.description}
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.75rem',
              }}>
                <span>{post.readTime}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BlogIndex;
