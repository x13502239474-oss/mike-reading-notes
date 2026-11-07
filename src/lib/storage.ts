import type {
  AppData,
  BackupFile,
  BackupReport,
  Book,
  KnowledgeItem,
  Note,
  Quote,
  ReadingLog,
  Settings,
} from './types'
import {
  asBool,
  asString,
  asStringArray,
  clamp,
  monthKey,
  nowISO,
  parseDate,
  sanitizeHtml,
  stripHtml,
  toNumber,
  todayStr,
  uid,
} from './utils'

// 说明：存储键与备份格式标识属于磁盘数据格式，不随产品更名而改动，
// 以保证旧版本保存的数据和历史备份文件仍可被完整读取。
export const STORAGE_KEY = 'mojian.data.v1'
export const SNAPSHOT_KEY = 'mojian.snapshot.v1'
export const DATA_VERSION = 1

export function createEmptyData(): AppData {
  return {
    version: DATA_VERSION,
    seeded: true,
    books: [],
    notes: [],
    quotes: [],
    logs: [],
    settings: { yearlyGoal: 12, monthlyGoal: 1 },
    updatedAt: nowISO(),
  }
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function dateAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return todayStr(d)
}

/** 少量明确标注为「示例」的初始内容，帮助用户理解各模块的样子。 */
export function makeSampleData(): AppData {
  const walden = 'sample-book-walden'
  const sapiens = 'sample-book-sapiens'
  const base = createEmptyData()
  const books: Book[] = [
    {
      id: walden,
      title: '瓦尔登湖',
      author: '亨利·戴维·梭罗',
      publisher: '人民文学出版社',
      category: '散文',
      status: 'finished',
      startDate: dateAgo(96),
      finishDate: dateAgo(38),
      progress: 100,
      rating: 5,
      summary: '一个人若能安静地生活，便不需要向世界索取太多。这本书教会我把注意力收回到具体的事物上。',
      tags: ['生活', '自然'],
      sample: true,
      createdAt: daysAgo(96),
      updatedAt: daysAgo(38),
    },
    {
      id: sapiens,
      title: '人类简史',
      author: '尤瓦尔·赫拉利',
      publisher: '中信出版社',
      category: '历史',
      status: 'reading',
      startDate: dateAgo(12),
      progress: 42,
      rating: 0,
      summary: '',
      tags: ['历史', '认知'],
      sample: true,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(2),
    },
  ]
  const notes: Note[] = [
    {
      id: 'sample-note-1',
      bookId: walden,
      title: '示例 · 关于「简朴」的一段思考',
      content:
        '<p>梭罗说，大多数人过着<em> quietly desperate </em>的生活。我第一次读到这里时并不认同，重读才明白他指的并非贫穷，而是<strong>未经审视的忙碌</strong>。</p><blockquote>一个人越是有许多事情能够放得下，他就越是富有。</blockquote><p>把这句话记下来，是为了提醒自己：减少，也是一种积累。</p>',
      chapter: '第二章 · 我生活的地方',
      tags: ['生活', '重读'],
      favorite: true,
      pinned: false,
      sample: true,
      createdAt: daysAgo(35),
      updatedAt: daysAgo(9),
    },
  ]
  const quotes: Quote[] = [
    {
      id: 'sample-quote-1',
      text: '我步入丛林，因为我希望生活得有意义，只面对生活中最根本的事实，看看我是否学得到它要教育我的东西。',
      bookId: walden,
      author: '亨利·戴维·梭罗',
      page: 'P. 92',
      thought: '每次换工作、搬家之前，都会重新想起这句话。「根本的事实」其实一直在，只是常被噪音盖住。',
      tags: ['生活', '句子'],
      favorite: true,
      sample: true,
      createdAt: daysAgo(36),
      updatedAt: daysAgo(36),
    },
    {
      id: 'sample-quote-2',
      text: '历史从无正义可言，多数时候它只是偶然叠加的结果。',
      bookId: sapiens,
      author: '尤瓦尔·赫拉利',
      page: 'P. 148',
      thought: '接受偶然，反而更容易客观地看待当下。',
      tags: ['历史'],
      favorite: false,
      sample: true,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
  ]
  const logs: ReadingLog[] = [
    {
      id: 'sample-log-1',
      bookId: sapiens,
      date: dateAgo(2),
      minutes: 45,
      note: '读了农业革命那一章',
      sample: true,
      createdAt: daysAgo(2),
    },
    {
      id: 'sample-log-2',
      bookId: sapiens,
      date: dateAgo(6),
      minutes: 30,
      note: '',
      sample: true,
      createdAt: daysAgo(6),
    },
  ]
  return { ...base, books, notes, quotes, logs }
}

function asISO(v: unknown, fallback: string, issues: string[], label: string): string {
  const s = asString(v, '')
  if (s && parseDate(s)) return s
  if (s) issues.push(`${label} 的时间格式不合法，已重置`)
  return fallback
}

function asDay(v: unknown, issues: string[], label: string): string | undefined {
  const s = asString(v, '')
  if (!s) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(s) && parseDate(s)) return s
  issues.push(`${label} 的日期格式不合法，已清空`)
  return undefined
}

function normalizeBook(raw: unknown, seen: Set<string>, issues: string[]): Book {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  let id = asString(o.id)
  if (!id || seen.has(id)) {
    issues.push(`书籍「${asString(o.title, '未命名')}」的 ID 缺失或重复，已重新生成`)
    id = uid()
  }
  seen.add(id)
  const validStatus = ['want', 'reading', 'finished', 'paused'].includes(asString(o.status))
    ? (o.status as Book['status'])
    : 'want'
  const cover = asString(o.cover)
  return {
    id,
    title: asString(o.title, '未命名书籍'),
    author: asString(o.author),
    cover: cover.startsWith('data:image/') ? cover : undefined,
    publisher: asString(o.publisher) || undefined,
    category: asString(o.category, '未分类'),
    status: validStatus,
    startDate: asDay(o.startDate, issues, `书籍「${asString(o.title)}」`),
    finishDate: asDay(o.finishDate, issues, `书籍「${asString(o.title)}」`),
    progress: clamp(toNumber(o.progress), 0, 100),
    rating: clamp(toNumber(o.rating), 0, 5),
    summary: asString(o.summary),
    tags: asStringArray(o.tags),
    sample: asBool(o.sample),
    createdAt: asISO(o.createdAt, nowISO(), issues, `书籍「${asString(o.title)}」`),
    updatedAt: asISO(o.updatedAt, nowISO(), issues, `书籍「${asString(o.title)}」`),
  }
}

function normalizeNote(raw: unknown, seen: Set<string>, ids: Set<string>, issues: string[]): Note {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  let id = asString(o.id)
  if (!id || seen.has(id)) {
    issues.push(`笔记「${asString(o.title, '未命名')}」的 ID 缺失或重复，已重新生成`)
    id = uid()
  }
  seen.add(id)
  let bookId = asString(o.bookId) || null
  if (bookId && !ids.has(bookId)) {
    issues.push(`笔记「${asString(o.title, '未命名')}」关联的书籍不存在，已改为「未关联」`)
    bookId = null
  }
  return {
    id,
    bookId,
    title: asString(o.title, '无标题笔记'),
    content: sanitizeHtml(asString(o.content)),
    chapter: asString(o.chapter),
    tags: asStringArray(o.tags),
    favorite: asBool(o.favorite),
    pinned: asBool(o.pinned),
    sample: asBool(o.sample),
    createdAt: asISO(o.createdAt, nowISO(), issues, `笔记「${asString(o.title)}」`),
    updatedAt: asISO(o.updatedAt, nowISO(), issues, `笔记「${asString(o.title)}」`),
  }
}

function normalizeQuote(raw: unknown, seen: Set<string>, ids: Set<string>, issues: string[]): Quote {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  let id = asString(o.id)
  if (!id || seen.has(id)) {
    issues.push(`摘抄「${asString(o.text, '').slice(0, 12)}…」的 ID 缺失或重复，已重新生成`)
    id = uid()
  }
  seen.add(id)
  let bookId = asString(o.bookId) || null
  if (bookId && !ids.has(bookId)) {
    issues.push(`一条摘抄关联的书籍不存在，已改为「未关联」`)
    bookId = null
  }
  return {
    id,
    bookId,
    text: asString(o.text),
    author: asString(o.author),
    page: asString(o.page),
    thought: asString(o.thought),
    tags: asStringArray(o.tags),
    favorite: asBool(o.favorite),
    sample: asBool(o.sample),
    createdAt: asISO(o.createdAt, nowISO(), issues, '摘抄'),
    updatedAt: asISO(o.updatedAt, nowISO(), issues, '摘抄'),
  }
}

function normalizeLog(raw: unknown, seen: Set<string>, ids: Set<string>, issues: string[]): ReadingLog {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  let id = asString(o.id)
  if (!id || seen.has(id)) id = uid()
  seen.add(id)
  let bookId = asString(o.bookId) || null
  if (bookId && !ids.has(bookId)) bookId = null
  const date = asDay(o.date, issues, '阅读记录') ?? todayStr()
  return {
    id,
    bookId,
    date,
    minutes: clamp(toNumber(o.minutes), 0, 1440),
    note: asString(o.note),
    sample: asBool(o.sample),
    createdAt: asISO(o.createdAt, nowISO(), issues, '阅读记录'),
  }
}

function normalizeSettings(raw: unknown): Settings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    yearlyGoal: clamp(toNumber(o.yearlyGoal, 12), 0, 999),
    monthlyGoal: clamp(toNumber(o.monthlyGoal, 1), 0, 99),
  }
}

/** 解析、校验并清洗一份备份（也接受裸 AppData）。不产生任何副作用。 */
export function validateBackup(raw: string): BackupReport {
  const issues: string[] = []
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error: '文件内容为空或不是文本', issues }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: '不是合法的 JSON 文件，请确认选择的是麦克·读书笔记导出的备份', issues }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: '备份结构不正确（应为 JSON 对象）', issues }
  }
  const top = parsed as Record<string, unknown>
  const meta =
    top.meta && typeof top.meta === 'object' && !Array.isArray(top.meta)
      ? (top.meta as Record<string, unknown>)
      : undefined
  // 兼容两种备份：带 meta 包装的导出文件，以及裸 AppData
  const isWrapped =
    (top.format === 'mojian-backup' || meta?.format === 'mojian-backup') &&
    !!top.data &&
    typeof top.data === 'object'
  const body = (isWrapped ? top.data : top) as Record<string, unknown>
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: '备份中缺少 data 数据体', issues }
  }
  const requiredArrays = ['books', 'notes', 'quotes'] as const
  for (const key of requiredArrays) {
    if (!Array.isArray(body[key])) {
      return { ok: false, error: `备份缺少「${key}」列表，可能不是麦克·读书笔记备份`, issues }
    }
  }
  if (Array.isArray(body.logs) === false) issues.push('备份中没有阅读时间记录，将按空处理')
  const version = toNumber(body.version, DATA_VERSION)
  if (version > DATA_VERSION) issues.push('备份来自更新版本的麦克·读书笔记，未知字段可能被忽略')

  const seen = new Set<string>()
  const normalizedBooks = (body.books as unknown[]).map((b) => normalizeBook(b, seen, issues))
  const bookIds = new Set(normalizedBooks.map((b) => b.id))
  const noteSeen = new Set<string>()
  const quoteSeen = new Set<string>()
  const logSeen = new Set<string>()
  const normalizedNotes = (body.notes as unknown[]).map((n) =>
    normalizeNote(n, noteSeen, bookIds, issues),
  )
  const normalizedQuotes = (body.quotes as unknown[]).map((q) =>
    normalizeQuote(q, quoteSeen, bookIds, issues),
  )
  const normalizedLogs = (Array.isArray(body.logs) ? body.logs : []).map((l) =>
    normalizeLog(l, logSeen, bookIds, issues),
  )

  const exportedAt = asString(meta?.exportedAt) || asString(body.updatedAt) || undefined
  const data: AppData = {
    version: DATA_VERSION,
    seeded: asBool(body.seeded, true),
    books: normalizedBooks,
    notes: normalizedNotes,
    quotes: normalizedQuotes,
    logs: normalizedLogs,
    settings: normalizeSettings(body.settings),
    updatedAt: nowISO(),
  }
  const counts = {
    books: data.books.length,
    notes: data.notes.length,
    quotes: data.quotes.length,
    logs: data.logs.length,
  }
  if (counts.books + counts.notes + counts.quotes === 0) {
    issues.push('备份中没有任何书籍、笔记或摘抄，恢复后将得到一份空档案')
  }
  return { ok: true, issues, data, counts, exportedAt }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return makeSampleData()
    const report = validateBackup(raw)
    if (report.ok && report.data) return report.data
    // 数据损坏时保留现场，不让用户丢失原始内容
    localStorage.setItem(`mojian.corrupt.${Date.now()}`, raw)
    return makeSampleData()
  } catch {
    return makeSampleData()
  }
}

export interface SaveResult {
  ok: boolean
  bytes: number
  error?: string
}

export function saveData(data: AppData): SaveResult {
  const json = JSON.stringify({ ...data, updatedAt: nowISO() })
  const bytes = new TextEncoder().encode(json).length
  try {
    localStorage.setItem(STORAGE_KEY, json)
    return { ok: true, bytes }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return {
      ok: false,
      bytes,
      error: /quota|exceeded|storage/i.test(message)
        ? '浏览器本地存储空间已满，请删除部分封面图片或导出备份后清理数据'
        : `保存失败：${message}`,
    }
  }
}

export function buildBackup(data: AppData): BackupFile {
  return {
    meta: {
      format: 'mojian-backup',
      app: '麦克·读书笔记',
      exportedAt: nowISO(),
      version: DATA_VERSION,
      counts: {
        books: data.books.length,
        notes: data.notes.length,
        quotes: data.quotes.length,
        logs: data.logs.length,
      },
    },
    data: { ...data, version: DATA_VERSION },
  }
}

export function serializeBackup(data: AppData): string {
  return JSON.stringify(buildBackup(data), null, 2)
}

/** 恢复前的自动回滚点，保存在 localStorage 中（不额外占用下载）。 */
export function saveSnapshot(data: AppData): boolean {
  try {
    const payload = JSON.stringify({ savedAt: nowISO(), data })
    localStorage.setItem(SNAPSHOT_KEY, payload)
    return true
  } catch {
    return false
  }
}

export function readSnapshot(): { savedAt: string; data: AppData } | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { savedAt?: string; data?: unknown }
    const report = validateBackup(JSON.stringify(parsed.data))
    if (!report.ok || !report.data) return null
    return { savedAt: asString(parsed.savedAt), data: report.data }
  } catch {
    return null
  }
}

export function clearSnapshot(): void {
  try {
    localStorage.removeItem(SNAPSHOT_KEY)
  } catch {
    /* ignore */
  }
}

export function countSamples(data: AppData): number {
  return (
    data.books.filter((b) => b.sample).length +
    data.notes.filter((n) => n.sample).length +
    data.quotes.filter((q) => q.sample).length +
    data.logs.filter((l) => l.sample).length
  )
}

export function removeSamples(data: AppData): AppData {
  return {
    ...data,
    books: data.books.filter((b) => !b.sample),
    notes: data.notes.filter((n) => !n.sample),
    quotes: data.quotes.filter((q) => !q.sample),
    logs: data.logs.filter((l) => !l.sample),
    updatedAt: nowISO(),
  }
}

export function bookById(data: AppData, id: string | null): Book | undefined {
  return id ? data.books.find((b) => b.id === id) : undefined
}

export function allTags(data: AppData): string[] {
  const set = new Set<string>()
  data.books.forEach((b) => b.tags.forEach((t) => set.add(t)))
  data.notes.forEach((n) => n.tags.forEach((t) => set.add(t)))
  data.quotes.forEach((q) => q.tags.forEach((t) => set.add(t)))
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

/** 把书籍、笔记、摘抄整合成统一的可检索条目。 */
export function buildKnowledgeItems(data: AppData): KnowledgeItem[] {
  const items: KnowledgeItem[] = []
  data.books.forEach((b) =>
    items.push({
      id: b.id,
      kind: 'book',
      title: b.title,
      body: [b.author, b.publisher, b.category, b.summary, b.tags.join(' ')].join(' '),
      bookId: b.id,
      bookTitle: b.title,
      tags: b.tags,
      date: b.updatedAt,
      favorite: false,
      sample: b.sample,
    }),
  )
  data.notes.forEach((n) => {
    const b = bookById(data, n.bookId)
    items.push({
      id: n.id,
      kind: 'note',
      title: n.title,
      body: [stripHtml(n.content), n.chapter, n.tags.join(' ')].join(' '),
      bookId: n.bookId,
      bookTitle: b?.title ?? '未关联书籍',
      tags: n.tags,
      date: n.updatedAt,
      favorite: n.favorite,
      sample: n.sample,
    })
  })
  data.quotes.forEach((q) => {
    const b = bookById(data, q.bookId)
    items.push({
      id: q.id,
      kind: 'quote',
      title: q.text,
      body: [q.thought, q.author, q.page, q.tags.join(' ')].join(' '),
      bookId: q.bookId,
      bookTitle: b?.title ?? '未关联书籍',
      tags: q.tags,
      date: q.updatedAt,
      favorite: q.favorite,
      sample: q.sample,
    })
  })
  return items
}

export interface KnowledgeFilter {
  query?: string
  tags?: string[]
  bookId?: string | null
  kind?: 'all' | 'book' | 'note' | 'quote'
  sort?: 'newest' | 'oldest' | 'title'
}

export function searchKnowledge(data: AppData, filter: KnowledgeFilter): KnowledgeItem[] {
  const q = (filter.query ?? '').trim().toLowerCase()
  const tags = filter.tags ?? []
  let items = buildKnowledgeItems(data)
  if (q) {
    items = items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.body.toLowerCase().includes(q) ||
        i.bookTitle.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }
  if (tags.length) items = items.filter((i) => tags.every((t) => i.tags.includes(t)))
  if (filter.bookId) items = items.filter((i) => i.bookId === filter.bookId)
  if (filter.kind && filter.kind !== 'all') items = items.filter((i) => i.kind === filter.kind)
  const sort = filter.sort ?? 'newest'
  return items.sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title, 'zh-CN')
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
    return sort === 'oldest' ? diff : -diff
  })
}

export interface Stats {
  totalBooks: number
  finishedBooks: number
  readingBooks: number
  wantBooks: number
  pausedBooks: number
  totalNotes: number
  totalQuotes: number
  thisMonthFinished: number
  thisMonthNotes: number
  thisMonthQuotes: number
  thisMonthMinutes: number
  yearlyFinished: number
  avgProgress: number
  monthlyFinished: { month: string; count: number }[]
}

export function computeStats(data: AppData): Stats {
  const thisMonth = monthKey(todayStr())
  const thisYear = todayStr().slice(0, 4)
  const finished = data.books.filter((b) => b.status === 'finished')
  const monthlyMap = new Map<string, number>()
  finished.forEach((b) => {
    const key = b.finishDate ? monthKey(b.finishDate) : monthKey(b.updatedAt)
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1)
  })
  const monthlyFinished: { month: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const key = todayStr(d).slice(0, 7)
    monthlyFinished.push({ month: key, count: monthlyMap.get(key) ?? 0 })
  }
  const reading = data.books.filter((b) => b.status === 'reading')
  return {
    totalBooks: data.books.length,
    finishedBooks: finished.length,
    readingBooks: reading.length,
    wantBooks: data.books.filter((b) => b.status === 'want').length,
    pausedBooks: data.books.filter((b) => b.status === 'paused').length,
    totalNotes: data.notes.length,
    totalQuotes: data.quotes.length,
    thisMonthFinished: finished.filter((b) =>
      (b.finishDate ?? b.updatedAt).startsWith(thisMonth),
    ).length,
    thisMonthNotes: data.notes.filter((n) => n.createdAt.startsWith(thisMonth)).length,
    thisMonthQuotes: data.quotes.filter((q) => q.createdAt.startsWith(thisMonth)).length,
    thisMonthMinutes: data.logs
      .filter((l) => l.date.startsWith(thisMonth))
      .reduce((sum, l) => sum + l.minutes, 0),
    yearlyFinished: finished.filter((b) =>
      (b.finishDate ?? b.updatedAt).startsWith(thisYear),
    ).length,
    avgProgress: reading.length
      ? Math.round(reading.reduce((s, b) => s + b.progress, 0) / reading.length)
      : 0,
    monthlyFinished,
  }
}
