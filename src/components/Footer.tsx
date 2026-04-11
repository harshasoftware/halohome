/**
 * Shared Footer Component
 * Used across Landing page and Blog pages
 *
 * Adapted from CartoStar footer structure with:
 * - Mobile-responsive brand column (top on desktop, bottom on mobile)
 * - App Store & Google Play badges
 * - Threads & TikTok social links
 * - Blog column on mobile / Features column on desktop
 * - EULA & Subscription Terms legal modals
 * - Scan waitlist modal for mobile Google Play tap
 */

import React, { useState } from 'react';
import { Instagram, Twitter, Mail, ExternalLink } from 'lucide-react';
import { FaThreads, FaTiktok } from 'react-icons/fa6';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppStoreBadge } from '@/components/ui/AppStoreBadge';
import { GooglePlayBadge } from '@/components/ui/GooglePlayBadge';
import { ScanWaitlistModal } from '@/components/ScanWaitlistModal';

import CookiePolicy from '@/components/legal/CookiePolicy';
import PrivacyPolicy from '@/components/legal/PrivacyPolicy';
import TermsOfService from '@/components/legal/TermsOfService';
import DisclaimerPolicy from '@/components/legal/DisclaimerPolicy';
import AcceptableUsePolicy from '@/components/legal/AcceptableUsePolicy';
import Impressum from '@/components/legal/Impressum';
import DSARModal from '@/components/legal/DSARModal';
import EULA from '@/components/legal/EULA';
import SubscriptionTerms from '@/components/legal/SubscriptionTerms';

interface FooterProps {
    showAppLinks?: boolean;
    /** @deprecated Replaced by App Store / Google Play badges */
    onInstall?: () => void;
    /** @deprecated Replaced by App Store / Google Play badges */
    showInstallButton?: boolean;
}

const SocialLinks = () => (
    <div className="flex gap-3 pt-4">
        <a
            href="https://instagram.com/halohome.app"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-zinc-300 bg-white/50 text-zinc-600 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 flex items-center justify-center transition-colors duration-300"
            aria-label="Instagram"
        >
            <Instagram size={18} />
        </a>
        <a
            href="https://www.threads.net/@halohome.app"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-zinc-300 bg-white/50 text-zinc-600 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 flex items-center justify-center transition-colors duration-300"
            aria-label="Threads"
        >
            <FaThreads size={18} />
        </a>
        <a
            href="https://www.tiktok.com/@halohome.app"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-zinc-300 bg-white/50 text-zinc-600 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 flex items-center justify-center transition-colors duration-300"
            aria-label="TikTok"
        >
            <FaTiktok size={18} />
        </a>
        <a
            href="https://x.com/astrocartography_world"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-zinc-300 bg-white/50 text-zinc-600 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 flex items-center justify-center transition-colors duration-300"
            aria-label="Twitter"
        >
            <Twitter size={18} />
        </a>
        <a
            href="mailto:contact@halohome.app"
            className="w-10 h-10 rounded-full border border-zinc-300 bg-white/50 text-zinc-600 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 flex items-center justify-center transition-colors duration-300"
            aria-label="Email"
        >
            <Mail size={18} />
        </a>
    </div>
);

const Footer: React.FC<FooterProps> = ({ showAppLinks }) => {
    const [showLegalDropdown, setShowLegalDropdown] = useState(false);
    const [showWaitlistModal, setShowWaitlistModal] = useState(false);
    const isPhone = useIsMobile(768);
    const shouldShowAppLinks = showAppLinks ?? !isPhone;

    const handleGooglePlayClick = () => {
        // Try scrolling to an on-page android waitlist first
        const androidEl = document.getElementById('android-waitlist');
        if (androidEl) { androidEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        // Otherwise open the scan waitlist modal
        setShowWaitlistModal(true);
    };

    const BrandColumn = ({ mobile }: { mobile?: boolean }) => (
        <div
            className="footer-brand"
            style={mobile ? { borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '2rem', marginTop: '0.5rem' } : undefined}
        >
            <h4 className="text-zinc-900 flex items-center gap-2">
                <img src="/logo.png" alt="Halo Home" className="w-6 h-6 rounded-md" />
                Halo Home
            </h4>
            <p className="text-zinc-600 text-sm leading-relaxed max-w-xs">
                Start living in harmony. Apply the ancient science of Vastu to find your perfect home.
            </p>
            <SocialLinks />

            {/* App Store Badge */}
            <a
                href="/ios"
                className="mt-6 block transition-transform hover:-translate-y-0.5 opacity-90 hover:opacity-100"
                aria-label="Download on the App Store"
            >
                <AppStoreBadge width={mobile ? 155 : 135} />
            </a>

            {/* Google Play Badge */}
            <div className="mt-3 hover:-translate-y-0.5 transition-transform opacity-90 hover:opacity-100">
                <GooglePlayBadge width={mobile ? 155 : 135} onClick={handleGooglePlayClick} />
            </div>

            <p className="text-zinc-400 text-xs mt-3">Also available on Web &amp; Desktop</p>
        </div>
    );

    return (
        <footer className="footer footer-light">
            <div className="footer-content">
                {/* Brand Column — top on desktop, bottom on mobile */}
                {!isPhone && <BrandColumn />}

                {/* Product Column */}
                <div className="footer-col footer-links">
                    <h5>Product</h5>
                    <a href="/#features">Features</a>
                    <a href="/#pricing">Pricing</a>
                    {shouldShowAppLinks && <a href="/guest">Launch App</a>}
                    <a href="/ios">iOS App</a>
                    <a href="/android">Android App</a>
                    <a href="/#faq">FAQ</a>
                </div>

                {/* Features Column (desktop) / Blog Column (mobile) */}
                {isPhone ? (
                    <div className="footer-col footer-links">
                        <h5>Blog</h5>
                        <a href="/blog/methodology">Methodology</a>
                        <a href="/blog/scout-algorithm">Scout Algorithm</a>
                        <a href="/blog/what-is-harmony-score">Harmony Score</a>
                        <a href="/blog/duo-mode">Duo Mode</a>
                        <a href="/blog/planetary-precision">Planetary Precision</a>
                        <a href="/blog/astrology-systems">Astrology Systems</a>
                    </div>
                ) : (
                    <div className="footer-col footer-links">
                        <h5>Features</h5>
                        {shouldShowAppLinks && (
                            <>
                                <a href="/guest">Harmony Score</a>
                                <a href="/guest">ZIP Code Scout</a>
                                <a href="/guest">AI Insights</a>
                                <a href="/guest">Remedies Panel</a>
                            </>
                        )}
                    </div>
                )}

                {/* Company Column */}
                <div className="footer-col footer-links">
                    <h5>Company</h5>
                    <a href="/blog">Blog</a>
                    <a href="/sample-report">Sample Report</a>
                    <a href="/benchmark">Benchmark</a>
                    <a href="mailto:contact@halohome.app">Contact</a>
                </div>

                {/* Legal Column */}
                <div className="footer-col footer-links">
                    <h5>Legal</h5>
                    <a href="#privacy-policy">Privacy Policy</a>
                    <a href="#terms-of-service">Terms of Service</a>
                    <a href="#subscription-terms">Subscription Terms</a>
                    <a href="#cookie-policy">Cookie Policy</a>
                    <button
                        className="text-zinc-900 hover:text-zinc-600 focus:outline-none underline text-xs mt-2 transition-colors duration-300 text-left"
                        onClick={() => setShowLegalDropdown(!showLegalDropdown)}
                        aria-expanded={showLegalDropdown}
                    >
                        {showLegalDropdown ? 'Hide more' : 'View more'}
                    </button>

                    {/* Additional Legal Documents */}
                    <div
                        className={`transition-all duration-300 overflow-hidden ${showLegalDropdown ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}
                    >
                        <div className="space-y-2 text-sm">
                            <a href="#disclaimer" className="block hover:text-zinc-900 transition-colors">Legal Disclaimer</a>
                            <a href="#acceptable-use" className="block hover:text-zinc-900 transition-colors">Acceptable Use Policy</a>
                            <a href="#eula" className="block hover:text-zinc-900 transition-colors">EULA</a>
                            <a href="#impressum" className="block hover:text-zinc-900 transition-colors">Impressum</a>
                        </div>

                        <div className="mt-4">
                            <h6 className="text-xs font-bold text-zinc-700 mb-2">Data Protection</h6>
                            <div className="space-y-2 text-sm">
                                <a href="#dsar" className="block hover:text-zinc-900 transition-colors">
                                    Data Subject Access Request
                                </a>
                                <a
                                    href="https://app.termly.io/notify/d433763f-5949-4542-8251-5f41735b5209"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center hover:text-zinc-900 transition-colors"
                                >
                                    Do Not Sell My Information
                                    <ExternalLink className="ml-1 h-3 w-3" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Brand / social / download — mobile only, after links for conversion */}
                {isPhone && <BrandColumn mobile />}
            </div>

            {/* Copyright */}
            <div className="border-t border-zinc-200 mt-12 pt-8 max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-zinc-500">
                        © 2025–2026 Halo Home. All rights reserved.
                    </p>
                    <p className="text-xs text-zinc-500">
                        Start living in harmony
                    </p>
                </div>
            </div>

            {/* Policy Modals */}
            <CookiePolicy id="7acd77e7-4dba-4e6a-9934-cbf5bf4fc9b1" />
            <PrivacyPolicy id="d433763f-5949-4542-8251-5f41735b5209" />
            <TermsOfService id="2a85ad99-4847-44bf-a747-fa324c7d63c5" />
            <DisclaimerPolicy id="33258bac-b041-4be3-9cd5-6ff4e685a810" />
            <AcceptableUsePolicy id="576d4c58-6547-4a41-b59e-757f8c76be15" />
            <Impressum id="784c9909-9a9a-45ad-a13c-d03161cd6160" />
            <DSARModal />
            <EULA id="d433763f-5949-4542-8251-5f41735b5209" />
            <SubscriptionTerms id="2a85ad99-4847-44bf-a747-fa324c7d63c5" />
            <ScanWaitlistModal open={showWaitlistModal} onOpenChange={setShowWaitlistModal} />
        </footer>
    );
};

export default Footer;
