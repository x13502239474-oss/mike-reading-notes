import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useApp } from '../state/AppContext'
import type { KnowledgeItem } from '../lib/types'
import { allTags, searchKnowledge } from '../lib/storage'
import { excerpt, formatCNDate, stripHtml } from '../lib/utils'

const KIND_LABEL: Record<string, string> = { book: '书', note: '笔记', quote: '摘抄' }

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--accent-soft)', color: 'inherit', padding: '0 1px' }}>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

export function Knowledge() {
  const { data } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [tag, setTag] = useState<string | null>(params.get('tag'))
  const [kind, setKind] = useState<'all' | 'book' | 'note' | 'quote'>('all')
  const [bookId, setBookId] = useState('all')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest')
  const [activeQuote, setActiveQuote] = useState<KnowledgeItem | null>(null)
  const tags = useMemo(() => allTags(data), [data])

  // 支持从标签、书籍详情等位置带参数跳进来
  useEffect(() => {
    setQuery(params.get('q') ?? '')
    setTag(params.get('tag'))
    const b = params.get('book')
    if (b) setBookId(b)
  }, [params])

  const results = useMemo(
    () => searchKnowledge(data, {
      query,
      tags: tag ? [tag] : [],
      bookId: bookId === 'all' ? undefined : bookId,
      kind,
      sort,
    }),
    [data, query, tag, bookId, kind, sort],
  )

  const topicCounts = useMemo(() => {
    if (!tag) return null
    const all = searchKnowledge(data, { tags: [tag] })
    return {
      book: all.filter((i) => i.kind === 'book').length,
      note: all.filter((i) => i.kind === 'note').length,
      quote: all.filter((i) => i.kind === 'quote').length,
    }
  }, [data, tag])

  const openItem = (item: KnowledgeItem) => {
    if (item.kind === 'book') navigate(`/books/${item.id}`)
    else if (item.kind === 'note') navigate(`/notes/${item.id}`)
    else setActiveQuote(item)
  }

  const quoteDetail = activeQuote ? data.quotes.find((q) => q.id === activeQuote.id) : undefined

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">KNOWLEDGE BASE</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>个人知识库</h1>
          <p>书籍、笔记、摘抄与思考，合在一处检索</p>
        </div>
      </div>

      <div className="knowledge-search">
        <Search size={20} />
        <input
          aria-label="全局搜索"
          placeholder="搜索一个词、一句话、一个主题…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="knowledge-filters">
        <div className="filter-group">
          <span>类型</span>
          {(['all', 'book', 'note', 'quote'] as const).map((k) => (
            <button key={k} className={`tag-btn ${kind === k ? 'is-active' : ''}`} onClick={() => setKind(k)}>
              {k === 'all' ? '全部' : KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="filter-group">
          <span>书籍</span>
          <select className="select" aria-label="按书籍筛选" style={{ width: 150, minHeight: 36, padding: '5px 30px 5px 10px', backgroundPosition: 'calc(100% - 17px) 15px, calc(100% - 12px) 15px' }} value={bookId} onChange={(e) => setBookId(e.target.value)}>
            <option value="all">不限</option>
            {data.books.map((b) => <option value={b.id} key={b.id}>{b.title}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <span>排序</span>
          <select className="select" aria-label="排序方式" style={{ width: 120, minHeight: 36, padding: '5px 30px 5px 10px', backgroundPosition: 'calc(100% - 17px) 15px, calc(100% - 12px) 15px' }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="newest">最近更新</option>
            <option value="oldest">最早更新</option>
            <option value="title">按标题</option>
          </select>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="filter-row" style={{ marginTop: 14 }}>
          <span className="filter-label">主题标签</span>
          <button className={`tag-btn ${!tag ? 'is-active' : ''}`} onClick={() => setTag(null)}>不限</button>
          {tags.map((t) => (
            <button key={t} className={`tag-btn ${tag === t ? 'is-active' : ''}`} onClick={() => setTag(tag === t ? null : t)}>#{t}</button>
          ))}
        </div>
      )}

      {tag && topicCounts && (
        <div className="report-box" style={{ margin: '4px 0 18px' }}>
          <strong className="serif">#{tag}</strong> 这个主题下有 {topicCounts.book} 本书、{topicCounts.note} 条笔记、{topicCounts.quote} 条摘抄。
          <button className="btn btn-quiet" style={{ minHeight: 28, padding: '0 8px', marginLeft: 8 }} onClick={() => setTag(null)}>查看全部</button>
        </div>
      )}

      <div className="result-count">共 {results.length} 条结果{query.trim() ? ` · 关键词「${query.trim()}」` : ''}</div>

      {results.length ? (
        <div>
          {results.map((item) => (
            <button className="result-item" key={`${item.kind}-${item.id}`} onClick={() => openItem(item)} style={{ width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--line-soft)', background: 'transparent', padding: '18px 0' }}>
              <div className="result-title">
                <span className="result-kind">{KIND_LABEL[item.kind]}</span>
                <Highlight text={excerpt(item.title, 110)} query={query} />
              </div>
              {item.body.trim() && <div className="result-body"><Highlight text={excerpt(stripHtml(item.body), 170)} query={query} /></div>}
              <div className="result-meta">
                <span>{item.bookTitle}</span>
                <span>{formatCNDate(item.date, false)}</span>
                {item.favorite && <span>已收藏</span>}
                {item.tags.map((t) => <span key={t}>#{t}</span>)}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-mark">知</div>
          <p>{query || tag ? '没有找到相关内容，换个词或换一个标签试试。' : '知识库还是空的。先去书架加一本书，再写点笔记。'}</p>
        </div>
      )}

      {activeQuote && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setActiveQuote(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="摘抄详情">
            <div className="modal-head">
              <h3>摘抄</h3>
              <button className="icon-btn" onClick={() => setActiveQuote(null)} aria-label="关闭"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="prose" style={{ fontSize: '1.15rem', whiteSpace: 'pre-wrap' }}>{quoteDetail?.text ?? activeQuote.title}</div>
              {quoteDetail?.thought && (
                <div style={{ marginTop: 20, paddingLeft: 12, borderLeft: '1px solid var(--line)', color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.9 }}>
                  我的感想 · {quoteDetail.thought}
                </div>
              )}
              <p className="muted" style={{ fontSize: 12, marginTop: 18 }}>
                —— {activeQuote.bookTitle}{quoteDetail?.author && ` · ${quoteDetail.author}`}{quoteDetail?.page && ` · ${quoteDetail.page}`}
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-outline" onClick={() => setActiveQuote(null)}>关闭</button>
              <button className="btn btn-primary" onClick={() => { setActiveQuote(null); navigate('/quotes') }}>到摘抄页编辑</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
