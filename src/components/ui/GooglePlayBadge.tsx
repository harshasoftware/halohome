import React from 'react';
import googlePlayBadge from '@/assets/google-play-badge.png';

interface GooglePlayBadgeProps {
    className?: string;
    width?: number | string;
    height?: number | string;
    onClick?: () => void;
    href?: string;
}

export const GooglePlayBadge: React.FC<GooglePlayBadgeProps> = ({
    className,
    width = 155,
    height,
    onClick,
    href,
}) => {
    const img = (
        <img
            src={googlePlayBadge}
            alt="Pre-register on Google Play"
            loading="lazy"
            style={{ width: height ? 'auto' : width, height: height || 'auto', objectFit: 'contain', display: 'block' }}
        />
    );

    if (href) {
        return (
            <a
                href={href}
                className={className}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Pre-register on Google Play"
                style={{ display: 'inline-block' }}
            >
                {img}
            </a>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={className}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-block' }}
            aria-label="Pre-register on Google Play — scroll to waitlist"
        >
            {img}
        </button>
    );
};
