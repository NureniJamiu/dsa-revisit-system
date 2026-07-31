import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, Settings as SettingsIcon, LayoutDashboard, Archive, History } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import AddProblemModal from './AddProblemModal';
import Logo from './Logo';

interface LayoutProps {
    children: React.ReactNode;
    onProblemAdded?: () => void;
}

const navLinkClass = (active: boolean) =>
    `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${active
        ? 'bg-white/[0.08] text-zinc-100'
        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
    }`;

const Layout: React.FC<LayoutProps> = ({ children, onProblemAdded }) => {
    const location = useLocation();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAddProblemSuccess = () => {
        onProblemAdded?.();
    };

    return (
        <div className="min-h-screen flex overflow-x-hidden bg-zinc-950">
            {/* Sidebar */}
            <aside className="w-60 border-r border-white/[0.06] hidden md:flex md:flex-col bg-zinc-950">
                {/* Logo */}
                <div className="h-14 flex items-center px-4 border-b border-white/[0.06]">
                    <Logo textSize="text-[15px]" iconSize="w-6 h-6" className="text-white" showText={true} variant="light" />
                </div>

                {/* Main Navigation */}
                <nav className="px-2.5 pt-4 space-y-0.5 flex-1">
                    <p className="px-2.5 pb-1.5 text-[11px] font-medium text-zinc-600">Workspace</p>

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
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] w-full text-left mt-3"
                    >
                        <PlusCircle className="w-4 h-4" strokeWidth={1.75} />
                        Add problem
                    </button>
                </nav>

                {/* Bottom Section: Settings + User */}
                <div className="p-2.5 space-y-0.5 border-t border-white/[0.06]">
                    <Link to="/settings" className={navLinkClass(location.pathname === '/settings')}>
                        <SettingsIcon className="w-4 h-4" strokeWidth={1.75} />
                        Settings
                    </Link>

                    <div className="flex items-center gap-2.5 px-2.5 py-2 mt-1">
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: 'w-6 h-6',
                                },
                            }}
                        />
                        <span className="text-[13px] font-medium text-zinc-400">Account</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                <header className="h-14 border-b border-white/[0.06] md:hidden px-4 flex items-center justify-between bg-zinc-950">
                    <Logo textSize="text-[15px]" iconSize="w-6 h-6" className="text-white" showText={true} variant="light" />
                    <UserButton />
                </header>
                <div className="p-6 md:p-10 max-w-6xl mx-auto pb-24 md:pb-10">
                    {children}
                </div>

                {/* Mobile Bottom Nav */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/[0.06] flex justify-around p-2 z-50 bg-zinc-950/95 backdrop-blur-md">
                    <Link
                        to="/"
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${location.pathname === '/' ? 'text-zinc-100' : 'text-zinc-500'
                            }`}
                    >
                        <LayoutDashboard className="w-5 h-5" strokeWidth={1.75} />
                        Dashboard
                    </Link>

                    <Link
                        to="/archive"
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${location.pathname === '/archive' ? 'text-zinc-100' : 'text-zinc-500'
                            }`}
                    >
                        <Archive className="w-5 h-5" strokeWidth={1.75} />
                        Archive
                    </Link>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors text-zinc-500"
                    >
                        <PlusCircle className="w-5 h-5" strokeWidth={1.75} />
                        Add
                    </button>

                    <Link
                        to="/journey"
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${location.pathname === '/journey' ? 'text-zinc-100' : 'text-zinc-500'
                            }`}
                    >
                        <History className="w-5 h-5" strokeWidth={1.75} />
                        Journey
                    </Link>

                    <Link
                        to="/settings"
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${location.pathname === '/settings' ? 'text-zinc-100' : 'text-zinc-500'
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
