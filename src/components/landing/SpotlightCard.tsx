import React, { useRef, useState } from 'react';

interface SpotlightCardProps {
    children: React.ReactNode;
    className?: string;
}

export const SpotlightCard = ({ children, className = "" }: SpotlightCardProps) => {
    const divRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    return (
        <div
            ref={divRef}
            className={`glass-card relative overflow-hidden ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div
                className="pointer-events-none absolute -inset-px transition duration-300"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.1), transparent 40%)`
                }}
            />
            <div className="relative z-10 h-full">
                {children}
            </div>
        </div>
    );
};

