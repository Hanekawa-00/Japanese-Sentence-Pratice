import React, { useState, useEffect } from 'react';
import { MultipleChoiceTask } from '../types';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import MarkdownRenderer from './MarkdownRenderer';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';
import { generateSpeech, decode, decodeAudioData } from '../services/geminiService';

interface MultipleChoiceScreenProps {
  task: MultipleChoiceTask;
  onNext: () => void;
  onComplete: (userChoiceIndex: number, audios: (string | null)[]) => void;
}

const MultipleChoiceScreen: React.FC<MultipleChoiceScreenProps> = ({ task, onNext, onComplete }) => {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [audioLoading, setAudioLoading] = useState<Record<number, boolean>>({});
  const [audioCache, setAudioCache] = useState<(string | null)[]>(() => new Array(task.options.length).fill(null));
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext once.
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if(AudioContext) {
      const ctx = new AudioContext({ sampleRate: 24000 });
      setAudioContext(ctx);
      return () => { ctx.close().catch(console.error); };
    }
  }, []);


  const handleOptionClick = (index: number) => {
    if (selectedOptionIndex === null) {
      setSelectedOptionIndex(index);
      onComplete(index, audioCache);
    }
  };

  const handlePlayAudio = async (index: number, text: string) => {
    if (audioLoading[index] || !audioContext) return;

    if (audioCache[index]) {
      try {
        const audioData = decode(audioCache[index] as string);
        const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      } catch(e) { console.error("Error playing cached audio", e); }
      return;
    }

    setAudioLoading(prev => ({ ...prev, [index]: true }));
    try {
      const base64Audio = await generateSpeech(text);
      if (base64Audio) {
        setAudioCache(prev => {
            const newCache = [...prev];
            newCache[index] = base64Audio;
            return newCache;
        });
        const audioData = decode(base64Audio);
        const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      }
    } catch (error) {
      console.error("Failed to generate or play audio:", error);
    } finally {
      setAudioLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  const getButtonClass = (index: number) => {
    if (selectedOptionIndex === null) {
      return 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50 hover:border-blue-500';
    }

    const isCorrect = index === task.correctOptionIndex;
    const isSelected = index === selectedOptionIndex;

    if (isCorrect) {
      return 'bg-green-800/60 border-green-500 text-white';
    }
    if (isSelected && !isCorrect) {
      return 'bg-red-800/60 border-red-500 text-white';
    }
    return 'bg-slate-800/50 border-slate-700 text-slate-400 opacity-70';
  };
  
  return (
    <div className="w-full p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg animate-fade-in flex flex-col gap-6">
      <div>
        <div className="text-center">
          <p className="text-lg text-slate-400">Choose the most natural translation:</p>
          <div className="my-4 p-4 bg-slate-900/50 rounded-lg">
            <h3 className="text-3xl font-bold text-white tracking-wider">{task.chineseSentence}</h3>
          </div>
        </div>

        <div className="space-y-3">
          {task.options.map((option, index) => (
             <div 
              key={index} 
              className={`flex items-center gap-2 rounded-lg border-2 transition-all duration-200 ${getButtonClass(index)} ${selectedOptionIndex === null ? 'cursor-pointer' : 'cursor-default'}`} 
              onClick={() => handleOptionClick(index)}
            >
              <div
                className="flex-grow text-left p-4 font-medium"
                aria-label={`Select option: ${option}`}
              >
                  <span className="text-lg">{option}</span>
              </div>
              <div className="flex items-center pr-2 shrink-0">
                  {selectedOptionIndex !== null && index === task.correctOptionIndex && <CheckCircleIcon className="w-6 h-6 text-green-400" />}
                  {selectedOptionIndex !== null && selectedOptionIndex === index && index !== task.correctOptionIndex && <XCircleIcon className="w-6 h-6 text-red-400" />}
              </div>
              <button
                  onClick={(e) => {
                      e.stopPropagation();
                      handlePlayAudio(index, option);
                  }}
                  disabled={audioLoading[index]}
                  className="p-3 text-slate-300 hover:text-white disabled:text-slate-500 disabled:cursor-wait"
                  aria-label={`Play audio for: ${option}`}
              >
                  {audioLoading[index] 
                      ? <div className="w-6 h-6 border-2 border-t-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
                      : <SpeakerWaveIcon className="w-6 h-6" />
                  }
              </button>
            </div>
          ))}
        </div>
        
        {selectedOptionIndex === null && (
          <div className="text-center pt-2">
              <button
                onClick={() => {
                  setSelectedOptionIndex(task.correctOptionIndex);
                  onComplete(-1, audioCache); // Use -1 to denote skipping
                }}
                className="text-sm text-slate-400 hover:text-teal-300 transition-colors py-1"
              >
                不确定？点击查看答案
              </button>
          </div>
        )}
      </div>

      {selectedOptionIndex !== null && (
        <>
            {task.grammarPoint && (
                <div className="p-4 bg-slate-900/40 border border-slate-700 rounded-lg animate-fade-in">
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
            <div className="p-4 rounded-lg bg-blue-900/50 border border-blue-500/50 animate-fade-in">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <LightBulbIcon className="w-6 h-6 text-yellow-300" />
                    讲解 (Explanation)
                </h3>
                <div className="text-slate-200 mt-3">
                    <MarkdownRenderer markdown={task.explanation} />
                </div>
            </div>
            <button
                onClick={onNext}
                className="w-full px-8 py-3 bg-gradient-to-r from-blue-500 to-teal-400 text-white font-bold rounded-full hover:scale-105 transform transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-teal-300/50 shadow-lg"
            >
                次の問題 (Next Question)
            </button>
        </>
      )}
    </div>
  );
};

export default MultipleChoiceScreen;