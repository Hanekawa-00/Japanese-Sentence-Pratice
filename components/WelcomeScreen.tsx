import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { Difficulty, GameMode, SentenceLength } from '../types';
import { LibraryIcon } from './icons/LibraryIcon';
import { ClockIcon } from './icons/ClockIcon';

interface WelcomeScreenProps {
  onStart: (difficulty: Difficulty, length: SentenceLength, mode: GameMode) => void;
  onViewGrammar: () => void;
  onViewHistory: () => void;
}

const difficultyLevels = [Difficulty.N5, Difficulty.N4, Difficulty.N3, Difficulty.N2, Difficulty.N1];
const sentenceLengths = [SentenceLength.Short, SentenceLength.Medium, SentenceLength.Long];


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, onViewGrammar, onViewHistory }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [selectedLength, setSelectedLength] = useState<SentenceLength | null>(null);

  return (
    <div className="text-center p-8 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg animate-fade-in">
      <SparklesIcon className="w-16 h-16 mx-auto text-teal-300 mb-4" />
      <h2 className="text-4xl font-bold mb-2 text-white">AI Japanese Practice</h2>
      <p className="text-lg text-slate-300 mb-6">Choose your level, sentence length, and practice mode.</p>
      
      <div className="mb-6">
        <p className="text-slate-300 mb-4">1. Choose your JLPT level:</p>
        <div className="flex justify-center gap-2 md:gap-4 flex-wrap">
          {difficultyLevels.map(level => (
            <button
              key={level}
              onClick={() => setSelectedDifficulty(level)}
              className={`px-4 py-2 font-semibold rounded-full transition-all duration-200 border-2 
                ${selectedDifficulty === level 
                  ? 'bg-teal-400 border-teal-400 text-gray-900 shadow-lg' 
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500'}`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-slate-300 mb-4">2. Choose sentence length:</p>
        <div className="flex justify-center gap-2 md:gap-4 flex-wrap">
          {sentenceLengths.map(length => (
            <button
              key={length}
              onClick={() => setSelectedLength(length)}
              disabled={!selectedDifficulty}
              className={`px-4 py-2 w-16 font-semibold rounded-full transition-all duration-200 border-2 disabled:opacity-50 disabled:cursor-not-allowed
                ${selectedLength === length 
                  ? 'bg-blue-400 border-blue-400 text-gray-900 shadow-lg' 
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500 disabled:hover:border-slate-600'}`}
            >
              {length}
            </button>
          ))}
        </div>
      </div>


      <div className="mb-4">
        <p className="text-slate-300 mb-4">3. Choose your practice mode:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
                onClick={() => selectedDifficulty && selectedLength && onStart(selectedDifficulty, selectedLength, GameMode.Translation)}
                disabled={!selectedDifficulty || !selectedLength}
                className="group flex flex-col items-center justify-center p-6 bg-slate-700/50 border-2 border-slate-600 rounded-lg text-slate-300 hover:bg-slate-600/50 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-600 transition-all duration-200"
            >
                <BookOpenIcon className="w-10 h-10 mb-2 text-blue-400 group-hover:text-blue-300 transition-colors"/>
                <span className="font-semibold">翻译练习</span>
                <span className="text-sm text-slate-400">Translation</span>
            </button>
             <button
                onClick={() => selectedDifficulty && selectedLength && onStart(selectedDifficulty, selectedLength, GameMode.MultipleChoice)}
                disabled={!selectedDifficulty || !selectedLength}
                className="group flex flex-col items-center justify-center p-6 bg-slate-700/50 border-2 border-slate-600 rounded-lg text-slate-300 hover:bg-slate-600/50 hover:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-600 transition-all duration-200"
            >
                <QuestionMarkCircleIcon className="w-10 h-10 mb-2 text-teal-400 group-hover:text-teal-300 transition-colors"/>
                <span className="font-semibold">选择题测验</span>
                 <span className="text-sm text-slate-400">Multiple Choice</span>
            </button>
        </div>
      </div>

       <div className="mt-6 border-t border-slate-700 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
            onClick={onViewGrammar}
            className="group w-full flex items-center justify-center gap-3 p-4 bg-slate-700/50 border-2 border-slate-600 rounded-lg text-slate-300 hover:bg-slate-600/50 hover:border-purple-500 transition-all duration-200"
        >
            <LibraryIcon className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors"/>
            <div>
                <span className="font-semibold text-lg">文法ライブラリ</span>
                <p className="text-sm text-slate-400">Grammar Library</p>
            </div>
        </button>
         <button
            onClick={onViewHistory}
            className="group w-full flex items-center justify-center gap-3 p-4 bg-slate-700/50 border-2 border-slate-600 rounded-lg text-slate-300 hover:bg-slate-600/50 hover:border-sky-500 transition-all duration-200"
        >
            <ClockIcon className="w-8 h-8 text-sky-400 group-hover:text-sky-300 transition-colors"/>
            <div>
                <span className="font-semibold text-lg">練習履歴</span>
                <p className="text-sm text-slate-400">Practice History</p>
            </div>
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
