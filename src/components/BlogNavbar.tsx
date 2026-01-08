/**
 * BlogNavbar - Shared navigation component for blog pages
 *
 * Uses the same styling as the Landing page navbar for consistency.
 * Links navigate to landing page sections.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, Menu, X, Share, Plus } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';

const BlogNavbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const { promptInstall, isIOS, isInstalled } = usePWAInstall();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleInstall = () => {
    setMobileMenuOpen(false);
    if (isInstalled) return;
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      promptInstall();
    }
  };

  return (
    <nav className={`nav-fixed ${isScrolled ? 'nav-scrolled' : ''}`}>
      <div className="nav-container">
        <Link to="/" className="nav-logo">Astrocarto</Link>

        {/* Desktop Nav */}
        <div className="nav-links hidden md:flex items-center">
          <Link to="/blog/methodology" className="nav-link">Methodology</Link>
          <Link to="/#features" className="nav-link">Features</Link>
          <Link to="/#pricing" className="nav-link">Pricing</Link>
          <button onClick={handleInstall} className="nav-link flex items-center gap-2">
            <Download size={16} /> Install
          </button>
          <Link to="/guest" className="px-4 py-2 text-sm font-medium text-black bg-white rounded-full hover:bg-gray-200 transition-colors">
            Launch App
          </Link>
        </div>

        {/* Mobile Nav Actions */}
        <div className="md:hidden flex items-center gap-3">
          <button
            onClick={handleInstall}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Install App"
          >
            <Download size={20} />
          </button>
          <button className="text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-black/95 border-b border-white/10 p-6 flex flex-col gap-6 md:hidden z-50">
          <Link to="/blog/methodology" onClick={() => setMobileMenuOpen(false)} className="nav-link text-lg">Methodology</Link>
          <Link to="/#features" onClick={() => setMobileMenuOpen(false)} className="nav-link text-lg">Features</Link>
          <Link to="/#pricing" onClick={() => setMobileMenuOpen(false)} className="nav-link text-lg">Pricing</Link>
          <button onClick={handleInstall} className="nav-link text-lg text-left">Install App</button>
          <Link to="/guest" className="px-6 py-3 text-center font-medium text-black bg-white rounded-full">
            Launch App
          </Link>
        </div>
      )}

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIOSInstructions(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Install on iPhone/iPad</h3>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">Tap the Share button</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Look for the <Share className="w-4 h-4 inline mx-1" /> icon at the bottom of Safari
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">Scroll and tap "Add to Home Screen"</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Look for the <Plus className="w-4 h-4 inline mx-1" /> Add to Home Screen option
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">Tap "Add" to install</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      The app will appear on your home screen
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full mt-6"
                onClick={() => setShowIOSInstructions(false)}
              >
                Got it!
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default BlogNavbar;
