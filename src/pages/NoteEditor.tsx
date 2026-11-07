import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Pin, Star, Trash2 } from 'lucide-react'
import { useApp } from '../state/AppContext'
import type { Note } from '../lib/types'
import { allTags } from '../lib/storage'
import { formatCNDate, relativeTime, stripHtml } from '../lib/utils'
import { RichTextEditor } from '../components/RichTextEditor'
import { TagInput } from '../components/TagInput'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function NoteEditor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data, addNote, updateNote, deleteNote, flushSave, saveState, toast } = useApp()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const createdRef = useRef(false)
  const isNewRoute = !id || id === 'new'
  const activeId = id && id !== 'new' ? id : pendingId
  const note = activeId ? data.notes.find((n) => n.id === activeId) : undefined
  const tags = useMemo(() => allTags(data), [data])

  useEffect(() => {
    if (!isNewRoute || createdRef.current) return
    createdRef.current = true
    const created = addNote({
      title: '',
      content: '',
      bookId: params.get('book') || null,
    })
    setPendingId(created.id)
    navigate(`/notes/${created.id}`, { replace: true })
  }, [isNewRoute, params, addNote, navigate])

  if (!note) {
    return (
      <div className="page">
        <div className="empty">
          <div className="empty-mark">墨</div>
          <p>{isNewRoute ? '正在准备一张新纸…' : '没有找到这条笔记，它可能已被删除。'}</p>
          <Link className="btn btn-outline" to="/notes">返回笔记列表</Link>
        </div>
      </div>
    )
  }

  const isBlank = !note.title.trim() && !stripHtml(note.content).trim() && !note.tags.length

  const finish = () => {
    if (isBlank) {
      deleteNote(note.id)
      toast('空白笔记已丢弃', 'success')
    } else {
      flushSave()
      toast('笔记已保存', 'success')
    }
    navigate('/notes')
  }

  const confirmDelete = () => {
    deleteNote(note.id)
    setDeleting(false)
    toast('笔记已删除', 'success')
    navigate('/notes')
  }

  const toggle = (patch: Partial<Note>) => updateNote(note.id, patch)

  return (
    <div className="page editor-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Link to="/notes" className="link-more"><ArrowLeft size={14} /> 返回笔记</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button className={`icon-btn ${note.favorite ? 'is-on' : ''}`} type="button" aria-label={note.favorite ? '取消收藏' : '收藏'} title="收藏" onClick={() => toggle({ favorite: !note.favorite })}>
            <Star size={17} fill={note.favorite ? 'currentColor' : 'none'} />
          </button>
          <button className={`icon-btn ${note.pinned ? 'is-on' : ''}`} type="button" aria-label={note.pinned ? '取消置顶' : '置顶'} title="置顶" onClick={() => toggle({ pinned: !note.pinned })}>
            <Pin size={17} />
          </button>
          <button className="icon-btn is-danger" type="button" aria-label="删除笔记" title="删除" onClick={() => setDeleting(true)}>
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div className="editor-shell">
        <div className="editor-top">
          <input
            className="editor-title-input"
            aria-label="笔记标题"
            placeholder="给这条笔记起个标题"
            value={note.title}
            onChange={(e) => toggle({ title: e.target.value })}
            onBlur={flushSave}
          />
          <div className="editor-context">
            <select
              className="select" aria-label="所属书籍"
              value={note.bookId ?? ''}
              onChange={(e) => toggle({ bookId: e.target.value || null })}
            >
              <option value="">未关联书籍</option>
              {data.books.map((b) => <option value={b.id} key={b.id}>{b.title}</option>)}
            </select>
            <input
              className="input" aria-label="章节或页码"
              placeholder="章节 / 页码"
              value={note.chapter}
              onChange={(e) => toggle({ chapter: e.target.value })}
              onBlur={flushSave}
              style={{ width: 150 }}
            />
          </div>
        </div>

        <RichTextEditor
          value={note.content}
          onChange={(html) => toggle({ content: html })}
          onBlurFlush={flushSave}
          placeholder="开始写吧。想法、摘抄、疑问、反驳，都算数。"
        />

        <div className="editor-foot">
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <TagInput value={note.tags} onChange={(next) => toggle({ tags: next })} suggestions={tags} placeholder="添加标签后回车" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="editor-save-status" title="所有改动都保存在本机浏览器中">
              <i className={`save-dot ${saveState.status === 'saving' ? 'is-saving' : saveState.status === 'error' ? 'is-error' : ''}`} />
              {saveState.status === 'saved' ? '已自动保存' : saveState.status === 'saving' ? '正在保存…' : '保存失败'}
            </span>
            <button className="btn btn-primary" onClick={finish}><Check size={15} /> 完成</button>
          </div>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 16, lineHeight: 1.9 }}>
        创建于 {formatCNDate(note.createdAt)} · 最近修改 {relativeTime(note.updatedAt)}
        <br />
        输入即自动保存；离开页面、切到后台或关闭浏览器时也会立即写入本机。
      </p>

      {deleting && (
        <ConfirmDialog title="删除这条笔记？" tone="danger" confirmText="删除" onCancel={() => setDeleting(false)} onConfirm={confirmDelete}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-2)' }}>
            「{note.title || '无标题笔记'}」将被删除，无法撤销。
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}
