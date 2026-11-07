import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pin, Plus, Search, Star, Trash2 } from 'lucide-react'
import { useApp } from '../state/AppContext'
import type { Note } from '../lib/types'
import { allTags, bookById } from '../lib/storage'
import { excerpt, matches, relativeTime, stripHtml } from '../lib/utils'
import { ConfirmDialog } from '../components/ConfirmDialog'

type ListFilter = 'all' | 'favorite' | 'pinned'

export function Notes() {
  const { data, updateNote, deleteNote, toast } = useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ListFilter>('all')
  const [bookId, setBookId] = useState('all')
  const [tag, setTag] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Note | null>(null)
  const tags = useMemo(() => allTags(data), [data])

  const notes = useMemo(() => {
    const q = query.trim()
    return data.notes
      .filter((n) => !q || matches(`${n.title} ${stripHtml(n.content)} ${n.chapter} ${n.tags.join(' ')} ${bookById(data, n.bookId)?.title ?? ''}`, q))
      .filter((n) => filter === 'all' || (filter === 'favorite' ? n.favorite : n.pinned))
      .filter((n) => bookId === 'all' || (bookId === 'none' ? !n.bookId : n.bookId === bookId))
      .filter((n) => !tag || n.tags.includes(tag))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
  }, [data, query, filter, bookId, tag])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">MY NOTES</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>阅读笔记</h1>
          <p>共 {data.notes.length} 条 · 边读边写，自动保存到本机</p>
        </div>
        <div className="page-head-actions">
          <Link className="btn btn-primary" to="/notes/new"><Plus size={15} /> 写一条笔记</Link>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-field">
          <Search size={16} />
          <input className="input" aria-label="搜索笔记" placeholder="搜索标题、正文、章节…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="select" aria-label="按书籍筛选" style={{ width: 170 }} value={bookId} onChange={(e) => setBookId(e.target.value)}>
          <option value="all">全部书籍</option>
          <option value="none">未关联书籍</option>
          {data.books.map((b) => <option value={b.id} key={b.id}>{b.title}</option>)}
        </select>
      </div>

      <div className="filter-row">
        <div className="segmented" role="group" aria-label="笔记筛选">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部</button>
          <button className={filter === 'favorite' ? 'active' : ''} onClick={() => setFilter('favorite')}>收藏</button>
          <button className={filter === 'pinned' ? 'active' : ''} onClick={() => setFilter('pinned')}>置顶</button>
        </div>
        <span className="filter-label" style={{ marginLeft: 6 }}>标签</span>
        <button className={`tag-btn ${!tag ? 'is-active' : ''}`} onClick={() => setTag(null)}>不限</button>
        {tags.slice(0, 12).map((t) => (
          <button key={t} className={`tag-btn ${tag === t ? 'is-active' : ''}`} onClick={() => setTag(tag === t ? null : t)}>#{t}</button>
        ))}
      </div>

      {notes.length ? (
        <div className="note-list">
          {notes.map((n) => (
            <div className="note-item" key={n.id}>
              <div className="note-item-main">
                <Link to={`/notes/${n.id}`} style={{ display: 'block' }}>
                  <h3>
                    {n.pinned && <Pin size={13} style={{ color: 'var(--accent)', marginRight: 6, verticalAlign: -1 }} />}
                    {n.title || '无标题笔记'}
                    {n.sample && <span className="badge-sample" style={{ marginLeft: 8, verticalAlign: 2 }}>示例</span>}
                  </h3>
                  <div className="note-preview">{excerpt(stripHtml(n.content), 150) || '（空白笔记，点开继续写）'}</div>
                </Link>
                <div className="note-meta">
                  <span>{bookById(data, n.bookId)?.title ?? '未关联书籍'}</span>
                  {n.chapter && <span>{n.chapter}</span>}
                  <span>{relativeTime(n.updatedAt)}</span>
                  {n.tags.map((t) => <span className="tag" key={t}>#{t}</span>)}
                </div>
              </div>
              <div className="note-item-actions">
                <button
                  className={`icon-btn ${n.favorite ? 'is-on' : ''}`}
                  type="button"
                  aria-label={n.favorite ? '取消收藏' : '收藏笔记'}
                  title={n.favorite ? '取消收藏' : '收藏'}
                  onClick={() => updateNote(n.id, { favorite: !n.favorite })}
                ><Star size={16} fill={n.favorite ? 'currentColor' : 'none'} /></button>
                <button
                  className={`icon-btn ${n.pinned ? 'is-on' : ''}`}
                  type="button"
                  aria-label={n.pinned ? '取消置顶' : '置顶笔记'}
                  title={n.pinned ? '取消置顶' : '置顶'}
                  onClick={() => updateNote(n.id, { pinned: !n.pinned })}
                ><Pin size={16} /></button>
                <button className="icon-btn is-danger" type="button" aria-label="删除笔记" title="删除" onClick={() => setDeleting(n)}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-mark">笔</div>
          <p>{data.notes.length ? '没有符合条件的笔记。' : '还没有笔记。写下的想法，会一直留在这里。'}</p>
          {!data.notes.length && <Link className="btn btn-outline" to="/notes/new"><Plus size={15} /> 写第一条笔记</Link>}
        </div>
      )}

      {deleting && (
        <ConfirmDialog title="删除这条笔记？" tone="danger" confirmText="删除" onCancel={() => setDeleting(null)} onConfirm={() => { deleteNote(deleting.id); setDeleting(null); toast('笔记已删除', 'success') }}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-2)' }}>
            「{deleting.title || '无标题笔记'}」将被删除，此操作无法撤销。若只想暂时收起，可以用收藏或置顶代替。
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}
