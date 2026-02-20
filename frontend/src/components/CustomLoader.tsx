import React from 'react';

interface CustomLoaderProps {
    className?: string;
    size?: string;
    text?: string;
}

const CustomLoader: React.FC<CustomLoaderProps> = ({
    className = "",
    size = "w-16 h-16",
    text = "Loading mastery data..."
}) => {
    return (
        <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
            <div className={`${size} relative`}>
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
                    {/* Layer 4 (Bottom) - Stacks up last from top */}
                    <path
                        d="M50 85 L15 70 L50 55 L85 70 Z"
                        fill="#D4B996"
                        className="animate-stack-in"
                        style={{ animationDelay: '0.6s', opacity: 0 }}
                    />
                    <path
                        d="M15 70 L15 75 L50 90 L85 75 L85 70 L50 85 Z"
                        fill="#B0936E"
                        className="animate-stack-in"
                        style={{ animationDelay: '0.6s', opacity: 0 }}
                    />

                    {/* Layer 3 */}
                    <path
                        d="M50 75 L15 60 L50 45 L85 60 Z"
                        fill="#F3E9DC"
                        className="animate-stack-in"
                        style={{ animationDelay: '0.4s', opacity: 0 }}
                    />
                    <path
                        d="M15 60 L15 65 L50 80 L85 65 L85 60 L50 75 Z"
                        fill="#E2D4C3"
                        className="animate-stack-in"
                        style={{ animationDelay: '0.4s', opacity: 0 }}
                    />

                    {/* Layer 2 (Green) */}
                    <path
                        d="M50 65 L15 50 L50 35 L85 50 Z"
                        fill="#22C55E"
                        className="animate-stack-in"
                        style={{ animationDelay: '0.2s', opacity: 0 }}
                    />
                    <path
                        d="M15 50 L15 55 L50 70 L85 55 L85 50 L50 65 Z"
                        fill="#16A34A"
                        className="animate-stack-in"
                        style={{ animationDelay: '0.2s', opacity: 0 }}
                    />

                    {/* Layer 1 (Top) - Starts first */}
                    <path
                        d="M50 55 L15 40 L50 25 L85 40 Z"
                        fill="#FEF3E2"
                        className="animate-stack-in"
                        style={{ animationDelay: '0s', opacity: 0 }}
                    />
                    <path
                        d="M15 40 L15 45 L50 60 L85 45 L85 40 L50 55 Z"
                        fill="#F9E6CC"
                        className="animate-stack-in"
                        style={{ animationDelay: '0s', opacity: 0 }}
                    />
                </svg>
            </div>
            {text && (
                <span className="text-sm font-black text-gray-400 uppercase tracking-widest animate-pulse">
                    {text}
                </span>
            )}

            <style>{`
                @keyframes stack-in {
                    0% {
                        transform: translateY(-20px);
                        opacity: 0;
                    }
                    20% {
                        transform: translateY(0);
                        opacity: 1;
                    }
                    80% {
                        transform: translateY(0);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(0);
                        opacity: 0;
                    }
                }
                .animate-stack-in {
                    animation: stack-in 2s ease-in-out infinite;
                    transform-origin: center;
                }
            `}</style>
        </div>
    );
};

export default CustomLoader;
