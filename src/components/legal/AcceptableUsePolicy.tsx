import React, { useState, useEffect } from 'react';
import PolicyModal from './PolicyModal';

interface AcceptableUsePolicyProps {
    id: string;
}

const AcceptableUsePolicy: React.FC<AcceptableUsePolicyProps> = ({ id }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const checkUrlAndOpenModal = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const shouldOpen =
                urlParams.get('policy') === 'acceptable-use' ||
                window.location.hash === '#acceptable-use';

            if (shouldOpen) {
                setIsModalOpen(true);
            }
        };

        checkUrlAndOpenModal();
        window.addEventListener('hashchange', checkUrlAndOpenModal);

        const handleAnchorClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'A' && target.getAttribute('href') === '#acceptable-use') {
                event.preventDefault();
                setIsModalOpen(true);
                window.history.pushState(null, '', '#acceptable-use');
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

        if (window.location.hash === '#acceptable-use') {
            window.history.pushState(null, '', window.location.pathname + window.location.search);
        }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('policy') === 'acceptable-use') {
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
            title="Acceptable Use Policy"
            scriptId="termly-policy-jssdk-acceptable-use"
        />
    );
};

export default AcceptableUsePolicy;
