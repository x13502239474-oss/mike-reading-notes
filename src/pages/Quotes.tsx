import { useMemo, useState } from 'react'
import { Copy, Pencil, Plus, RefreshCw, Search, Star, Trash2 } from 'lucide-react'
import { useApp } from '../state/AppContext'
import type { Quote } from '../lib/types'
import { allTags, bookById } from '../lib/storage'
import { copyText, excerpt, matches, relativeTime } from '../lib/utils'
import { QuoteForm } from '../components/QuoteForm'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function Quotes() {
  const { data, addQuote, updateQuote, deleteQuote, toast } = useApp()
  const [query, setQuery] = useState('')
  const [bookId, setBookId] = useState('all')
  const [tag, setTag] = useState<string | null>(null)
  const [favOnly, setFavOnly] = useState(false)
  const [form, setForm] = useState<{ open: boolean; quote?: Quote }>({ open: false })
  const [deleting, setDeleting] = useState<Quote | null>(null)
  const tags = useMemo(() => allTags(data), [data])

  const favorites = data.quotes.filter((q) => q.favorite)
  const pool = favorites.length ? favorites : data.quotes
  const [randomIdx, setRandomIdx] = useState(() => (pool.length ? Math.floor(Math.random() * pool.length) : 0))
  const random = pool.length ? pool[randomIdx % pool.length] : undefined

  const quotes = useMemo(() => {
    const q = query.trim()
    return data.quotes
      .filter((item) => !q || matches(`${item.text} ${item.thought} ${item.author} ${item.tags.join(' ')} ${bookById(data, item.bookId)?.title ?? ''}`, q))
      .filter((item) => bookId === 'all' || item.bookId === bookId)
      .filter((item) => !tag || item.tags.includes(tag))
      .filter((item) => !favOnly || item.favorite)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [data, query, bookId, tag, favOnly])

  const quoteText = (q: Quote) => {
    const book = bookById(data, q.bookId)
    const source = Array.from(new Set([book?.title, q.author, q.page].filter((p): p is string => !!p))).join(' · ')
    return `「${q.text}」\n—— ${source || '未注明出处'}`
  }

  const copy = async (q: Quote) => {
    const ok = await copyText(quoteText(q))
    toast(ok ? '已复制到剪贴板' : '复制失败，请长按选中文字手动复制', ok ? 'success' : 'error')
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">COMMONPLACE BOOK</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>摘抄与金句</h1>
          <p>共 {data.quotes.length} 条 · 收藏 {favorites.length} 条</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary" onClick={() => setForm({ open: true })}><Plus size={15} /> 记一段话</button>
        </div>
      </div>

      {random && (
        <section className="random-quote">
          <span className="quote-mark" aria-hidden="true">”</span>
          <div className="eyebrow" style={{ marginBottom: 14 }}>随机回顾 · 来自收藏</div>
          <p className="quote-text">{random.text}</p>
          {random.thought && <div className="quote-thought">我的感想 · {random.thought}</div>}
          <div className="quote-source" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>—— {bookById(data, random.bookId)?.title ?? random.author ?? '未注明出处'}{random.page ? ` · ${random.page}` : ''}</span>
            <button className="btn btn-quiet" style={{ minHeight: 32, padding: '0 8px' }} onClick={() => setRandomIdx((i) => (i + 1) % pool.length)}><RefreshCw size={13} /> 换一条</button>
            <button className="btn btn-quiet" style={{ minHeight: 32, padding: '0 8px' }} onClick={() => void copy(random)}><Copy size={13} /> 复制</button>
          </div>
        </section>
      )}

      <div className="toolbar">
        <div className="search-field">
          <Search size={16} />
          <input className="input" aria-label="搜索摘抄" placeholder="搜索原文、感想、作者…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="select" aria-label="按书籍筛选" style={{ width: 170 }} value={bookId} onChange={(e) => setBookId(e.target.value)}>
          <option value="all">全部书籍</option>
          {data.books.map((b) => <option value={b.id} key={b.id}>{b.title}</option>)}
        </select>
      </div>

      <div className="filter-row">
        <button className={`tag-btn ${favOnly ? 'is-active' : ''}`} onClick={() => setFavOnly(!favOnly)}><Star size={12} style={{ verticalAlign: -1 }} /> 只看收藏</button>
        <span className="filter-label">标签</span>
        <button className={`tag-btn ${!tag ? 'is-active' : ''}`} onClick={() => setTag(null)}>不限</button>
        {tags.slice(0, 12).map((t) => (
          <button key={t} className={`tag-btn ${tag === t ? 'is-active' : ''}`} onClick={() => setTag(tag === t ? null : t)}>#{t}</button>
        ))}
      </div>

      {quotes.length ? (
        <div className="quote-grid">
          {quotes.map((q) => (
            <article className="quote-card" key={q.id}>
              <div className="quote-text">{q.text}</div>
              {q.thought && <div className="quote-thought">{q.thought}</div>}
              <div className="quote-source">
                {bookById(data, q.bookId)?.title ?? '未关联书籍'}
                {q.author && ` · ${q.author}`}{q.page && ` · ${q.page}`}
                {q.sample && <span className="badge-sample" style={{ marginLeft: 8 }}>示例</span>}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {q.tags.map((t) => <span className="tag" key={t}>#{t}</span>)}
              </div>
              <div className="quote-actions">
                <span className="muted" style={{ fontSize: 11 }}>{relativeTime(q.updatedAt)}</span>
                <span className="spacer" />
                <button className={`icon-btn ${q.favorite ? 'is-on' : ''}`} type="button" title={q.favorite ? '取消收藏' : '收藏'} aria-label={q.favorite ? '取消收藏' : '收藏'} onClick={() => updateQuote(q.id, { favorite: !q.favorite })}>
                  <Star size={16} fill={q.favorite ? 'currentColor' : 'none'} />
                </button>
                <button className="icon-btn" type="button" title="复制" aria-label="复制摘抄" onClick={() => void copy(q)}><Copy size={16} /></button>
                <button className="icon-btn" type="button" title="编辑" aria-label="编辑摘抄" onClick={() => setForm({ open: true, quote: q })}><Pencil size={16} /></button>
                <button className="icon-btn is-danger" type="button" title="删除" aria-label="删除摘抄" onClick={() => setDeleting(q)}><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-mark">句</div>
          <p>{data.quotes.length ? '没有符合条件的摘抄。' : '还没有摘抄。遇到想留住的句子，就抄在这里。'}</p>
          {!data.quotes.length && <button className="btn btn-outline" onClick={() => setForm({ open: true })}><Plus size={15} /> 记第一条摘抄</button>}
        </div>
      )}

      {form.open && (
        <QuoteForm
          quote={form.quote}
          onSubmit={(input) => {
            if (form.quote) { updateQuote(form.quote.id, input); toast('摘抄已更新', 'success') }
            else { addQuote(input); toast('摘抄已保存', 'success') }
            setForm({ open: false })
          }}
          onCancel={() => setForm({ open: false })}
        />
      )}

      {deleting && (
        <ConfirmDialog title="删除这条摘抄？" tone="danger" confirmText="删除" onCancel={() => setDeleting(null)} onConfirm={() => { deleteQuote(deleting.id); setDeleting(null); toast('摘抄已删除', 'success') }}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-2)' }}>{excerpt(deleting.text, 80)}</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
