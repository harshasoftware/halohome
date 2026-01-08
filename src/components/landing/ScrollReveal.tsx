import React, { memo, useRef, useState, useEffect } from 'react';

// Shared IntersectionObserver for all ScrollReveal components (performance optimization)
const scrollRevealCallbacks = new Map<Element, () => void>();
let sharedObserver: IntersectionObserver | null = null;

const getSharedObserver = () => {
    if (!sharedObserver) {
        sharedObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const callback = scrollRevealCallbacks.get(entry.target);
                        if (callback) {
                            callback();
                            sharedObserver?.unobserve(entry.target);
                            scrollRevealCallbacks.delete(entry.target);
                        }
                    }
                });
            },
            { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
        );
    }
    return sharedObserver;
};

interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export const ScrollReveal = memo(({ children, className = "", delay = 0 }: ScrollRevealProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = getSharedObserver();
        scrollRevealCallbacks.set(element, () => setIsVisible(true));
        observer.observe(element);

        return () => {
            observer.unobserve(element);
            scrollRevealCallbacks.delete(element);
        };
    }, []);

    return (
        <div
            ref={ref}
            className={`reveal ${isVisible ? 'visible' : ''} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
});

