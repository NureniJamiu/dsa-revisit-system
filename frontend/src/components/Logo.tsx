import React from 'react';

interface LogoProps {
    className?: string;
    showText?: boolean;
    textSize?: string;
    iconSize?: string;
    variant?: 'light' | 'dark';
}

const Logo: React.FC<LogoProps> = ({
    className = "",
    showText = true,
    textSize = "text-xl",
    iconSize = "w-8 h-8",
    variant = "dark"
}) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Stack Icon */}
            <div className={`${iconSize} relative`}>
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
                    {/* Layer 4 (Bottom) */}
                    <path d="M50 85 L15 70 L50 55 L85 70 Z" fill="#D4B996" />
                    <path d="M15 70 L15 75 L50 90 L85 75 L85 70 L50 85 Z" fill="#B0936E" />

                    {/* Layer 3 */}
                    <path d="M50 75 L15 60 L50 45 L85 60 Z" fill="#F3E9DC" />
                    <path d="M15 60 L15 65 L50 80 L85 65 L85 60 L50 75 Z" fill="#E2D4C3" />

                    {/* Layer 2 (Green) */}
                    <path d="M50 65 L15 50 L50 35 L85 50 Z" fill="#22C55E" />
                    <path d="M15 50 L15 55 L50 70 L85 55 L85 50 L50 65 Z" fill="#16A34A" />

                    {/* Layer 1 (Top) */}
                    <path d="M50 55 L15 40 L50 25 L85 40 Z" fill="#FEF3E2" />
                    <path d="M15 40 L15 45 L50 60 L85 45 L85 40 L50 55 Z" fill="#F9E6CC" />

                    {/* Checkmark */}
                    <path
                        d="M40 40 L47 47 L60 34"
                        fill="none"
                        stroke="#22C55E"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            {/* Logo Text */}
            {showText && (
                <span className={`${textSize} font-black tracking-tighter`}>
                    <span style={{ color: variant === 'light' ? '#FFFFFF' : '#111111' }}>Re</span>
                    <span className="text-green-600">Stack</span>
                </span>
            )}
        </div>
    );
};

export default Logo;
