import { useState } from 'react'
import { X } from 'lucide-react'

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = '输入标签后回车',
  label,
}: {
  value: string[]
  onChange: (next: string[]) => void
  suggestions?: string[]
  placeholder?: string
  label?: string
}) {
  const [draft, setDraft] = useState('')
  const add = (raw: string) => {
    const tag = raw.trim().replace(/^#/, '')
    if (!tag) return
    if (!value.includes(tag)) onChange([...value, tag])
    setDraft('')
  }
  const unused = suggestions.filter((s) => !value.includes(s) && s.includes(draft.trim())).slice(0, 8)

  return (
    <div className="field">
      {label && <span className="field-label">{label}</span>}
      <div className="tag-editor">
        {value.map((tag) => (
          <span className="tag-chip" key={tag}>
            {tag}
            <button
              type="button"
              aria-label={`移除标签 ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          placeholder={value.length ? '' : placeholder}
          aria-label="添加标签"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add(draft)
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
        />
      </div>
      {draft.trim() && unused.length > 0 && (
        <div className="tag-picker" style={{ marginTop: 6 }}>
          {unused.map((s) => (
            <button className="tag-btn" type="button" key={s} onMouseDown={(e) => e.preventDefault()} onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <button
          type="button"
          className="btn btn-quiet"
          style={{ alignSelf: 'flex-start', minHeight: 28, padding: '0 4px' }}
          onClick={() => onChange([])}
        >
          <X size={12} /> 清空标签
        </button>
      )}
    </div>
  )
}
