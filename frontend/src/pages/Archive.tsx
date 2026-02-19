import { Link } from 'react-router-dom';
import { Archive as ArchiveIcon } from 'lucide-react';
// import { useProblems } from '../hooks/useProblems';

const Archive: React.FC = () => {
    // const { data: allProblems = [], isLoading } = useProblems();
    const isLoading = false;

    // In this app, "archived" is a state where the problem exists in the archive but is not scheduled.
    // However, looking at the backend/current implementation, we don't have a strict "is_archived" flag in the Problem interface yet.
    // Based on the spec, retired problems are moved to the vault.

    // For now, let's assume archived problems are those that have been explicitly archived.
    // I need to check the API for archiving.

    // const archivedProblems = allProblems.filter(p => (p as any).is_archived); // Logic based on future backend support

    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
                <div className="animate-spin w-6 h-6 border-2 border-gray-200 border-t-green-500 rounded-full" />
            </div>
        );
    }
    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-12">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">The Vault</h1>
                <p className="text-[15px] font-medium text-gray-400">Your collection of mastered concepts and retired problems.</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm border-dashed py-32 flex flex-col items-center justify-center text-center px-10">
                <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-8 border border-gray-100">
                    <ArchiveIcon className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">The Vault is empty</h3>
                <p className="text-sm font-medium text-gray-400 max-w-sm">
                    Problems you retire from your active library will appear here for historical reference.
                </p>
                <div className="mt-10">
                    <Link to="/" className="text-[11px] font-black text-green-600 uppercase tracking-widest hover:text-green-700 transition-colors">
                        Return to Library
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Archive;
