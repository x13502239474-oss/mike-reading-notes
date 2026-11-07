import { Link } from 'react-router-dom'
import { Database, BarChart3, Search, ChevronRight, ShieldCheck } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { countSamples } from '../lib/storage'
import { formatBytes, formatCNDate } from '../lib/utils'

const LINKS = [
  { to: '/knowledge', icon: Search, title: '个人知识库', desc: '跨书籍、笔记、摘抄的全局检索与主题聚合' },
  { to: '/stats', icon: BarChart3, title: '阅读计划与统计', desc: '目标、月度记录、阅读时间与完成情况' },
  { to: '/settings', icon: Database, title: '数据管理与设置', desc: '导出备份、恢复数据、外观与存储状态' },
]

export function More() {
  const { data, saveState } = useApp()
  const samples = countSamples(data)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">MORE</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>更多</h1>
          <p>知识、统计与数据，都在这里</p>
        </div>
      </div>

      <div className="more-list">
        {LINKS.map((l) => {
          const Icon = l.icon
          return (
            <Link className="more-link" to={l.to} key={l.to}>
              <span className="icon-btn" style={{ pointerEvents: 'none' }}><Icon size={19} /></span>
              <span style={{ flex: 1 }}>
                <span className="more-title" style={{ display: 'block' }}>{l.title}</span>
                <span className="more-desc" style={{ display: 'block' }}>{l.desc}</span>
              </span>
              <ChevronRight size={17} className="muted" />
            </Link>
          )
        })}
      </div>

      <div className="settings-block" style={{ marginTop: 36, borderBottom: 0 }}>
        <h3>数据状态</h3>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={15} /> 全部内容保存在这台设备的浏览器里，离线可用。
        </p>
        <div style={{ fontSize: 14, lineHeight: 2, color: 'var(--ink-2)' }}>
          <div>{data.books.length} 本书 · {data.notes.length} 条笔记 · {data.quotes.length} 条摘抄</div>
          <div>本地占用 {formatBytes(saveState.bytes)} · {saveState.status === 'error' ? saveState.error : `最近写入 ${formatCNDate(saveState.at, false)}`}</div>
          {samples > 0 && <div>包含 {samples} 条示例数据，可在<Link to="/settings" style={{ color: 'var(--accent-ink)' }}>数据管理</Link>中一键清除</div>}
        </div>
      </div>

      <p className="muted" style={{ fontSize: 12, lineHeight: 2, marginTop: 24 }}>
        在 iPhone 上用 Safari 打开本站，点分享按钮 →「添加到主屏幕」，即可像 App 一样全屏使用。
        两端数据各自独立，需要迁移时请导出 JSON 再在另一台设备恢复。
      </p>
    </div>
  )
}
