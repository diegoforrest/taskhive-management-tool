'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Task } from '../../core/domain/entities/Task'

interface SearchContextType {
  searchTerm: string
  setSearchTerm: (term: string) => void
  filteredTasks: Task[]
  setFilteredTasks: (tasks: Task[]) => void
  highlightedTaskId: number | null
  setHighlightedTaskId: (id: number | null) => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [highlightedTaskId, setHighlightedTaskId] = useState<number | null>(null)

  return (
    <SearchContext.Provider value={{
      searchTerm,
      setSearchTerm,
      filteredTasks,
      setFilteredTasks,
      highlightedTaskId,
      setHighlightedTaskId
    }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}