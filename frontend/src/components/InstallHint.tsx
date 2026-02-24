import React, { useState, useEffect } from 'react';
import { Share, X } from 'lucide-react';

const InstallHint: React.FC = () => {
    const [showHint, setShowHint] = useState(false);

    useEffect(() => {
        // 1. Check if it's iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

        // 2. Check if it's Safari (standard browser, not in standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        // 3. Check if user already dismissed it in this session
        const isDismissed = sessionStorage.getItem('ios-install-hint-dismissed');

        if (isIOS && !isStandalone && !isDismissed) {
            // Delaying a bit to not overwhelm user immediately
            const timer = setTimeout(() => setShowHint(true), 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setShowHint(false);
        sessionStorage.setItem('ios-install-hint-dismissed', 'true');
    };

    if (!showHint) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-bounce-subtle">
            <div className="bg-white rounded-2xl shadow-2xl border border-green-100 p-4 max-w-sm mx-auto relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-green-50 rounded-full blur-2xl opacity-50" />

                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4">
                    <div className="bg-green-100 p-3 rounded-xl shrink-0">
                        <Share className="w-6 h-6 text-green-600" />
                    </div>

                    <div className="flex-1 pt-1">
                        <h3 className="font-bold text-gray-900 leading-tight mb-1">
                            Install ReStack
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            To install this app on your iPhone, tap
                            <span className="font-semibold text-gray-800 mx-1">Share</span>
                            then
                            <span className="font-semibold text-gray-800 mx-1">"Add to Home Screen"</span>.
                        </p>
                    </div>
                </div>

                {/* Small pointer triangle (centered for iOS bottom bar) */}
                <div className="absolute -bottom-2 left-1/2 -ml-2 w-4 h-4 bg-white border-b border-r border-green-100 rotate-45" />
            </div>

            <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
};

export default InstallHint;
