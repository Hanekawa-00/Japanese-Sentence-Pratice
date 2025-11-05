import React, { useState, useMemo } from 'react';
import { GrammarPoint, Difficulty } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

const difficultyLevels = [Difficulty.N5, Difficulty.N4, Difficulty.N3, Difficulty.N2, Difficulty.N1];

const GrammarCard: React.FC<{ point: GrammarPoint }> = ({ point }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-slate-700 bg-slate-800/50 rounded-lg transition-all duration-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left"
                aria-expanded={isOpen}
            >
                <div className="flex-1 pr-4">
                    <h3 className="font-bold text-lg text-teal-300">{point.grammar_point}</h3>
                    <p className="text-slate-300">{point.meaning_cn}</p>
                </div>
                <ChevronDownIcon className={`w-6 h-6 text-slate-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 border-t border-slate-700 bg-slate-900/30 animate-fade-in">
                    <div className="space-y-4 text-slate-200">
                        <div>
                            <strong className="text-blue-400">用法:</strong>
                            <p className="mt-1 font-mono bg-slate-800 p-2 rounded text-sm whitespace-pre-wrap">{point.usage}</p>
                        </div>
                        <div>
                            <strong className="text-blue-400">例文 (JA):</strong>
                            <p className="mt-1">{point.example_ja}</p>
                        </div>
                         <div>
                            <strong className="text-blue-400">例文 (CN):</strong>
                            <p className="mt-1 text-slate-400">{point.example_cn}</p>
                        </div>
                        <div>
                            <strong className="text-blue-400">ノート:</strong>
                            <p className="mt-1 text-slate-400 whitespace-pre-wrap">{point.note}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface GrammarLibraryProps {
  points: GrammarPoint[];
}

const GrammarLibrary: React.FC<GrammarLibraryProps> = ({ points }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<Difficulty | 'ALL'>('ALL');

    const filteredPoints = useMemo(() => {
        return points
            .filter(point => selectedLevel === 'ALL' || point.level === selectedLevel)
            .filter(point => {
                const search = searchTerm.toLowerCase().trim();
                if (!search) return true;

                const keywords = search.split(/\s+/).filter(Boolean);

                const contentToSearch = [
                    point.grammar_point,
                    point.meaning_cn,
                    point.usage,
                    point.example_ja,
                    point.example_cn,
                    point.note,
                    point.level
                ].join(' ').toLowerCase();

                return keywords.every(keyword => contentToSearch.includes(keyword));
            });
    }, [points, searchTerm, selectedLevel]);

    return (
        <div className="w-full h-full flex flex-col p-4 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg animate-fade-in">
            <header className="mb-4">
                 <h2 className="text-3xl font-bold text-center text-white mb-4">文法ライブラリ</h2>
                 <div className="relative">
                     <input
                        type="text"
                        placeholder="Search grammar (e.g., ～うちに, N3, 意思...)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 pl-10 bg-slate-900 border-2 border-slate-600 rounded-lg text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-colors"
                     />
                     <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                 </div>
                 <div className="flex justify-center gap-2 md:gap-3 flex-wrap mt-4">
                    <button
                        onClick={() => setSelectedLevel('ALL')}
                        className={`px-4 py-2 font-semibold rounded-full transition-all duration-200 border-2 ${selectedLevel === 'ALL' ? 'bg-purple-400 border-purple-400 text-gray-900 shadow-lg' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500'}`}
                    >
                        All
                    </button>
                    {difficultyLevels.map(level => (
                        <button
                            key={level}
                            onClick={() => setSelectedLevel(level)}
                            className={`px-4 py-2 font-semibold rounded-full transition-all duration-200 border-2 ${selectedLevel === level ? 'bg-purple-400 border-purple-400 text-gray-900 shadow-lg' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500'}`}
                        >
                        {level}
                        </button>
                    ))}
                 </div>
            </header>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                 {filteredPoints.length > 0 ? (
                    filteredPoints.map((point, index) => <GrammarCard key={`${point.grammar_point}-${index}`} point={point} />)
                ) : (
                    <p className="text-center text-slate-400 mt-8">検索条件に一致する文法項目は見つかりませんでした。</p>
                )}
            </div>
        </div>
    );
};

export default GrammarLibrary;