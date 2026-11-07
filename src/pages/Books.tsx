import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useApp } from '../state/AppContext'
import type { Book, ReadingStatus } from '../lib/types'
import { matches, STATUS_LABEL } from '../lib/utils'
import { Cover } from '../components/Cover'
import { BookForm } from '../components/BookForm'
import { ConfirmDialog } from '../components/ConfirmDialog'

type StatusFilter = 'all' | ReadingStatus

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'reading', label: '在读' },
  { key: 'want', label: '想读' },
  { key: 'finished', label: '已读' },
  { key: 'paused', label: '暂停' },
]

export function Books() {
  const { data, addBook, updateBook, deleteBook, toast } = useApp()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState('all')
  const [formOpen, setFormOpen] = useState(params.get('add') === '1')
  const [editing, setEditing] = useState<Book | null>(null)
  const [deleting, setDeleting] = useState<Book | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (params.get('add') === '1') setFormOpen(true)
  }, [params])

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    if (params.has('add')) setParams({}, { replace: true })
  }

  const categories = useMemo(
    () => Array.from(new Set(data.books.map((b) => b.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [data.books],
  )
  const books = useMemo(() => {
    const q = query.trim()
    return data.books
      .filter((b) => !q || matches(`${b.title} ${b.author} ${b.publisher ?? ''} ${b.tags.join(' ')}`, q))
      .filter((b) => status === 'all' || b.status === status)
      .filter((b) => category === 'all' || b.category === category)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [data.books, query, status, category])

  const submit = (input: Parameters<typeof addBook>[0]) => {
    if (editing) {
      updateBook(editing.id, input)
      toast('书籍已更新', 'success')
    } else {
      const book = addBook(input)
      toast('已加入书架', 'success')
      closeForm()
      navigate(`/books/${book.id}`)
      return
    }
    closeForm()
  }

  const confirmDelete = () => {
    if (!deleting) return
    deleteBook(deleting.id)
    setDeleting(null)
    toast('书籍已移出书架，相关笔记与摘抄已保留', 'success')
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">MY LIBRARY</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>我的书架</h1>
          <p>共 {data.books.length} 本 · 按状态与分类整理</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary" onClick={() => setFormOpen(true)}><Plus size={15} /> 添加书籍</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-field">
          <Search size={16} />
          <input className="input" aria-label="搜索书名或作者" placeholder="搜索书名、作者、出版社…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="select" aria-label="按分类筛选" style={{ width: 150 }} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">全部分类</option>
          {categories.map((c) => <option value={c} key={c}>{c}</option>)}
        </select>
      </div>

      <div className="segmented" style={{ marginBottom: 26 }} role="group" aria-label="按阅读状态筛选">
        {FILTERS.map((f) => (
          <button key={f.key} className={status === f.key ? 'active' : ''} onClick={() => setStatus(f.key)} type="button">
            {f.label}
          </button>
        ))}
      </div>

      {books.length ? (
        <div className="book-grid">
          {books.map((b) => (
            <article className="book-card" key={b.id}>
              <Link to={`/books/${b.id}`} aria-label={`查看《${b.title}》详情`}>
                <Cover book={b} status={b.status} />
              </Link>
              <Link to={`/books/${b.id}`} className="book-card-title">{b.title}</Link>
              <div className="book-card-meta">{b.author || '佚名'}{b.sample ? ' · 示例' : ''}</div>
              {b.status === 'reading' && (
                <div className="progress-track"><div className="progress-fill" style={{ width: `${b.progress}%` }} /></div>
              )}
              <button
                className="card-more icon-btn"
                type="button"
                aria-label={`${b.title} 的操作`}
                onClick={() => setMenuId(menuId === b.id ? null : b.id)}
              >
                <MoreHorizontal size={16} />
              </button>
              {menuId === b.id && (
                <div className="card-menu">
                  <button className="icon-btn" type="button" title="编辑" aria-label="编辑书籍" onClick={() => { setEditing(b); setFormOpen(true); setMenuId(null) }}><Pencil size={15} /></button>
                  <button className="icon-btn is-danger" type="button" title="删除" aria-label="删除书籍" onClick={() => { setDeleting(b); setMenuId(null) }}><Trash2 size={15} /></button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-mark">架</div>
          <p>{data.books.length ? '没有符合条件的书籍，换个筛选试试。' : '书架还空着。添加第一本书，开始积累吧。'}</p>
          {!data.books.length && <button className="btn btn-outline" onClick={() => setFormOpen(true)}><Plus size={15} /> 添加第一本书</button>}
        </div>
      )}

      {(formOpen || editing) && (
        <BookForm book={editing ?? undefined} onSubmit={submit} onCancel={closeForm} />
      )}

      {deleting && (
        <ConfirmDialog
          title={`移出《${deleting.title}》？`}
          tone="danger"
          confirmText="确认移出"
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        >
          <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-2)' }}>
            这本书会从书架移除。它下面的笔记、摘抄和阅读记录<strong>不会被删除</strong>，只会变成「未关联书籍」，你写下的内容都还在。
          </p>
          <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
            状态：{STATUS_LABEL[deleting.status]} · 进度 {deleting.progress}%
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}
