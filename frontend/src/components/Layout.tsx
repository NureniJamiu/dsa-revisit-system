import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, Settings as SettingsIcon, LayoutDashboard, Archive, History } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import AddProblemModal from './AddProblemModal';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
    children: React.ReactNode;
    onProblemAdded?: () => void;
}

const navLinkClass = (active: boolean) =>
    `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${active
        ? 'bg-[var(--nav-item-active-bg)] text-[var(--nav-text-active)]'
        : 'text-[var(--nav-text-inactive)] hover:text-[var(--nav-text-active)] hover:bg-[var(--nav-item-hover-bg)]'
    }`;

const Layout: React.FC<LayoutProps> = ({ children, onProblemAdded }) => {
    const location = useLocation();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAddProblemSuccess = () => {
        onProblemAdded?.();
    };

    return (
        <div className="min-h-screen flex overflow-x-hidden bg-[var(--bg-app)]">
            {/* Sidebar */}
            <aside className="w-60 border-r border-[var(--nav-border)] hidden md:flex md:flex-col bg-[var(--nav-bg)]">
                {/* Logo */}
                <div className="h-14 flex items-center px-4 border-b border-[var(--nav-border)]">
                    <Logo textSize="text-[15px]" iconSize="w-6 h-6" className="text-white" showText={true} variant="light" />
                </div>

                {/* Main Navigation */}
                <nav className="px-2.5 pt-4 space-y-0.5 flex-1">
                    <p className="px-2.5 pb-1.5 text-[11px] font-medium text-[var(--nav-text-inactive)] opacity-70">Workspace</p>

                    <Link to="/" className={navLinkClass(location.pathname === '/')}>
                        <LayoutDashboard className="w-4 h-4" strokeWidth={1.75} />
                        Dashboard
                    </Link>

                    <Link to="/archive" className={navLinkClass(location.pathname === '/archive')}>
                        <Archive className="w-4 h-4" strokeWidth={1.75} />
                        Archive
                    </Link>

                    <Link to="/journey" className={navLinkClass(location.pathname === '/journey')}>
                        <History className="w-4 h-4" strokeWidth={1.75} />
                        Journey
                    </Link>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors text-[var(--nav-text-inactive)] hover:text-[var(--nav-text-active)] hover:bg-[var(--nav-item-hover-bg)] w-full text-left mt-3"
                    >
                        <PlusCircle className="w-4 h-4" strokeWidth={1.75} />
                        Add problem
                    </button>
                </nav>

                {/* Bottom Section: Settings + User */}
                <div className="p-2.5 space-y-0.5 border-t border-[var(--nav-border)]">
                    <Link to="/settings" className={navLinkClass(location.pathname === '/settings')}>
                        <SettingsIcon className="w-4 h-4" strokeWidth={1.75} />
                        Settings
                    </Link>

                    <div className="flex items-center justify-between gap-2.5 px-2.5 py-2 mt-1">
                        <div className="flex items-center gap-2.5">
                            <UserButton
                                appearance={{
                                    elements: {
                                        avatarBox: 'w-6 h-6',
                                    },
                                }}
                            />
                            <span className="text-[13px] font-medium text-[var(--nav-text-inactive)]">Account</span>
                        </div>
                        <ThemeToggle
                            iconSize={15}
                            className="p-1.5 text-[var(--nav-text-inactive)] hover:text-[var(--nav-text-active)] hover:bg-[var(--nav-item-hover-bg)]"
                        />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                <header className="h-14 border-b border-[var(--nav-border)] md:hidden px-4 flex items-center justify-between bg-[var(--nav-bg)]">
                    <Logo textSize="text-[15px]" iconSize="w-6 h-6" className="text-white" showText={true} variant="light" />
                    <div className="flex items-center gap-1">
                        <ThemeToggle
                            iconSize={17}
                            className="p-1.5 text-[var(--nav-text-inactive)] hover:text-[var(--nav-text-active)] hover:bg-[var(--nav-item-hover-bg)]"
                        />
                        <UserButton />
                    </div>
                </header>
                <div className="p-6 md:p-10 pb-24 md:pb-10">
                    {children}
                </div>

                {/* Mobile Bottom Nav */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[var(--nav-border)] flex justify-around p-2 z-50 bg-[var(--nav-bg)]/95 backdrop-blur-md">
                    <Link
                        to="/"
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${location.pathname === '/' ? 'text-[var(--nav-text-active)]' : 'text-[var(--nav-text-inactive)]'
                            }`}
                    >
                        <LayoutDashboard className="w-5 h-5" strokeWidth={1.75} />
                        Dashboard
                    </Link>

                    <Link
                        to="/archive"
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${location.pathname === '/archive' ? 'text-[var(--nav-text-active)]' : 'text-[var(--nav-text-inactive)]'
                            }`}
                    >
                        <Archive className="w-5 h-5" strokeWidth={1.75} />
                        Archive
                    </Link>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors text-[var(--nav-text-inactive)]"
                    >
                        <PlusCircle className="w-5 h-5" strokeWidth={1.75} />
                        Add
                    </button>

                    <Link
                        to="/journey"
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${location.pathname === '/journey' ? 'text-[var(--nav-text-active)]' : 'text-[var(--nav-text-inactive)]'
                            }`}
                    >
                        <History className="w-5 h-5" strokeWidth={1.75} />
                        Journey
                    </Link>

                    <Link
                        to="/settings"
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${location.pathname === '/settings' ? 'text-[var(--nav-text-active)]' : 'text-[var(--nav-text-inactive)]'
                            }`}
                    >
                        <SettingsIcon className="w-5 h-5" strokeWidth={1.75} />
                        Settings
                    </Link>
                </nav>
            </main>

            {/* Add Problem Modal */}
            <AddProblemModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleAddProblemSuccess}
            />
        </div>
    );
};

export default Layout;
