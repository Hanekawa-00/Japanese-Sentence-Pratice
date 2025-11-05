import React, { useState, useCallback, useEffect } from 'react';
import { GameState, SentenceTask, Feedback, Difficulty, GameMode, MultipleChoiceTask, SentenceLength, GrammarPoint, HistoryItem, TranslationHistoryItem, MultipleChoiceHistoryItem } from './types';
import { generateSentenceTask, generateMultipleChoiceTask, getGrammarPoints } from './services/geminiService';
import { getHistory, addHistoryItem, updateHistoryItem, mergeAndSaveHistory, deleteHistoryItem, deleteMultipleHistoryItems } from './services/historyService';
import WelcomeScreen from './components/WelcomeScreen';
import PracticeScreen from './components/PracticeScreen';
import FeedbackDisplay from './components/FeedbackDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import MultipleChoiceScreen from './components/MultipleChoiceScreen';
import { HomeIcon } from './components/icons/HomeIcon';
import GrammarLibrary from './components/GrammarLibrary';
import HistoryScreen from './components/HistoryScreen';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Welcome);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.N3);
  const [sentenceLength, setSentenceLength] = useState<SentenceLength>(SentenceLength.Medium);

  // Translation mode states
  const [currentTask, setCurrentTask] = useState<SentenceTask | null>(null);
  const [userSentence, setUserSentence] = useState('');

  // Multiple choice mode states
  const [mcqTask, setMcqTask] = useState<MultipleChoiceTask | null>(null);
  
  // Grammar library state
  const [grammarPoints, setGrammarPoints] = useState<GrammarPoint[]>([]);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Shared states
  const [error, setError] = useState<string | null>(null);

  // Load history on initial render
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleGoHome = () => {
    setGameState(GameState.Welcome);
    setGameMode(null);
    setCurrentTask(null);
    setUserSentence('');
    setMcqTask(null);
    setError(null);
  };
  
  const handleStartPractice = useCallback(async (selectedDifficulty: Difficulty, selectedLength: SentenceLength, selectedMode: GameMode) => {
    setDifficulty(selectedDifficulty);
    setSentenceLength(selectedLength);
    setGameMode(selectedMode);
    setGameState(GameState.Loading);
    setError(null);
    try {
      if (selectedMode === GameMode.Translation) {
        const task = await generateSentenceTask(selectedDifficulty, selectedLength);
        setCurrentTask(task);
      } else {
        const task = await generateMultipleChoiceTask(selectedDifficulty, selectedLength);
        setMcqTask(task);
      }
      setGameState(GameState.Practicing);
    } catch (err) {
      setError('Failed to fetch a new task. Please try again.');
      setGameState(GameState.Welcome);
    }
  }, []);

  const handleNextPractice = useCallback(async () => {
    setGameState(GameState.Loading);
    setError(null);
    setCurrentTask(null);
    setUserSentence('');
    setMcqTask(null);

    try {
      if (gameMode === GameMode.Translation) {
        const task = await generateSentenceTask(difficulty, sentenceLength);
        setCurrentTask(task);
      } else if (gameMode === GameMode.MultipleChoice) {
        const task = await generateMultipleChoiceTask(difficulty, sentenceLength);
        setMcqTask(task);
      }
      setGameState(GameState.Practicing);
    } catch (err) {
      setError('Failed to fetch the next task. Please try again.');
      // Go back to welcome if fetching fails from a feedback screen
      setGameState(GameState.Welcome);
    }
  }, [difficulty, gameMode, sentenceLength]);

  const handleSubmission = (sentence: string) => {
    setUserSentence(sentence);
    setGameState(GameState.Feedback);
  };

  const handleViewGrammar = useCallback(async () => {
    setGameState(GameState.Loading);
    setError(null);
    try {
      // Fetch only if not already loaded
      if (grammarPoints.length === 0) {
        const points = await getGrammarPoints();
        setGrammarPoints(points);
      }
      setGameState(GameState.Grammar);
    } catch (err) {
      setError('文法ライブラリの読み込みに失敗しました。もう一度お試しください。');
      setGameState(GameState.Welcome);
    }
  }, [grammarPoints]);
  
  const handleViewHistory = () => {
    setGameState(GameState.History);
  };
  
  const handleImportHistory = useCallback((importedData: HistoryItem[]) => {
    const mergedHistory = mergeAndSaveHistory(importedData);
    setHistory(mergedHistory);
  }, []);
  
  const handleDeleteHistoryItem = useCallback((id: string) => {
    deleteHistoryItem(id);
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);
  
  const handleDeleteMultipleHistoryItems = useCallback((ids: string[]) => {
      deleteMultipleHistoryItems(ids);
      const idsToDelete = new Set(ids);
      setHistory(prev => prev.filter(item => !idsToDelete.has(item.id)));
  }, []);


  const handleUpdateHistoryItem = useCallback((updatedItem: HistoryItem) => {
    updateHistoryItem(updatedItem);
    setHistory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  }, []);

  const handleTranslationComplete = useCallback((feedback: Feedback, audioBase64: string | null) => {
      if (!currentTask) return;
      const newHistoryItem: TranslationHistoryItem = {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          gameMode: GameMode.Translation,
          difficulty,
          sentenceLength,
          chineseSentence: currentTask.chineseSentence,
          userSentence,
          score: feedback.score,
          evaluation: feedback.evaluation,
          correctedSentence: feedback.correctedSentence,
          feedbackExplanation: feedback.explanation,
          grammarPoint: currentTask.grammarPoint,
          audioBase64: audioBase64 ?? undefined,
      };
      addHistoryItem(newHistoryItem);
      setHistory(prevHistory => [newHistoryItem, ...prevHistory]);
  }, [currentTask, userSentence, difficulty, sentenceLength]);

  const handleMcqComplete = useCallback((userChoiceIndex: number, audiosBase64: (string | null)[]) => {
    if (!mcqTask) return;
    const newHistoryItem: MultipleChoiceHistoryItem = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      gameMode: GameMode.MultipleChoice,
      difficulty,
      sentenceLength,
      chineseSentence: mcqTask.chineseSentence,
      options: mcqTask.options,
      userChoiceIndex,
      correctOptionIndex: mcqTask.correctOptionIndex,
      mcqExplanation: mcqTask.explanation,
      grammarPoint: mcqTask.grammarPoint,
      audiosBase64: audiosBase64.some(a => a) ? audiosBase64 : undefined,
    };
    addHistoryItem(newHistoryItem);
    setHistory(prevHistory => [newHistoryItem, ...prevHistory]);
  }, [mcqTask, difficulty, sentenceLength]);


  const renderGameState = () => {
    switch (gameState) {
      case GameState.Loading:
        return <LoadingSpinner />;
      case GameState.Welcome:
        return <WelcomeScreen onStart={handleStartPractice} onViewGrammar={handleViewGrammar} onViewHistory={handleViewHistory} />;
      case GameState.Practicing:
        if (gameMode === GameMode.Translation && currentTask) {
          return <PracticeScreen task={currentTask} onCheck={handleSubmission} />;
        }
        if (gameMode === GameMode.MultipleChoice && mcqTask) {
          return <MultipleChoiceScreen task={mcqTask} onNext={handleNextPractice} onComplete={handleMcqComplete} />;
        }
        // Fallback if task isn't loaded for some reason
        handleNextPractice();
        return <LoadingSpinner />;
      case GameState.Feedback:
         if (gameMode === GameMode.Translation && currentTask) {
            return <FeedbackDisplay
              task={currentTask}
              userSentence={userSentence}
              onNext={handleNextPractice}
              onComplete={handleTranslationComplete}
            />;
         }
         // Fallback for MCQ or if translation feedback is missing
         setGameState(GameState.Welcome);
         return <WelcomeScreen onStart={handleStartPractice} onViewGrammar={handleViewGrammar} onViewHistory={handleViewHistory}/>;
      case GameState.Grammar:
        return <GrammarLibrary points={grammarPoints} />;
      case GameState.History:
        return <HistoryScreen history={history} onUpdateHistoryItem={handleUpdateHistoryItem} onImportHistory={handleImportHistory} onDeleteItem={handleDeleteHistoryItem} onDeleteMultipleItems={handleDeleteMultipleHistoryItems} />;
      default:
        return <WelcomeScreen onStart={handleStartPractice} onViewGrammar={handleViewGrammar} onViewHistory={handleViewHistory}/>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 pt-20 bg-gradient-to-br from-gray-900 to-slate-800">
       {gameState !== GameState.Welcome && (
            <button
                onClick={handleGoHome}
                className="fixed z-50 top-5 left-4 p-2 rounded-full bg-slate-800/50 backdrop-blur-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-all duration-200 shadow-lg"
                aria-label="Back to Home"
            >
              <HomeIcon className="w-6 h-6" />
            </button>
        )}
       <header className="absolute top-0 left-0 w-full p-4 flex justify-center items-center">
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 tracking-tight">
             Japanese Sentence Practice AI
          </h1>
       </header>
       <main className={`w-full ${gameState === GameState.Grammar || gameState === GameState.History ? 'max-w-4xl' : 'max-w-2xl'} flex-grow flex ${gameState === GameState.Grammar || gameState === GameState.History ? 'items-stretch' : 'items-center'} justify-center pb-8`}>
          {renderGameState()}
       </main>
       {error && <div className="absolute bottom-4 bg-red-500/90 text-white py-2 px-4 rounded-md shadow-lg animate-fade-in">{error}</div>}
       <footer className="fixed bottom-0 left-0 w-full p-2 text-center text-gray-500 text-sm bg-gray-900">
        <p>Powered by Gemini AI</p>
       </footer>
    </div>
  );
};

export default App;