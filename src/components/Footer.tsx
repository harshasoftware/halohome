/**
 * Shared Footer Component
 * Used across Landing page and Blog pages
 */

import React, { useState } from 'react';
import { Instagram, Twitter, Mail, ExternalLink, Download } from 'lucide-react';
import CookiePolicy from '@/components/legal/CookiePolicy';
import PrivacyPolicy from '@/components/legal/PrivacyPolicy';
import TermsOfService from '@/components/legal/TermsOfService';
import DisclaimerPolicy from '@/components/legal/DisclaimerPolicy';
import AcceptableUsePolicy from '@/components/legal/AcceptableUsePolicy';
import Impressum from '@/components/legal/Impressum';
import DSARModal from '@/components/legal/DSARModal';

interface FooterProps {
    onInstall?: () => void;
    showInstallButton?: boolean;
}

const Footer: React.FC<FooterProps> = ({ onInstall, showInstallButton = true }) => {
    const [showLegalDropdown, setShowLegalDropdown] = useState(false);

    return (
        <footer className="footer">
            <div className="footer-content">
                {/* Brand Column */}
                <div className="footer-brand">
                    <h4 className="text-white font-semibold tracking-wide">ASTROCARTO</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
                        Discover where you belong in the universe. AI-powered astrocartography for your cosmic journey.
                    </p>
                    <div className="flex gap-3 pt-4">
                        <a
                            href="https://instagram.com/astrocartography.world"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-white hover:text-black hover:border-white flex items-center justify-center transition-colors duration-300"
                            aria-label="Instagram"
                        >
                            <Instagram size={18} />
                        </a>
                        <a
                            href="https://x.com/astrocartography_world"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-white hover:text-black hover:border-white flex items-center justify-center transition-colors duration-300"
                            aria-label="Twitter"
                        >
                            <Twitter size={18} />
                        </a>
                        <a
                            href="mailto:contact@astrocartography.world"
                            className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-white hover:text-black hover:border-white flex items-center justify-center transition-colors duration-300"
                            aria-label="Email"
                        >
                            <Mail size={18} />
                        </a>
                    </div>
                    {showInstallButton && onInstall && (
                        <button
                            onClick={onInstall}
                            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-white text-sm font-medium transition-colors duration-300"
                        >
                            <Download size={16} />
                            Install App
                        </button>
                    )}
                </div>

                {/* Product Column */}
                <div className="footer-col footer-links">
                    <h5>Product</h5>
                    <a href="/#features">Features</a>
                    <a href="/#pricing">Pricing</a>
                    <a href="/guest">Launch App</a>
                    <a href="/#faq">FAQ</a>
                </div>

                {/* Features Column */}
                <div className="footer-col footer-links">
                    <h5>Features</h5>
                    <a href="/guest">3D Globe</a>
                    <a href="/guest">AI Astrologer</a>
                    <a href="/guest">Natal Charts</a>
                    <a href="/guest">Duo Compatibility</a>
                </div>

                {/* Company Column */}
                <div className="footer-col footer-links">
                    <h5>Company</h5>
                    <a href="/">About Us</a>
                    <a href="/blog">Blog</a>
                    <a href="mailto:contact@astrocartography.world">Contact</a>
                </div>

                {/* Legal Column */}
                <div className="footer-col footer-links">
                    <h5>Legal</h5>
                    <a href="#privacy-policy">Privacy Policy</a>
                    <a href="#terms-of-service">Terms of Service</a>
                    <a href="#cookie-policy">Cookie Policy</a>
                    <button
                        className="text-purple-400 hover:text-purple-300 focus:outline-none underline text-xs mt-2 transition-colors duration-300 text-left"
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
                            <a href="#disclaimer" className="block hover:text-white transition-colors">Legal Disclaimer</a>
                            <a href="#acceptable-use" className="block hover:text-white transition-colors">Acceptable Use Policy</a>
                            <a href="#impressum" className="block hover:text-white transition-colors">Impressum</a>
                        </div>

                        <div className="mt-4">
                            <h6 className="text-xs font-bold text-zinc-300 mb-2">Data Protection</h6>
                            <div className="space-y-2 text-sm">
                                <a href="#dsar" className="block hover:text-white transition-colors">
                                    Data Subject Access Request
                                </a>
                                <a
                                    href="https://app.termly.io/notify/d433763f-5949-4542-8251-5f41735b5209"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center hover:text-white transition-colors"
                                >
                                    Do Not Sell My Information
                                    <ExternalLink className="ml-1 h-3 w-3" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-zinc-800 mt-12 pt-8 max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-zinc-500">
                        © 2025 Astrocarto. All rights reserved.
                    </p>
                    <p className="text-xs text-zinc-500">
                        Made with cosmic love
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
        </footer>
    );
};

export default Footer;
