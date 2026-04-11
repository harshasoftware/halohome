import React from 'react';
import appStoreBadge from '@/assets/app-store-badge.svg';

interface AppStoreBadgeProps {
    className?: string;
    width?: number | string;
    height?: number | string;
}

export const AppStoreBadge: React.FC<AppStoreBadgeProps> = ({
    className,
    width = 120,
    height,
}) => {
    return (
        <img
            src={appStoreBadge}
            alt="Download on the App Store"
            className={className}
            loading="lazy"
            style={{
                width: height ? 'auto' : width,
                height: height || 'auto',
                objectFit: 'contain'
            }}
        />
    );
};
