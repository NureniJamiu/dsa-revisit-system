import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, Settings as SettingsIcon, LayoutDashboard, Archive } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import AddProblemModal from './AddProblemModal';
import Logo from './Logo';

interface LayoutProps {
    children: React.ReactNode;
    onProblemAdded?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onProblemAdded }) => {
    const location = useLocation();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/archive', label: 'Archive', icon: Archive },
    ];

    const handleAddProblemSuccess = () => {
        onProblemAdded?.();
    };

    return (
        <div className="min-h-screen flex overflow-x-hidden" style={{ backgroundColor: '#F5F0EB' }}>
            {/* Sidebar */}
            <aside className="w-64 border-r border-gray-800 hidden md:flex md:flex-col" style={{ backgroundColor: '#111111' }}>
                {/* Logo & Tagline */}
                <div className="p-6">
                    <Logo textSize="text-xl" className="text-white mb-1" showText={true} variant="light" />
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold ml-10">Mastery Engine</p>
                </div>

                {/* Main Navigation */}
                <nav className="px-3 space-y-1 flex-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors ${isActive
                                    ? 'bg-gray-800 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}

                    {/* Add Problem Button */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors text-gray-400 hover:text-white hover:bg-gray-800 w-full text-left"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add Problem
                    </button>
                </nav>

                {/* Bottom Section: Settings + User */}
                <div className="p-3 space-y-2 border-t border-gray-800 pt-6">
                    <Link
                        to="/settings"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors ${location.pathname === '/settings'
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                    >
                        <SettingsIcon className="w-4 h-4" />
                        Settings
                    </Link>

                    {/* Clerk User Button */}
                    <div className="flex items-center gap-3 px-3 py-2.5">
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: 'w-7 h-7',
                                },
                            }}
                        />
                        <span className="text-[13px] font-semibold text-gray-400">Account</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto min-w-0">
                <header className="border-b border-gray-200 md:hidden p-4 flex items-center justify-between" style={{ backgroundColor: '#111111' }}>
                    <Logo textSize="text-lg" className="text-white" showText={true} variant="light" />
                    <UserButton />
                </header>
                <div className="p-6 md:p-10 max-w-6xl mx-auto">
                    {children}
                </div>

                {/* Mobile Bottom Nav */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-800 flex justify-around p-2 z-50" style={{ backgroundColor: '#111111' }}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-bold transition-colors ${isActive
                                    ? 'text-white'
                                    : 'text-gray-500'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        );
                    })}

                    {/* Add Problem Button (mobile) */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-bold transition-colors text-gray-500"
                    >
                        <PlusCircle className="w-5 h-5" />
                        Add Problem
                    </button>

                    <Link
                        to="/settings"
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-bold transition-colors ${location.pathname === '/settings'
                            ? 'text-white'
                            : 'text-gray-500'
                            }`}
                    >
                        <SettingsIcon className="w-5 h-5" />
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
