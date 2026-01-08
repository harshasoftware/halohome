import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface PolicyModalProps {
    id: string;
    isOpen: boolean;
    onClose: () => void;
    title: string;
    scriptId: string;
}

const PolicyModal: React.FC<PolicyModalProps> = ({ id, isOpen, onClose, title, scriptId }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Create script element
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = "https://app.termly.io/embed-policy.min.js";
            script.async = true;

            // Add the script to the document
            document.head.appendChild(script);

            // Disable body scrolling
            document.body.style.overflow = 'hidden';

            // Set a timeout to check if content loaded
            const timeout = setTimeout(() => {
                setIsLoaded(true);
            }, 1000);

            // Clean up function
            return () => {
                clearTimeout(timeout);
                if (document.getElementById(scriptId)) {
                    const termlyScript = document.getElementById(scriptId);
                    if (termlyScript && termlyScript.parentNode) {
                        termlyScript.parentNode.removeChild(termlyScript);
                    }
                }

                // Re-enable body scrolling
                document.body.style.overflow = '';
                setIsLoaded(false);
            };
        }
    }, [isOpen, scriptId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a]">
                    <h2 className="text-xl font-semibold text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">
                    {!isLoaded && (
                        <div className="flex justify-center items-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        </div>
                    )}
                    <div name="termly-embed" data-id={id} className="[&_*]:!text-white/80 [&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white [&_a]:!text-purple-400"></div>
                </div>
            </div>
        </div>
    );
};

export default PolicyModal;
