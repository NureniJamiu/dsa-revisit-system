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
    buttonHover: string;
    DefaultIcon: React.FC<{ className?: string }>;
}> = {
    info: {
        iconBg: 'bg-green-50',
        iconColor: 'text-green-600',
        buttonBg: 'bg-gray-800',
        buttonHover: 'hover:bg-gray-800',
        DefaultIcon: Info,
    },
    success: {
        iconBg: 'bg-green-50',
        iconColor: 'text-green-600',
        buttonBg: 'bg-gray-800',
        buttonHover: 'hover:bg-gray-800',
        DefaultIcon: CheckCircle,
    },
    danger: {
        iconBg: 'bg-red-50',
        iconColor: 'text-red-500',
        buttonBg: 'bg-red-500',
        buttonHover: 'hover:bg-red-600',
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
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fadeIn"
            onClick={handleBackdropClick}
        >
            <div
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-[380px] transform transition-all animate-scaleIn overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Content */}
                <div className="px-8 pt-10 pb-8 text-center">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className={`w-16 h-16 rounded-full ${style.iconBg} flex items-center justify-center border border-current border-opacity-10`}>
                            {icon || <IconComponent className={`w-8 h-8 ${style.iconColor}`} />}
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-3 px-2">{title}</h3>

                    {/* Description */}
                    {description && (
                        <p className="text-sm font-medium text-gray-400 mb-8 leading-relaxed px-2">{description}</p>
                    )}

                    {/* Children for custom content e.g. inputs */}
                    {children && (
                        <div className="mb-8 text-left">
                            {children}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleConfirm}
                            disabled={loading}
                            className={`w-full py-4 text-white rounded-2xl font-black transition-all shadow-xl shadow-gray-200 uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed ${style.buttonBg} ${style.buttonHover}`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
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
                            className="w-full py-3 text-[11px] font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest disabled:opacity-50"
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
