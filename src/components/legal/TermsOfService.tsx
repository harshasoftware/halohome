import React, { useState, useEffect } from 'react';
import PolicyModal from './PolicyModal';

interface TermsOfServiceProps {
    id: string;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ id }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const checkUrlAndOpenModal = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const shouldOpen =
                urlParams.get('policy') === 'terms' ||
                window.location.hash === '#terms-of-service';

            if (shouldOpen) {
                setIsModalOpen(true);
            }
        };

        checkUrlAndOpenModal();
        window.addEventListener('hashchange', checkUrlAndOpenModal);

        const handleAnchorClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'A' && target.getAttribute('href') === '#terms-of-service') {
                event.preventDefault();
                setIsModalOpen(true);
                window.history.pushState(null, '', '#terms-of-service');
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

        if (window.location.hash === '#terms-of-service') {
            window.history.pushState(null, '', window.location.pathname + window.location.search);
        }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('policy') === 'terms') {
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
            title="Terms of Service"
            scriptId="termly-policy-jssdk-terms"
        />
    );
};

export default TermsOfService;
