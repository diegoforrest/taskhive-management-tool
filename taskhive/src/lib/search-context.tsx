"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Task } from '@/core/domain/entities/Task';

interface SearchContextType {
  highlightedTaskId: number | null;
  setHighlightedTaskId: (id: number | null) => void;
  searchResults: Task[];
  setSearchResults: (tasks: Task[]) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [highlightedTaskId, setHighlightedTaskId] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<Task[]>([]);

  return (
    <SearchContext.Provider value={{
      highlightedTaskId,
      setHighlightedTaskId,
      searchResults,
      setSearchResults
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
