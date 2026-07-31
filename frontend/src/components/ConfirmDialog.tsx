import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

export type ConfirmDialogVariant = 'info' | 'danger' | 'success';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmDialogVariant;
    loading?: boolean;
    icon?: React.ReactNode;
    children?: React.ReactNode;
}

const variantStyles: Record<ConfirmDialogVariant, {
    iconBg: string;
    iconColor: string;
    buttonBg: string;
    buttonText: string;
    buttonHover: string;
    DefaultIcon: React.FC<{ className?: string }>;
}> = {
    info: {
        iconBg: 'bg-green-500/10',
        iconColor: 'text-green-400',
        buttonBg: 'bg-zinc-100',
        buttonText: 'text-zinc-900',
        buttonHover: 'hover:bg-white',
        DefaultIcon: Info,
    },
    success: {
        iconBg: 'bg-green-500/10',
        iconColor: 'text-green-400',
        buttonBg: 'bg-zinc-100',
        buttonText: 'text-zinc-900',
        buttonHover: 'hover:bg-white',
        DefaultIcon: CheckCircle,
    },
    danger: {
        iconBg: 'bg-red-500/10',
        iconColor: 'text-red-400',
        buttonBg: 'bg-red-500',
        buttonText: 'text-white',
        buttonHover: 'hover:bg-red-400',
        DefaultIcon: AlertTriangle,
    },
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'info',
    loading = false,
    icon,
    children,
}) => {
    if (!isOpen) return null;

    const style = variantStyles[variant];
    const IconComponent = style.DefaultIcon;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !loading) {
            onClose();
        }
    };

    const handleConfirm = () => {
        if (!loading) {
            onConfirm();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={handleBackdropClick}
        >
            <div
                className="bg-zinc-900 border border-white/[0.08] rounded-xl shadow-2xl w-full max-w-[380px] transform transition-all animate-scaleIn overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Content */}
                <div className="px-7 pt-9 pb-7 text-center">
                    {/* Icon */}
                    <div className="flex justify-center mb-5">
                        <div className={`w-12 h-12 rounded-full ${style.iconBg} flex items-center justify-center`}>
                            {icon || <IconComponent className={`w-6 h-6 ${style.iconColor}`} />}
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-[17px] font-semibold text-zinc-100 tracking-tight mb-2 px-2">{title}</h3>

                    {/* Description */}
                    {description && (
                        <p className="text-[13px] text-zinc-500 mb-6 leading-relaxed px-2">{description}</p>
                    )}

                    {/* Children for custom content e.g. inputs */}
                    {children && (
                        <div className="mb-6 text-left">
                            {children}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleConfirm}
                            disabled={loading}
                            className={`w-full py-3 rounded-md font-medium transition-colors text-[13px] disabled:opacity-50 disabled:cursor-not-allowed ${style.buttonBg} ${style.buttonText} ${style.buttonHover}`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Processing
                                </span>
                            ) : (
                                confirmLabel
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="w-full py-2.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
