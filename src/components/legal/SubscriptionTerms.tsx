import React, { useState, useEffect } from 'react';
import PolicyModal from './PolicyModal';

interface SubscriptionTermsProps {
    id: string;
}

const SubscriptionTerms: React.FC<SubscriptionTermsProps> = ({ id }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const checkUrlAndOpenModal = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const shouldOpen =
                urlParams.get('policy') === 'subscription-terms' ||
                window.location.hash === '#subscription-terms';

            if (shouldOpen) {
                setIsModalOpen(true);
            }
        };

        checkUrlAndOpenModal();
        window.addEventListener('hashchange', checkUrlAndOpenModal);

        const handleAnchorClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'A' && target.getAttribute('href') === '#subscription-terms') {
                event.preventDefault();
                setIsModalOpen(true);
                window.history.pushState(null, '', '#subscription-terms');
            }
        };

        document.addEventListener('click', handleAnchorClick);

        return () => {
            window.removeEventListener('hashchange', checkUrlAndOpenModal);
            document.removeEventListener('click', handleAnchorClick);
        };
    }, []);

    const handleCloseModal = () => {
        setIsModalOpen(false);

        if (window.location.hash === '#subscription-terms') {
            window.history.pushState(null, '', window.location.pathname + window.location.search);
        }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('policy') === 'subscription-terms') {
            urlParams.delete('policy');
            const newSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';
            window.history.pushState(null, '', window.location.pathname + newSearch + window.location.hash);
        }
    };

    return (
        <PolicyModal
            id={id}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            title="Subscription Terms"
            scriptId="termly-policy-jssdk-subscription"
        />
    );
};

export default SubscriptionTerms;
