import React, { useState } from 'react';
import { SentenceTask } from '../types';
import { InformationCircleIcon } from './icons/InformationCircleIcon';

interface PracticeScreenProps {
  task: SentenceTask;
  onCheck: (sentence: string) => void;
}

const PracticeScreen: React.FC<PracticeScreenProps> = ({ task, onCheck }) => {
  const [sentence, setSentence] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sentence.trim()) {
      onCheck(sentence.trim());
    }
  };

  return (
    <div className="w-full p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg animate-fade-in flex flex-col gap-6">
      {task.grammarPoint && (
        <div className="p-4 bg-slate-900/40 border border-slate-700 rounded-lg">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="w-6 h-6 text-purple-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-purple-300 font-semibold">文法フォーカス (Grammar Focus)</p>
              <p className="text-lg font-bold text-white mt-1">{task.grammarPoint.grammar_point}</p>
              <p className="text-slate-400 text-sm">{task.grammarPoint.meaning_cn}</p>
            </div>
          </div>
        </div>
      )}
      <div>
        <div className="text-center">
          <p className="text-lg text-slate-400">Translate this sentence into Japanese:</p>
          <div className="my-4 p-4 bg-slate-900/50 rounded-lg">
            <h3 className="text-3xl font-bold text-white tracking-wider">{task.chineseSentence}</h3>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="ここに翻訳を入力してください..."
            rows={4}
            className="w-full p-4 bg-slate-900 border-2 border-slate-600 rounded-lg text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
          />
          <div className="text-center mt-2">
            <button
              type="button"
              onClick={() => onCheck('')}
              className="text-sm text-slate-400 hover:text-teal-300 transition-colors py-1"
            >
              不确定？点击查看答案
            </button>
          </div>
          <button
            type="submit"
            disabled={!sentence.trim()}
            className="w-full mt-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-teal-400 text-white font-bold rounded-full hover:scale-105 transform transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-teal-300/50 shadow-lg disabled:bg-gray-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:scale-100"
          >
            Check Translation
          </button>
        </form>
      </div>
    </div>
  );
};

export default PracticeScreen;
