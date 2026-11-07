import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Bold, Italic, List, ListOrdered, Quote as QuoteIcon, Underline, Eraser } from 'lucide-react'
import { sanitizeHtml } from '../lib/utils'

interface Tool {
  id: string
  label: string
  title: string
  icon?: 'bold' | 'italic' | 'underline' | 'ul' | 'ol' | 'quote' | 'clear'
  cmd: string
  arg?: string
}

const TOOLS: Tool[] = [
  { id: 'p', label: '正文', title: '正文段落', cmd: 'formatBlock', arg: 'p' },
  { id: 'h2', label: '标题', title: '小标题', cmd: 'formatBlock', arg: 'h2' },
  { id: 'bold', label: 'B', title: '粗体 (Ctrl+B)', icon: 'bold', cmd: 'bold' },
  { id: 'italic', label: 'I', title: '斜体 (Ctrl+I)', icon: 'italic', cmd: 'italic' },
  { id: 'underline', label: 'U', title: '下划线', icon: 'underline', cmd: 'underline' },
  { id: 'ul', label: '列表', title: '无序列表', icon: 'ul', cmd: 'insertUnorderedList' },
  { id: 'ol', label: '编号', title: '有序列表', icon: 'ol', cmd: 'insertOrderedList' },
  { id: 'quote', label: '引用', title: '引用块', icon: 'quote', cmd: 'formatBlock', arg: 'blockquote' },
  { id: 'clear', label: '清除', title: '清除格式', icon: 'clear', cmd: 'removeFormat' },
]

function ToolIcon({ icon }: { icon?: Tool['icon'] }) {
  const size = 16
  switch (icon) {
    case 'bold': return <Bold size={size} />
    case 'italic': return <Italic size={size} />
    case 'underline': return <Underline size={size} />
    case 'ul': return <List size={size} />
    case 'ol': return <ListOrdered size={size} />
    case 'quote': return <QuoteIcon size={size} />
    case 'clear': return <Eraser size={size} />
    default: return null
  }
}

export function RichTextEditor({
  value,
  onChange,
  onBlurFlush,
  placeholder = '写点什么吧…',
}: {
  value: string
  onChange: (html: string) => void
  onBlurFlush?: () => void
  placeholder?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef<string>('')
  const [activeTools, setActiveTools] = useState<string[]>([])

  // 只在「外部」改变内容时同步 DOM，避免每次输入都重置光标
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (value === lastEmitted.current) return
    el.innerHTML = sanitizeHtml(value)
    lastEmitted.current = value
  }, [value])

  const emit = () => {
    const el = ref.current
    if (!el) return
    const html = el.innerHTML
    const next = html === '<br>' || html === '<div><br></div>' ? '' : html
    lastEmitted.current = next
    onChange(next)
  }

  const refreshActive = () => {
    const next: string[] = []
    try {
      if (document.queryCommandState('bold')) next.push('bold')
      if (document.queryCommandState('italic')) next.push('italic')
      if (document.queryCommandState('underline')) next.push('underline')
      if (document.queryCommandState('insertUnorderedList')) next.push('ul')
      if (document.queryCommandState('insertOrderedList')) next.push('ol')
      const block = document.queryCommandValue('formatBlock')?.toLowerCase()
      if (block === 'h2') next.push('h2')
      if (block === 'blockquote') next.push('quote')
      if (block === 'p' || !block) next.push('p')
    } catch {
      /* 某些浏览器不支持 queryCommandValue，忽略即可 */
    }
    setActiveTools(next)
  }

  const exec = (tool: Tool) => (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const el = ref.current
    if (!el) return
    el.focus()
    try {
      document.execCommand(tool.cmd, false, tool.arg)
    } catch {
      /* 忽略不支持的命令 */
    }
    emit()
    refreshActive()
  }

  return (
    <div>
      <div className="editor-toolbar" role="toolbar" aria-label="笔记格式工具栏">
        {TOOLS.map((tool, i) => (
          <span key={tool.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
            {(i === 2 || i === 5 || i === 8) && <span className="tool-sep" />}
            <button
              type="button"
              className={`tool ${tool.icon ? '' : 'has-label'} ${activeTools.includes(tool.id) ? 'active' : ''}`}
              title={tool.title}
              aria-label={tool.title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={exec(tool)}
            >
              <ToolIcon icon={tool.icon} />
              {!tool.icon && tool.label}
            </button>
          </span>
        ))}
      </div>
      <div
        ref={ref}
        className="editor-surface prose"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="笔记正文"
        data-placeholder={placeholder}
        onInput={() => { emit(); refreshActive() }}
        onKeyUp={refreshActive}
        onMouseUp={refreshActive}
        onBlur={() => { emit(); onBlurFlush?.() }}
        onPaste={(e) => {
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
          emit()
        }}
      />
    </div>
  )
}
