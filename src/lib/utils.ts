export function uid(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function monthKey(isoOrDate: string): string {
  return isoOrDate.slice(0, 7)
}

export function parseDate(value?: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatCNDate(value?: string, withYear = true): string {
  const d = parseDate(value)
  if (!d) return '—'
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return withYear ? `${y}年${m}月${day}日` : `${m}月${day}日`
}

export function relativeTime(iso: string): string {
  const d = parseDate(iso)
  if (!d) return '—'
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 172_800_000) return '昨天'
  return formatCNDate(iso, false)
}

/** 富文本 HTML → 纯文本，用于搜索、摘要与列表预览 */
export function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * 只保留编辑器会产出的标签，剥离全部属性与事件，
 * 避免恢复备份或粘贴外部 HTML 时注入脚本。
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  const allowed = new Set([
    'P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U',
    'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'SPAN',
  ])
  let out = html
    .replace(/<(script|style|iframe|object|embed|svg|math|link|meta)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(script|style|iframe|object|embed|svg|math|link|meta)[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
  // 只保留白名单标签，并丢弃全部属性（含 on*、style、src、href）
  out = out.replace(/<\/?([a-z][a-z0-9]*)(?:\s[^>]*)?\/?>/gi, (m, tag: string) => {
    if (!allowed.has(tag.toUpperCase())) return ''
    const closing = m.startsWith('</')
    return `<${closing ? '/' : ''}${tag.toLowerCase()}>`
  })
  return out.trim()
}

export function excerpt(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function matches(haystack: string, query: string): boolean {
  return normalizeQuery(haystack).includes(normalizeQuery(query))
}

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

export function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return Array.from(
    new Set(
      v
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  )
}

export function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}

export function debounce<T extends (...args: never[]) => void>(fn: T, wait: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const wrapped = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, wait)
  }
  wrapped.flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return wrapped as T & { flush: () => void }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function uniqueTags(...lists: string[][]): string[] {
  return Array.from(new Set(lists.flat().filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  )
}

export const STATUS_LABEL: Record<string, string> = {
  want: '想读',
  reading: '在读',
  finished: '已读',
  paused: '暂停',
}

/** 剪贴板：优先 Clipboard API，非安全上下文（如局域网 http）回退到 execCommand */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 继续尝试回退方案 */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export function downloadText(filename: string, content: string, mime = 'application/json;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
