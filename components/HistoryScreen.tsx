import React, { useState, useEffect } from 'react';
import { HistoryItem, GameMode, TranslationHistoryItem, MultipleChoiceHistoryItem } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import MarkdownRenderer from './MarkdownRenderer';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';
import { generateSpeech, decode, decodeAudioData } from '../services/geminiService';
import { ImportIcon } from './icons/ImportIcon';
import { ExportIcon } from './icons/ExportIcon';
import { TrashIcon } from './icons/TrashIcon';

const getScoreColorClasses = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (score >= 50) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
};

interface TranslationHistoryCardProps {
    item: TranslationHistoryItem;
    onUpdate: (item: TranslationHistoryItem) => void;
    onDelete: (id: string) => void;
    selectionMode: boolean;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
}

const TranslationHistoryCard: React.FC<TranslationHistoryCardProps> = ({ item, onUpdate, onDelete, selectionMode, isSelected, onToggleSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    useEffect(() => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext({ sampleRate: 24000 });
            setAudioContext(ctx);

            return () => {
                ctx.close().catch(console.error);
            };
        }
    }, []);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
            onDelete(item.id);
        }
    };
    
    const handleMainAction = () => {
        if (selectionMode) {
            onToggleSelect(item.id);
        } else {
            setIsOpen(prev => !prev);
        }
    };

    const handlePlayAudio = async () => {
        if (isAudioLoading || !audioContext) return;
        setIsAudioLoading(true);

        try {
            let audioToPlay = item.audioBase64;
            
            if (!audioToPlay) {
                const newAudioBase64 = await generateSpeech(item.correctedSentence);
                if (newAudioBase64) {
                    audioToPlay = newAudioBase64;
                    const updatedItem = { ...item, audioBase64: newAudioBase64 };
                    onUpdate(updatedItem);
                } else {
                    throw new Error("Audio generation returned null.");
                }
            }
            
            if (audioToPlay) {
                const audioData = decode(audioToPlay);
                const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start();
                source.onended = () => setIsAudioLoading(false);
            } else {
                 setIsAudioLoading(false);
            }
        } catch (error) {
            console.error("Failed to generate or play audio from history:", error);
            setIsAudioLoading(false);
        }
    };

    const colorClasses = getScoreColorClasses(item.score);

    return (
        <div className={`border rounded-lg transition-all duration-200 ${isSelected ? 'border-blue-500 bg-slate-700/60' : 'border-slate-700 bg-slate-800/50'}`}>
            <div role="button" onClick={handleMainAction} className={`w-full flex items-center p-4 text-left ${selectionMode ? 'cursor-pointer' : ''}`} aria-expanded={!selectionMode && isOpen}>
                {selectionMode && (
                    <div className="mr-4 flex-shrink-0">
                         <div className={`w-6 h-6 border-2 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-400' : 'border-slate-500 bg-slate-700'}`}>
                            {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                        </div>
                    </div>
                )}
                <div className="flex-1 pr-4 min-w-0">
                    <p className="text-sm text-slate-400">{new Date(item.timestamp).toLocaleString()}</p>
                    <p className="font-semibold text-lg text-slate-200 mt-1 truncate">{item.chineseSentence}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className={`w-12 h-7 flex items-center justify-center rounded-md border ${colorClasses}`}>
                        <span className="font-bold">{item.score}</span>
                    </div>
                    {!selectionMode && <ChevronDownIcon className={`w-6 h-6 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />}
                </div>
            </div>
            {!selectionMode && isOpen && (
                <div className="p-4 border-t border-slate-700 bg-slate-900/30 space-y-4 text-slate-300 animate-fade-in">
                    <div><strong className="text-slate-400">Your Answer:</strong> <p className="p-2 bg-slate-800 rounded mt-1">{item.userSentence || '(No answer provided)'}</p></div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <strong className="text-slate-400">Correct Answer:</strong>
                             <button
                                onClick={handlePlayAudio}
                                disabled={isAudioLoading}
                                className="p-1.5 rounded-full text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-wait"
                                aria-label="Play corrected sentence audio"
                            >
                                {isAudioLoading 
                                    ? <div className="w-5 h-5 border-2 border-t-2 border-gray-400 border-t-white rounded-full animate-spin"></div> 
                                    : <SpeakerWaveIcon className="w-5 h-5" />
                                }
                            </button>
                        </div>
                        <p className="p-2 bg-slate-800 rounded">{item.correctedSentence}</p>
                    </div>
                    <div><strong className="text-slate-400">Explanation:</strong> <div className="p-2 bg-slate-800 rounded mt-1"><MarkdownRenderer markdown={item.feedbackExplanation} /></div></div>
                    {item.grammarPoint && <p className="text-sm text-purple-30_0"><strong>Grammar Focus:</strong> {item.grammarPoint.grammar_point}</p>}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                        <p className="text-xs text-slate-500">{item.difficulty} | {item.sentenceLength} | Translation</p>
                        <button onClick={handleDelete} className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors p-1 rounded-md hover:bg-red-500/10">
                            <TrashIcon className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

interface MultipleChoiceHistoryCardProps {
    item: MultipleChoiceHistoryItem;
    onUpdate: (item: MultipleChoiceHistoryItem) => void;
    onDelete: (id: string) => void;
    selectionMode: boolean;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
}

const MultipleChoiceHistoryCard: React.FC<MultipleChoiceHistoryCardProps> = ({ item, onUpdate, onDelete, selectionMode, isSelected, onToggleSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isCorrect = item.userChoiceIndex === item.correctOptionIndex;
    const [audioLoading, setAudioLoading] = useState<Record<number, boolean>>({});
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    
    useEffect(() => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext({ sampleRate: 24000 });
            setAudioContext(ctx);
            return () => { ctx.close().catch(console.error); };
        }
    }, []);
    
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
            onDelete(item.id);
        }
    };
    
     const handleMainAction = () => {
        if (selectionMode) {
            onToggleSelect(item.id);
        } else {
            setIsOpen(prev => !prev);
        }
    };


    const handlePlayAudio = async (index: number, text: string) => {
        if (audioLoading[index] || !audioContext) return;

        const currentAudios = item.audiosBase64 || new Array(item.options.length).fill(null);

        if (currentAudios[index]) {
             try {
                const audioData = decode(currentAudios[index] as string);
                const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start();
            } catch (error) {
                console.error("Failed to play cached audio from history:", error);
            }
            return;
        }

        setAudioLoading(prev => ({ ...prev, [index]: true }));
        try {
            const base64Audio = await generateSpeech(text);
            if (base64Audio) {
                const audioData = decode(base64Audio);
                const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start();

                const newAudios = [...currentAudios];
                newAudios[index] = base64Audio;

                const updatedItem = { ...item, audiosBase64: newAudios };
                onUpdate(updatedItem);
            }
        } catch (error) {
            console.error("Failed to generate or play audio:", error);
        } finally {
            setAudioLoading(prev => ({ ...prev, [index]: false }));
        }
    };


    return (
        <div className={`border rounded-lg transition-all duration-200 ${isSelected ? 'border-blue-500 bg-slate-700/60' : 'border-slate-700 bg-slate-800/50'}`}>
            <div role="button" onClick={handleMainAction} className={`w-full flex items-center p-4 text-left ${selectionMode ? 'cursor-pointer' : ''}`} aria-expanded={!selectionMode && isOpen}>
                 {selectionMode && (
                    <div className="mr-4 flex-shrink-0">
                        <div className={`w-6 h-6 border-2 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-400' : 'border-slate-500 bg-slate-700'}`}>
                            {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                        </div>
                    </div>
                )}
                <div className="flex-1 pr-4 min-w-0">
                    <p className="text-sm text-slate-400">{new Date(item.timestamp).toLocaleString()}</p>
                    <p className="font-semibold text-lg text-slate-200 mt-1 truncate">{item.chineseSentence}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {isCorrect ? <CheckCircleIcon className="w-6 h-6 text-green-400" /> : <XCircleIcon className="w-6 h-6 text-red-400" />}
                    {!selectionMode && <ChevronDownIcon className={`w-6 h-6 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />}
                </div>
            </div>
            {!selectionMode && isOpen && (
                <div className="p-4 border-t border-slate-700 bg-slate-900/30 space-y-4 text-slate-300 animate-fade-in">
                    <div className="space-y-2">
                        {item.options.map((option, index) => {
                             const isUserChoice = index === item.userChoiceIndex;
                             const isCorrectChoice = index === item.correctOptionIndex;
                             let styleClasses = 'border-slate-700';
                             if(isCorrectChoice) styleClasses = 'border-green-500 bg-green-900/30 text-white';
                             else if(isUserChoice && !isCorrectChoice) styleClasses = 'border-red-500 bg-red-900/30 text-white';

                            return (
                                <div key={index} className={`flex items-center justify-between gap-2 p-2 border rounded ${styleClasses}`}>
                                    <span className="flex-grow">{option}</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isCorrectChoice && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
                                        {isUserChoice && !isCorrectChoice && <XCircleIcon className="w-5 h-5 text-red-400" />}
                                        <button
                                            onClick={() => handlePlayAudio(index, option)}
                                            disabled={audioLoading[index]}
                                            className="p-1.5 rounded-full text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-wait"
                                            aria-label={`Play audio for: ${option}`}
                                        >
                                            {audioLoading[index] 
                                                ? <div className="w-5 h-5 border-2 border-t-2 border-gray-400 border-t-white rounded-full animate-spin"></div> 
                                                : <SpeakerWaveIcon className="w-5 h-5" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div><strong className="text-slate-400">Explanation:</strong> <div className="p-2 bg-slate-800 rounded mt-1"><MarkdownRenderer markdown={item.mcqExplanation} /></div></div>
                    {item.grammarPoint && <p className="text-sm text-purple-300"><strong>Grammar Focus:</strong> {item.grammarPoint.grammar_point}</p>}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                      <p className="text-xs text-slate-500">{item.difficulty} | {item.sentenceLength} | Multiple Choice</p>
                      <button onClick={handleDelete} className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors p-1 rounded-md hover:bg-red-500/10">
                          <TrashIcon className="w-4 h-4" />
                          Delete
                      </button>
                    </div>
                </div>
            )}
        </div>
    );
};


interface HistoryScreenProps {
  history: HistoryItem[];
  onUpdateHistoryItem: (item: HistoryItem) => void;
  onImportHistory: (data: HistoryItem[]) => void;
  onDeleteItem: (id: string) => void;
  onDeleteMultipleItems: (ids: string[]) => void;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ history, onUpdateHistoryItem, onImportHistory, onDeleteItem, onDeleteMultipleItems }) => {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleToggleSelectionMode = () => {
        setSelectionMode(prev => !prev);
        setSelectedIds(new Set()); // Reset selection when toggling mode
    };
    
    const handleToggleItemSelection = (id: string) => {
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
        } else {
            newSelectedIds.add(id);
        }
        setSelectedIds(newSelectedIds);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === history.length) {
            setSelectedIds(new Set()); // Deselect all
        } else {
            setSelectedIds(new Set(history.map(item => item.id))); // Select all
        }
    };
    
    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedIds.size} selected records? This action cannot be undone.`)) {
            onDeleteMultipleItems(Array.from(selectedIds));
            setSelectionMode(false);
            setSelectedIds(new Set());
        }
    };

    const handleExport = () => {
        if (history.length === 0) {
            alert("No history to export.");
            return;
        };
        try {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(history, null, 2)
            )}`;
            const link = document.createElement("a");
            link.href = jsonString;
            const date = new Date().toISOString().split('T')[0];
            link.download = `japanese_practice_history_${date}.json`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to export history:", error);
            alert("An error occurred while exporting the history.");
        }
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("Failed to read file content.");
                }
                const data = JSON.parse(text);
                
                if (Array.isArray(data)) {
                    onImportHistory(data as HistoryItem[]);
                    alert(`Import complete. New and existing history has been merged.`);
                } else {
                    throw new Error("Invalid history file format. The file should contain an array of history items.");
                }
            } catch (error) {
                console.error("Failed to import history:", error);
                alert(`Failed to import history: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        };
        reader.onerror = () => {
             alert('Failed to read the file.');
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input to allow importing the same file again
    };

  return (
    <div className="w-full h-full flex flex-col p-4 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg animate-fade-in">
      <header className="mb-4 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-white">練習履歴</h2>
            {selectionMode && <span className="text-slate-400 font-medium">{selectedIds.size} selected</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            {selectionMode ? (
                <>
                    <button 
                        onClick={handleSelectAll} 
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-colors shadow-md"
                    >
                        {selectedIds.size === history.length && history.length > 0 ? 'Deselect All' : 'Select All'}
                    </button>
                    <button 
                        onClick={handleDeleteSelected} 
                        disabled={selectedIds.size === 0}
                        aria-label="Delete selected items"
                        className="p-2 bg-red-600/80 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors shadow-md disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={handleToggleSelectionMode} 
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-colors shadow-md"
                    >
                        Cancel
                    </button>
                </>
            ) : (
                <>
                    <label className="cursor-pointer px-4 py-2 bg-sky-600/80 hover:bg-sky-500 text-white font-semibold rounded-lg transition-colors shadow-md flex items-center">
                        <ImportIcon className="w-5 h-5 mr-2" />
                        <span>Import</span>
                        <input type="file" className="hidden" accept=".json" onChange={handleFileImport} />
                    </label>
                    <button 
                        onClick={handleExport}
                        disabled={history.length === 0}
                        className="px-4 py-2 bg-teal-600/80 hover:bg-teal-500 text-white font-semibold rounded-lg transition-colors shadow-md flex items-center disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                        <ExportIcon className="w-5 h-5 mr-2" />
                        <span>Export</span>
                    </button>
                    {history.length > 0 && (
                        <button 
                            onClick={handleToggleSelectionMode} 
                            className="px-4 py-2 bg-blue-600/80 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors shadow-md"
                        >
                            Select
                        </button>
                    )}
                </>
            )}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {history.length > 0 ? (
          history.map(item => {
            const cardProps = {
                key: item.id,
                selectionMode,
                isSelected: selectedIds.has(item.id),
                onToggleSelect: handleToggleItemSelection,
                onUpdate: onUpdateHistoryItem,
                onDelete: onDeleteItem,
            };
            if (item.gameMode === GameMode.Translation) {
              return <TranslationHistoryCard item={item as TranslationHistoryItem} {...cardProps} />;
            }
            return <MultipleChoiceHistoryCard item={item as MultipleChoiceHistoryItem} {...cardProps} />;
          })
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-center text-slate-400 text-lg">
                練習履歴はありません。
                <br />
                Start a new practice session to see your history here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryScreen;