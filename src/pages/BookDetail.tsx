import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useApp } from '../state/AppContext'
import type { Quote } from '../lib/types'
import { excerpt, formatCNDate, relativeTime, STATUS_LABEL, stripHtml, todayStr } from '../lib/utils'
import { Cover } from '../components/Cover'
import { BookForm } from '../components/BookForm'
import { QuoteForm } from '../components/QuoteForm'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, updateBook, deleteBook, updateQuote, addQuote, toast } = useApp()
  const book = data.books.find((b) => b.id === id)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [quoteForm, setQuoteForm] = useState<{ quote?: Quote; open: boolean }>({ open: false })

  const notes = useMemo(
    () => (book ? data.notes.filter((n) => n.bookId === book.id).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) : []),
    [data.notes, book],
  )
  const quotes = useMemo(
    () => (book ? data.quotes.filter((q) => q.bookId === book.id).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) : []),
    [data.quotes, book],
  )

  if (!book) {
    return (
      <div className="page">
        <div className="empty">
          <div className="empty-mark">寻</div>
          <p>没有找到这本书，它可能已被移出书架。</p>
          <Link className="btn btn-outline" to="/books">返回书架</Link>
        </div>
      </div>
    )
  }

  const submitEdit = (input: Parameters<typeof updateBook>[1]) => {
    updateBook(book.id, input)
    setEditing(false)
    toast('书籍已更新', 'success')
  }

  const confirmDelete = () => {
    deleteBook(book.id)
    setDeleting(false)
    toast('书籍已移出书架，笔记与摘抄已保留', 'success')
    navigate('/books')
  }

  return (
    <div className="page">
      <Link to="/books" className="link-more" style={{ marginBottom: 24, display: 'inline-flex' }}><ArrowLeft size={14} /> 返回书架</Link>

      <section className="detail-hero">
        <Cover book={book} status={book.status} />
        <div className="detail-info">
          <div className="eyebrow">{book.category}</div>
          <h1 style={{ marginTop: 8 }}>{book.title} {book.sample && <span className="badge-sample" style={{ verticalAlign: 'middle' }}>示例</span>}</h1>
          <div className="detail-author">{book.author || '佚名'}{book.publisher ? ` · ${book.publisher}` : ''}</div>

          <div className="rating-stars" style={{ marginTop: 12 }} aria-label={`评分 ${book.rating} 星`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={17} fill={n <= book.rating ? 'currentColor' : 'none'} color={n <= book.rating ? 'var(--gold)' : 'var(--line)'} />
            ))}
            {book.rating === 0 && <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>尚未评分</span>}
          </div>

          <dl className="detail-meta-grid">
            <div><dt>阅读状态</dt><dd className={`status-text-${book.status}`}>{STATUS_LABEL[book.status]}</dd></div>
            <div><dt>阅读进度</dt><dd>{book.progress}%</dd></div>
            <div><dt>开始阅读</dt><dd>{formatCNDate(book.startDate)}</dd></div>
            <div><dt>完成阅读</dt><dd>{formatCNDate(book.finishDate)}</dd></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <dt>标签</dt>
              <dd style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {book.tags.length ? book.tags.map((t) => (
                  <Link className="tag" key={t} to={`/knowledge?tag=${encodeURIComponent(t)}`}>#{t}</Link>
                )) : <span className="muted">未设置</span>}
              </dd>
            </div>
          </dl>

          <div className="progress-editor">
            <span className="field-label" style={{ whiteSpace: 'nowrap' }}>调整进度</span>
            <input
              type="range" min={0} max={100} step={1} value={book.progress}
              aria-label="阅读进度"
              onChange={(e) => updateBook(book.id, { progress: Number(e.target.value) })}
            />
            <strong>{book.progress}%</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <button className="btn btn-outline" onClick={() => setEditing(true)}><Pencil size={15} /> 编辑信息</button>
            {book.status !== 'finished' && (
              <button className="btn btn-outline" onClick={() => { updateBook(book.id, { status: 'finished', progress: 100, finishDate: book.finishDate ?? todayStr() }); toast('已标记为读完', 'success') }}>
                <Check size={15} /> 标记读完
              </button>
            )}
            <button className="btn btn-danger" onClick={() => setDeleting(true)}><Trash2 size={15} /> 移出书架</button>
          </div>
        </div>
      </section>

      <section className="detail-section">
        <div className="section-head"><h2>全书总结</h2></div>
        {book.summary ? (
          <div className="prose" style={{ maxWidth: '70ch', whiteSpace: 'pre-wrap' }}>{book.summary}</div>
        ) : (
          <p className="muted" style={{ fontSize: 14 }}>还没有写总结。读完之后回来补上几句，日后回看会很值钱。</p>
        )}
      </section>

      <section className="detail-section">
        <div className="section-head">
          <h2>这本书的笔记 · {notes.length}</h2>
          <span className="head-extra">
            <Link className="btn btn-outline" to={`/notes/new?book=${book.id}`}><Plus size={14} /> 写笔记</Link>
          </span>
        </div>
        {notes.length ? (
          <div className="note-list">
            {notes.map((n) => (
              <Link className="note-row" to={`/notes/${n.id}`} key={n.id}>
                <div className="row-title">{n.title || '无标题笔记'}{n.pinned && <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>置顶</span>}</div>
                <div className="row-excerpt">{excerpt(stripHtml(n.content), 120) || '（空白笔记）'}</div>
                <div className="row-meta">{n.chapter || '未标注章节'} · {relativeTime(n.updatedAt)} {n.favorite ? '· 已收藏' : ''}</div>
              </Link>
            ))}
          </div>
        ) : <p className="muted" style={{ fontSize: 14 }}>还没有为这本书写笔记。</p>}
      </section>

      <section className="detail-section">
        <div className="section-head">
          <h2>这本书的摘抄 · {quotes.length}</h2>
          <span className="head-extra">
            <button className="btn btn-outline" onClick={() => setQuoteForm({ open: true })}><Plus size={14} /> 添加摘抄</button>
          </span>
        </div>
        {quotes.length ? (
          <div className="note-list">
            {quotes.map((q) => (
              <button
                type="button"
                className="note-row"
                key={q.id}
                onClick={() => setQuoteForm({ open: true, quote: q })}
                style={{ cursor: 'pointer' }}
              >
                <div className="row-title serif" style={{ fontWeight: 400, fontSize: '1.05rem' }}>{excerpt(q.text, 90)}</div>
                <div className="row-meta">{q.page || '未标注页码'} · {q.thought ? '有感想' : '暂无感想'}{q.favorite ? ' · 已收藏' : ''}</div>
              </button>
            ))}
          </div>
        ) : <p className="muted" style={{ fontSize: 14 }}>还没有收录这本书的摘抄。</p>}
      </section>

      {editing && <BookForm book={book} onSubmit={submitEdit} onCancel={() => setEditing(false)} />}

      {quoteForm.open && (
        <QuoteForm
          quote={quoteForm.quote}
          defaultBookId={book.id}
          onSubmit={(input) => {
            if (quoteForm.quote) {
              updateQuote(quoteForm.quote.id, input)
              toast('摘抄已更新', 'success')
            } else {
              addQuote(input)
              toast('摘抄已保存', 'success')
            }
            setQuoteForm({ open: false })
          }}
          onCancel={() => setQuoteForm({ open: false })}
        />
      )}

      {deleting && (
        <ConfirmDialog title={`移出《${book.title}》？`} tone="danger" confirmText="确认移出" onCancel={() => setDeleting(false)} onConfirm={confirmDelete}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-2)' }}>
            书籍将从书架移除，但这本书下的 {notes.length} 条笔记、{quotes.length} 条摘抄会完整保留，仅解除关联。
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}
