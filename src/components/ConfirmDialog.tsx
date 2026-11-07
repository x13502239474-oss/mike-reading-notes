import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function ConfirmDialog({
  title,
  children,
  confirmText = '确认',
  cancelText = '取消',
  tone = 'default',
  disabled = false,
  onConfirm,
  onCancel,
}: {
  title: string
  children?: ReactNode
  confirmText?: string
  cancelText?: string
  tone?: 'default' | 'danger'
  disabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onCancel} aria-label="关闭" type="button">
            <X size={18} />
          </button>
        </div>
        {children && <div className="modal-body">{children}</div>}
        <div className="modal-foot">
          <button className="btn btn-outline" onClick={onCancel} type="button">
            {cancelText}
          </button>
          <button
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={disabled}
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
