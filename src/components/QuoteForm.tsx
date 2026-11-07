import { useMemo, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Quote } from '../lib/types'
import type { QuoteInput } from '../state/AppContext'
import { useApp } from '../state/AppContext'
import { allTags, bookById } from '../lib/storage'
import { TagInput } from './TagInput'

export function QuoteForm({
  quote,
  defaultBookId = null,
  onSubmit,
  onCancel,
}: {
  quote?: Quote
  defaultBookId?: string | null
  onSubmit: (input: QuoteInput) => void
  onCancel: () => void
}) {
  const { data } = useApp()
  const [text, setText] = useState(quote?.text ?? '')
  const [bookId, setBookId] = useState<string | null>(quote?.bookId ?? defaultBookId)
  const [author, setAuthor] = useState(quote?.author ?? bookById(data, defaultBookId)?.author ?? '')
  const [page, setPage] = useState(quote?.page ?? '')
  const [thought, setThought] = useState(quote?.thought ?? '')
  const [tags, setTags] = useState<string[]>(quote?.tags ?? [])
  const [favorite, setFavorite] = useState(quote?.favorite ?? false)
  const [error, setError] = useState('')
  const suggestions = useMemo(() => allTags(data), [data])

  const changeBook = (id: string) => {
    const nextId = id || null
    setBookId(nextId)
    const b = bookById(data, nextId)
    setAuthor(b?.author ?? '')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) {
      setError('请填写摘抄原文')
      return
    }
    onSubmit({ text: text.trim(), bookId, author: author.trim(), page: page.trim(), thought: thought.trim(), tags, favorite })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-label={quote ? '编辑摘抄' : '新增摘抄'}>
        <div className="modal-head">
          <h3>{quote ? '编辑摘抄' : '记下一段话'}</h3>
          <button className="icon-btn" onClick={onCancel} aria-label="关闭" type="button"><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="field span-2">
                <label htmlFor="quote-text">摘抄原文 *</label>
                <textarea id="quote-text" className="textarea" value={text} onChange={(e) => { setText(e.target.value); setError('') }} rows={5} placeholder="把打动你的那句话抄下来…" autoFocus />
                {error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
              </div>
              <div className="field">
                <label htmlFor="quote-book">所属书籍</label>
                <select id="quote-book" className="select" value={bookId ?? ''} onChange={(e) => changeBook(e.target.value)}>
                  <option value="">未关联书籍</option>
                  {data.books.map((b) => <option value={b.id} key={b.id}>{b.title}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="quote-author">作者</label>
                <input id="quote-author" className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="选填" />
              </div>
              <div className="field">
                <label htmlFor="quote-page">页码 / 位置</label>
                <input id="quote-page" className="input" value={page} onChange={(e) => setPage(e.target.value)} placeholder="例如 P. 92" />
              </div>
              <div className="field">
                <label htmlFor="quote-fav" style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, cursor: 'pointer' }}>
                  <input id="quote-fav" type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                  加入收藏（随机回顾会出现它）
                </label>
              </div>
              <div className="field span-2">
                <label htmlFor="quote-thought">我的感想</label>
                <textarea id="quote-thought" className="textarea" value={thought} onChange={(e) => setThought(e.target.value)} rows={3} placeholder="为什么会记下它？" />
              </div>
              <div className="field span-2">
                <TagInput label="标签" value={tags} onChange={setTags} suggestions={suggestions} />
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-outline" onClick={onCancel}>取消</button>
            <button type="submit" className="btn btn-primary">{quote ? '保存修改' : '保存摘抄'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
