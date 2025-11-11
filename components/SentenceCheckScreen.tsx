import React, { useState } from 'react';

interface SentenceCheckScreenProps {
  onCheck: (sentence: string) => void;
}

const SentenceCheckScreen: React.FC<SentenceCheckScreenProps> = ({ onCheck }) => {
  const [sentence, setSentence] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sentence.trim()) {
      onCheck(sentence.trim());
    }
  };

  return (
    <div className="w-full p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg animate-fade-in flex flex-col gap-6">
      <div>
        <div className="text-center">
          <p className="text-lg text-slate-400">Enter a Japanese sentence to check:</p>
          <div className="my-4">
            <h3 className="text-2xl font-bold text-white tracking-wider">文章表現チェック</h3>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="ここに文章を入力してください..."
            rows={5}
            className="w-full p-4 bg-slate-900 border-2 border-slate-600 rounded-lg text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
            aria-label="Japanese sentence input"
          />
          <button
            type="submit"
            disabled={!sentence.trim()}
            className="w-full mt-4 px-8 py-3 bg-gradient-to-r from-blue-500 to-teal-400 text-white font-bold rounded-full hover:scale-105 transform transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-teal-300/50 shadow-lg disabled:bg-gray-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:scale-100"
          >
            Check Sentence
          </button>
        </form>
      </div>
    </div>
  );
};

export default SentenceCheckScreen;
