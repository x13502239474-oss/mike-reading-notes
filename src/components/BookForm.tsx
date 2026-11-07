import { useMemo, useState, type FormEvent } from 'react'
import { Star, Upload, X } from 'lucide-react'
import type { Book, ReadingStatus } from '../lib/types'
import type { BookInput } from '../state/AppContext'
import { useApp } from '../state/AppContext'
import { allTags } from '../lib/storage'
import { compressImage } from '../lib/image'
import { STATUS_LABEL, todayStr } from '../lib/utils'
import { TagInput } from './TagInput'
import { Cover } from './Cover'

const STATUSES: ReadingStatus[] = ['want', 'reading', 'finished', 'paused']

export function BookForm({
  book,
  onSubmit,
  onCancel,
}: {
  book?: Book
  onSubmit: (input: BookInput) => void
  onCancel: () => void
}) {
  const { data, toast } = useApp()
  const [title, setTitle] = useState(book?.title ?? '')
  const [author, setAuthor] = useState(book?.author ?? '')
  const [publisher, setPublisher] = useState(book?.publisher ?? '')
  const [category, setCategory] = useState(book?.category ?? '')
  const [status, setStatus] = useState<ReadingStatus>(book?.status ?? 'want')
  const [startDate, setStartDate] = useState(book?.startDate ?? '')
  const [finishDate, setFinishDate] = useState(book?.finishDate ?? '')
  const [progress, setProgress] = useState(book?.progress ?? 0)
  const [rating, setRating] = useState(book?.rating ?? 0)
  const [summary, setSummary] = useState(book?.summary ?? '')
  const [tags, setTags] = useState<string[]>(book?.tags ?? [])
  const [cover, setCover] = useState<string | undefined>(book?.cover)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const categories = useMemo(
    () => Array.from(new Set(['文学', '散文', '历史', '哲学', '社科', '科技', '商业', '艺术', ...data.books.map((b) => b.category)])).filter(Boolean),
    [data.books],
  )
  const suggestions = useMemo(() => allTags(data), [data])

  const handleStatus = (next: ReadingStatus) => {
    setStatus(next)
    if (next === 'finished') {
      setProgress(100)
      if (!finishDate) setFinishDate(todayStr())
    }
    if (next === 'reading' && !startDate) setStartDate(todayStr())
  }

  const handleCover = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      setCover(await compressImage(file))
      toast('封面已压缩并添加', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : '封面上传失败', 'error')
    } finally {
      setUploading(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('请填写书名')
      return
    }
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      publisher: publisher.trim() || undefined,
      category: category.trim() || '未分类',
      status,
      startDate: startDate || undefined,
      finishDate: finishDate || undefined,
      progress,
      rating,
      summary: summary.trim(),
      tags,
      cover,
    })
  }

  const previewBook = { id: book?.id ?? 'preview', title: title || '书名', author, publisher, cover }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-label={book ? '编辑书籍' : '添加书籍'}>
        <div className="modal-head">
          <h3>{book ? '编辑这本书' : '添加一本书'}</h3>
          <button className="icon-btn" onClick={onCancel} aria-label="关闭" type="button">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="cover-upload" style={{ marginBottom: 22 }}>
              <div className="cover-preview">
                <Cover book={previewBook} />
              </div>
              <div>
                <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                  <Upload size={15} /> {uploading ? '处理中…' : '上传封面'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => void handleCover(e.target.files?.[0])}
                  />
                </label>
                <p className="muted" style={{ fontSize: 12, marginTop: 8, maxWidth: 260, lineHeight: 1.7 }}>
                  自动压缩为小尺寸 JPG，保存在本机。留空则使用排印书封。
                </p>
                {cover && (
                  <button type="button" className="btn btn-quiet" style={{ padding: 0, minHeight: 32 }} onClick={() => setCover(undefined)}>
                    <X size={13} /> 移除封面
                  </button>
                )}
              </div>
            </div>

            <div className="form-grid">
              <div className="field span-2">
                <label htmlFor="book-title">书名 *</label>
                <input id="book-title" className="input" value={title} onChange={(e) => { setTitle(e.target.value); setError('') }} placeholder="例如：瓦尔登湖" autoFocus />
                {error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
              </div>
              <div className="field">
                <label htmlFor="book-author">作者</label>
                <input id="book-author" className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="作者姓名" />
              </div>
              <div className="field">
                <label htmlFor="book-category">分类</label>
                <input id="book-category" className="input" list="category-options" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="未分类" />
                <datalist id="category-options">
                  {categories.map((c) => <option value={c} key={c} />)}
                </datalist>
              </div>
              <div className="field">
                <label htmlFor="book-publisher">出版社</label>
                <input id="book-publisher" className="input" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="选填" />
              </div>
              <div className="field">
                <label htmlFor="book-status">阅读状态</label>
                <select id="book-status" className="select" value={status} onChange={(e) => handleStatus(e.target.value as ReadingStatus)}>
                  {STATUSES.map((s) => <option value={s} key={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="book-start">开始阅读</label>
                <input id="book-start" type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="book-finish">完成阅读</label>
                <input id="book-finish" type="date" className="input" value={finishDate} onChange={(e) => setFinishDate(e.target.value)} />
              </div>
              <div className="field span-2">
                <label htmlFor="book-progress">阅读进度 · {progress}%</label>
                <input id="book-progress" type="range" min={0} max={100} step={1} value={progress} onChange={(e) => setProgress(Number(e.target.value))} style={{ accentColor: 'var(--accent)', minHeight: 32 }} />
              </div>
              <div className="field span-2">
                <span className="field-label">个人评分</span>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} className={n <= rating ? 'on' : ''} aria-label={`${n} 星`} onClick={() => setRating(n === rating ? 0 : n)}>
                      <Star size={22} fill={n <= rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                  {rating > 0 && <button type="button" className="btn btn-quiet" style={{ minHeight: 32 }} onClick={() => setRating(0)}>清除</button>}
                </div>
              </div>
              <div className="field span-2">
                <TagInput label="标签" value={tags} onChange={setTags} suggestions={suggestions} />
              </div>
              <div className="field span-2">
                <label htmlFor="book-summary">全书总结 / 读后感</label>
                <textarea id="book-summary" className="textarea" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="读完之后，想留下些什么？" rows={4} />
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-outline" onClick={onCancel}>取消</button>
            <button type="submit" className="btn btn-primary">{book ? '保存修改' : '加入书架'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
