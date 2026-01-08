import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface DSARModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    termlyId?: string;
}

/**
 * Data Subject Access Request Modal
 * Supports both controlled mode (isOpen/onClose props) and hash route mode (#dsar)
 */
const DSARModal: React.FC<DSARModalProps> = ({
    isOpen: controlledIsOpen,
    onClose: controlledOnClose,
    termlyId = 'd433763f-5949-4542-8251-5f41735b5209' // Default Termly ID - replace with your own
}) => {
    const [internalIsOpen, setInternalIsOpen] = useState(false);

    // Determine if we're in controlled mode or hash route mode
    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

    useEffect(() => {
        // Only set up hash route listeners if not in controlled mode
        if (isControlled) return;

        const checkUrlAndOpenModal = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const shouldOpen =
                urlParams.get('policy') === 'dsar' ||
                window.location.hash === '#dsar';

            if (shouldOpen) {
                setInternalIsOpen(true);
                document.body.style.overflow = 'hidden';
            }
        };

        checkUrlAndOpenModal();
        window.addEventListener('hashchange', checkUrlAndOpenModal);

        const handleAnchorClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'A' && target.getAttribute('href') === '#dsar') {
                event.preventDefault();
                setInternalIsOpen(true);
                document.body.style.overflow = 'hidden';
                window.history.pushState(null, '', '#dsar');
            }
        };

        document.addEventListener('click', handleAnchorClick);

        return () => {
            window.removeEventListener('hashchange', checkUrlAndOpenModal);
            document.removeEventListener('click', handleAnchorClick);
        };
    }, [isControlled]);

    // Handle body overflow for controlled mode
    useEffect(() => {
        if (isControlled && controlledIsOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            if (isControlled) {
                document.body.style.overflow = '';
            }
        };
    }, [isControlled, controlledIsOpen]);

    const handleClose = () => {
        if (isControlled) {
            controlledOnClose?.();
        } else {
            setInternalIsOpen(false);
            document.body.style.overflow = '';

            // Clean up URL
            if (window.location.hash === '#dsar') {
                window.history.pushState(null, '', window.location.pathname + window.location.search);
            }
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('policy') === 'dsar') {
                urlParams.delete('policy');
                const newSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';
                window.history.pushState(null, '', window.location.pathname + newSearch + window.location.hash);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a]">
                    <h2 className="text-xl font-semibold text-white">Data Subject Access Request</h2>
                    <button
                        onClick={handleClose}
                        className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-white">
                    <iframe
                        src={`https://app.termly.io/notify/${termlyId}`}
                        title="Data Subject Access Request Form"
                        width="100%"
                        height="600px"
                        style={{ border: 'none' }}
                        aria-label="Data Subject Access Request Form"
                    />
                </div>
            </div>
        </div>
    );
};

export default DSARModal;
