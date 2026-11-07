/**
 * 麦克·读书笔记 · 数据模型
 *
 * 设计原则：整份档案是一个自包含的 AppData JSON。
 * 标签以字符串数组内嵌在各条目中（不建独立标签表），
 * 书籍关联只存 bookId，因此导出 / 恢复天然保持关系完整，
 * 未来接入云端同步时可直接把 AppData 作为同步单元。
 */

export type ReadingStatus = 'want' | 'reading' | 'finished' | 'paused'

export interface Book {
  id: string
  title: string
  author: string
  cover?: string // 压缩后的 data URL
  publisher?: string
  category: string
  status: ReadingStatus
  startDate?: string // YYYY-MM-DD
  finishDate?: string // YYYY-MM-DD
  progress: number // 0 - 100
  rating: number // 0 - 5，0 表示未评分
  summary: string
  tags: string[]
  sample?: boolean
  createdAt: string // ISO
  updatedAt: string // ISO
}

export interface Note {
  id: string
  bookId: string | null
  title: string
  content: string // 受控的富文本 HTML
  chapter: string // 章节或页码
  tags: string[]
  favorite: boolean
  pinned: boolean
  sample?: boolean
  createdAt: string
  updatedAt: string
}

export interface Quote {
  id: string
  text: string
  bookId: string | null
  author: string
  page: string
  thought: string
  tags: string[]
  favorite: boolean
  sample?: boolean
  createdAt: string
  updatedAt: string
}

export interface ReadingLog {
  id: string
  bookId: string | null
  date: string // YYYY-MM-DD
  minutes: number
  note: string
  sample?: boolean
  createdAt: string
}

export interface Settings {
  yearlyGoal: number
  monthlyGoal: number
}

export interface AppData {
  version: number
  seeded: boolean
  books: Book[]
  notes: Note[]
  quotes: Quote[]
  logs: ReadingLog[]
  settings: Settings
  updatedAt: string
}

export interface BackupMeta {
  format: 'mojian-backup'
  app: string
  exportedAt: string
  version: number
  counts: { books: number; notes: number; quotes: number; logs: number }
}

export interface BackupFile {
  meta: BackupMeta
  data: AppData
}

export interface BackupReport {
  ok: boolean
  error?: string
  issues: string[]
  data?: AppData
  counts?: { books: number; notes: number; quotes: number; logs: number }
  exportedAt?: string
}

export type KnowledgeKind = 'book' | 'note' | 'quote'

export interface KnowledgeItem {
  id: string
  kind: KnowledgeKind
  title: string
  body: string
  bookId: string | null
  bookTitle: string
  tags: string[]
  date: string
  favorite: boolean
  sample?: boolean
}
