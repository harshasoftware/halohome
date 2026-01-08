import React, { useState, useEffect } from 'react';
import PolicyModal from './PolicyModal';

interface CookiePolicyProps {
    id: string;
}

const CookiePolicy: React.FC<CookiePolicyProps> = ({ id }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const checkUrlAndOpenModal = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const shouldOpen =
                urlParams.get('policy') === 'cookie' ||
                window.location.hash === '#cookie-policy';

            if (shouldOpen) {
                setIsModalOpen(true);
            }
        };

        checkUrlAndOpenModal();
        window.addEventListener('hashchange', checkUrlAndOpenModal);

        const handleAnchorClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'A' && target.getAttribute('href') === '#cookie-policy') {
                event.preventDefault();
                setIsModalOpen(true);
                window.history.pushState(null, '', '#cookie-policy');
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

        if (window.location.hash === '#cookie-policy') {
            window.history.pushState(null, '', window.location.pathname + window.location.search);
        }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('policy') === 'cookie') {
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
            title="Cookie Policy"
            scriptId="termly-policy-jssdk-cookie"
        />
    );
};

export default CookiePolicy;
