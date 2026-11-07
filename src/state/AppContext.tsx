import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppData, Book, Note, Quote, ReadingLog, Settings } from '../lib/types'
import { loadData, saveData } from '../lib/storage'
import { debounce, nowISO, todayStr, uid } from '../lib/utils'

export type BookInput = Partial<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>> & { title: string }
export type NoteInput = Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>
export type QuoteInput = Partial<Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>> & { text: string }
export type LogInput = Partial<Omit<ReadingLog, 'id' | 'createdAt'>>

export interface SaveState {
  status: 'saved' | 'saving' | 'error'
  bytes: number
  error?: string
  at: string
}

interface ToastItem {
  id: string
  message: string
  tone: 'default' | 'success' | 'error'
}

export type Theme = 'light' | 'night'

interface AppContextValue {
  data: AppData
  theme: Theme
  setTheme: (theme: Theme) => void
  saveState: SaveState
  flushSave: () => void
  replaceData: (next: AppData) => void
  addBook: (input: BookInput) => Book
  updateBook: (id: string, patch: Partial<Book>) => void
  deleteBook: (id: string) => void
  addNote: (input: NoteInput) => Note
  updateNote: (id: string, patch: Partial<Note>) => void
  deleteNote: (id: string) => void
  addQuote: (input: QuoteInput) => Quote
  updateQuote: (id: string, patch: Partial<Quote>) => void
  deleteQuote: (id: string) => void
  addLog: (input: LogInput) => void
  deleteLog: (id: string) => void
  setSettings: (patch: Partial<Settings>) => void
  toast: (message: string, tone?: ToastItem['tone']) => void
  toasts: ToastItem[]
  dismissToast: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

const DEFAULT_BOOK: Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'title'> = {
  author: '',
  category: '未分类',
  status: 'want',
  progress: 0,
  rating: 0,
  summary: '',
  tags: [],
}

const DEFAULT_NOTE: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
  bookId: null,
  title: '',
  content: '',
  chapter: '',
  tags: [],
  favorite: false,
  pinned: false,
}

const DEFAULT_QUOTE: Omit<Quote, 'id' | 'createdAt' | 'updatedAt' | 'text'> = {
  bookId: null,
  author: '',
  page: '',
  thought: '',
  tags: [],
  favorite: false,
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())
  const dataRef = useRef(data)
  dataRef.current = data

  const [saveState, setSaveState] = useState<SaveState>({
    status: 'saved',
    bytes: 0,
    at: nowISO(),
  })
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return localStorage.getItem('mojian.theme') === 'night' ? 'night' : 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'night' ? 'night' : ''
    try {
      localStorage.setItem('mojian.theme', theme)
    } catch {
      /* 主题偏好不影响主数据 */
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])

  const doSave = useCallback(() => {
    const result = saveData(dataRef.current)
    setSaveState({
      status: result.ok ? 'saved' : 'error',
      bytes: result.bytes,
      error: result.error,
      at: nowISO(),
    })
  }, [])

  const debouncedSave = useMemo(() => debounce(doSave, 400), [doSave])

  const flushSave = useCallback(() => {
    debouncedSave.flush()
    doSave()
  }, [debouncedSave, doSave])

  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      doSave() // 首次打开即落盘，示例数据也不会丢
      return
    }
    setSaveState((s) => ({ ...s, status: 'saving' }))
    debouncedSave()
  }, [data, debouncedSave, doSave])

  useEffect(() => {
    const onHide = () => {
      debouncedSave.flush()
      doSave()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide()
    }
    window.addEventListener('pagehide', onHide)
    window.addEventListener('beforeunload', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('beforeunload', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [debouncedSave, doSave])

  const toast = useCallback((message: string, tone: ToastItem['tone'] = 'default') => {
    const id = uid()
    setToasts((list) => [...list, { id, message, tone }].slice(-3))
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const replaceData = useCallback((next: AppData) => {
    setData({ ...next, updatedAt: nowISO() })
    // 恢复/清空后立即写入，不等 debounce
    dataRef.current = { ...next, updatedAt: nowISO() }
    saveData(dataRef.current)
  }, [])

  const addBook = useCallback((input: BookInput): Book => {
    const stamp = nowISO()
    const book: Book = {
      ...DEFAULT_BOOK,
      ...input,
      id: uid(),
      createdAt: stamp,
      updatedAt: stamp,
    }
    setData((prev) => ({ ...prev, books: [book, ...prev.books], updatedAt: stamp }))
    return book
  }, [])

  const updateBook = useCallback((id: string, patch: Partial<Book>) => {
    const stamp = nowISO()
    setData((prev) => ({
      ...prev,
      books: prev.books.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: stamp } : b)),
      updatedAt: stamp,
    }))
  }, [])

  const deleteBook = useCallback((id: string) => {
    const stamp = nowISO()
    setData((prev) => ({
      ...prev,
      books: prev.books.filter((b) => b.id !== id),
      // 删除书籍不删除知识：笔记、摘抄、记录保留，仅解除关联
      notes: prev.notes.map((n) => (n.bookId === id ? { ...n, bookId: null } : n)),
      quotes: prev.quotes.map((q) => (q.bookId === id ? { ...q, bookId: null } : q)),
      logs: prev.logs.map((l) => (l.bookId === id ? { ...l, bookId: null } : l)),
      updatedAt: stamp,
    }))
  }, [])

  const addNote = useCallback((input: NoteInput): Note => {
    const stamp = nowISO()
    const note: Note = { ...DEFAULT_NOTE, ...input, id: uid(), createdAt: stamp, updatedAt: stamp }
    setData((prev) => ({ ...prev, notes: [note, ...prev.notes], updatedAt: stamp }))
    return note
  }, [])

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    const stamp = nowISO()
    setData((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: stamp } : n)),
      updatedAt: stamp,
    }))
  }, [])

  const deleteNote = useCallback((id: string) => {
    setData((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id), updatedAt: nowISO() }))
  }, [])

  const addQuote = useCallback((input: QuoteInput): Quote => {
    const stamp = nowISO()
    const quote: Quote = { ...DEFAULT_QUOTE, ...input, id: uid(), createdAt: stamp, updatedAt: stamp }
    setData((prev) => ({ ...prev, quotes: [quote, ...prev.quotes], updatedAt: stamp }))
    return quote
  }, [])

  const updateQuote = useCallback((id: string, patch: Partial<Quote>) => {
    const stamp = nowISO()
    setData((prev) => ({
      ...prev,
      quotes: prev.quotes.map((q) => (q.id === id ? { ...q, ...patch, updatedAt: stamp } : q)),
      updatedAt: stamp,
    }))
  }, [])

  const deleteQuote = useCallback((id: string) => {
    setData((prev) => ({ ...prev, quotes: prev.quotes.filter((q) => q.id !== id), updatedAt: nowISO() }))
  }, [])

  const addLog = useCallback((input: LogInput) => {
    const log: ReadingLog = {
      id: uid(),
      bookId: null,
      date: todayStr(),
      minutes: 0,
      note: '',
      ...input,
      createdAt: nowISO(),
    }
    setData((prev) => ({ ...prev, logs: [log, ...prev.logs], updatedAt: nowISO() }))
  }, [])

  const deleteLog = useCallback((id: string) => {
    setData((prev) => ({ ...prev, logs: prev.logs.filter((l) => l.id !== id), updatedAt: nowISO() }))
  }, [])

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
      updatedAt: nowISO(),
    }))
  }, [])

  const value: AppContextValue = {
    data,
    theme,
    setTheme,
    saveState,
    flushSave,
    replaceData,
    addBook,
    updateBook,
    deleteBook,
    addNote,
    updateNote,
    deleteNote,
    addQuote,
    updateQuote,
    deleteQuote,
    addLog,
    deleteLog,
    setSettings,
    toast,
    toasts,
    dismissToast,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用')
  return ctx
}
