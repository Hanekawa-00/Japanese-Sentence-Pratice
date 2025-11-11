import { HistoryItem, GameMode } from '../types';

const HISTORY_KEY = 'japanesePracticeHistory';

export const getHistory = (): HistoryItem[] => {
  try {
    const historyJson = localStorage.getItem(HISTORY_KEY);
    if (historyJson) {
      return JSON.parse(historyJson);
    }
  } catch (error) {
    console.error('Failed to load history from localStorage:', error);
  }
  return [];
};

export const addHistoryItem = (newItem: HistoryItem): void => {
  try {
    const currentHistory = getHistory();
    // To avoid excessive storage usage, let's cap the history at 100 items
    const newHistory = [newItem, ...currentHistory].slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error('Failed to save history item to localStorage:', error);
  }
};

export const updateHistoryItem = (updatedItem: HistoryItem): void => {
  try {
    const currentHistory = getHistory();
    const newHistory = currentHistory.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error('Failed to update history item in localStorage:', error);
  }
};

export const deleteHistoryItem = (id: string): void => {
  try {
    const currentHistory = getHistory();
    const newHistory = currentHistory.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error('Failed to delete history item from localStorage:', error);
  }
};

export const deleteMultipleHistoryItems = (ids: string[]): void => {
    try {
        const idsToDelete = new Set(ids);
        const currentHistory = getHistory();
        const newHistory = currentHistory.filter(item => !idsToDelete.has(item.id));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
        console.error('Failed to delete multiple history items from localStorage:', error);
    }
};

export const mergeAndSaveHistory = (importedHistory: HistoryItem[]): HistoryItem[] => {
  try {
    if (!Array.isArray(importedHistory)) {
      console.error("Imported data is not an array.");
      return getHistory(); // return current history without changes
    }
    const currentHistory = getHistory();
    // Prioritize existing items by placing them first
    const combinedHistory = [...currentHistory, ...importedHistory];

    const historyMap = new Map<string, HistoryItem>();

    for (const item of combinedHistory) {
      // FIX: The original code incorrectly accessed `chineseSentence` on all `HistoryItem` types.
      // This fix uses the `gameMode` discriminant property to safely access the correct sentence property
      // for validation and creating a deduplication key.
      let mainSentence;
      if (item.gameMode === GameMode.SentenceCheck) {
        mainSentence = item.userSentence;
      } else {
        mainSentence = item.chineseSentence;
      }

      // Basic validation for each item
      if (typeof item.id !== 'string' || typeof item.timestamp !== 'number' || typeof mainSentence !== 'string') {
          console.warn('Skipping invalid item during merge:', item);
          continue;
      }
      const key = `${item.timestamp}-${mainSentence}`;
      // If key doesn't exist, add it. This ensures existing data is kept over imported data in case of a duplicate.
      if (!historyMap.has(key)) {
        historyMap.set(key, item);
      }
    }

    const mergedHistory = Array.from(historyMap.values())
        .sort((a, b) => b.timestamp - a.timestamp);
    
    // Allow a larger history after a merge, capping at 200 items.
    const finalHistory = mergedHistory.slice(0, 200);

    localStorage.setItem(HISTORY_KEY, JSON.stringify(finalHistory));
    return finalHistory;
  } catch (error) {
    console.error('Failed to merge and save history:', error);
    return getHistory(); // Return existing history on error
  }
};
