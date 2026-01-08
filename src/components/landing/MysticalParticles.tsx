import React, { memo, useState, useEffect } from 'react';

// Mystical particle/star positions - generated once, memoized
const PARTICLES = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: 3 + Math.random() * 4,
    delay: Math.random() * 5,
    large: Math.random() > 0.8,
    drifting: Math.random() > 0.7,
    driftDuration: 15 + Math.random() * 20,
}));

// Deferred particles - only render after initial paint
export const MysticalParticles = memo(() => {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Defer particle rendering until after first paint
        const id = requestIdleCallback?.(() => setIsReady(true)) ??
            setTimeout(() => setIsReady(true), 100);
        return () => {
            if (typeof id === 'number') {
                cancelIdleCallback?.(id) ?? clearTimeout(id);
            }
        };
    }, []);

    if (!isReady) return null;

    return (
        <div className="particles-container" style={{ contain: 'layout style' }}>
            {/* Twinkling stars */}
            {PARTICLES.map((p) => (
                <div
                    key={p.id}
                    className={`particle ${p.large ? 'large' : ''} ${p.drifting ? 'drifting' : ''}`}
                    style={{
                        left: p.left,
                        top: p.top,
                        '--duration': `${p.duration}s`,
                        '--delay': `${p.delay}s`,
                        '--drift-duration': `${p.driftDuration}s`,
                    } as React.CSSProperties}
                />
            ))}
            {/* Nebula glows */}
            <div className="nebula-glow" style={{ top: '20%', left: '10%', width: 300, height: 300, background: 'rgba(147, 112, 219, 0.3)' }} />
            <div className="nebula-glow" style={{ top: '60%', right: '5%', width: 250, height: 250, background: 'rgba(100, 149, 237, 0.25)', animationDelay: '4s' }} />
            <div className="nebula-glow" style={{ bottom: '10%', left: '30%', width: 200, height: 200, background: 'rgba(255, 182, 193, 0.2)', animationDelay: '2s' }} />
        </div>
    );
});

