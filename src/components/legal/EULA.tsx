import React, { useState, useEffect } from 'react';
import PolicyModal from './PolicyModal';

interface EULAProps {
    id: string;
}

const EULA: React.FC<EULAProps> = ({ id }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const checkUrlAndOpenModal = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const shouldOpen =
                urlParams.get('policy') === 'eula' ||
                window.location.hash === '#eula';

            if (shouldOpen) {
                setIsModalOpen(true);
            }
        };

        checkUrlAndOpenModal();
        window.addEventListener('hashchange', checkUrlAndOpenModal);

        const handleAnchorClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'A' && target.getAttribute('href') === '#eula') {
                event.preventDefault();
                setIsModalOpen(true);
                window.history.pushState(null, '', '#eula');
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

        if (window.location.hash === '#eula') {
            window.history.pushState(null, '', window.location.pathname + window.location.search);
        }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('policy') === 'eula') {
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
            title="End User License Agreement"
            scriptId="termly-policy-jssdk-eula"
        />
    );
};

export default EULA;
