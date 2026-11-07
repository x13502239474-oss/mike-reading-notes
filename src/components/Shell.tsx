import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Database,
  Home,
  LibraryBig,
  Moon,
  MoreHorizontal,
  NotebookPen,
  Quote,
  Search,
  Sun,
  X,
  BarChart3,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { formatBytes } from '../lib/utils'

const NAV = [
  { to: '/', label: '首页', icon: Home, end: true },
  { to: '/books', label: '书架', icon: LibraryBig },
  { to: '/notes', label: '笔记', icon: NotebookPen },
  { to: '/quotes', label: '摘抄', icon: Quote },
  { to: '/knowledge', label: '知识库', icon: Search },
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/settings', label: '数据', icon: Database },
]

const MOBILE_NAV = [
  { to: '/', label: '首页', icon: Home },
  { to: '/books', label: '书架', icon: LibraryBig },
  { to: '/notes', label: '笔记', icon: NotebookPen },
  { to: '/quotes', label: '摘抄', icon: Quote },
  { to: '/more', label: '更多', icon: MoreHorizontal },
]

export function Shell({ children }: { children: ReactNode }) {
  const { theme, setTheme, saveState, flushSave, toasts, dismissToast } = useApp()
  const location = useLocation()
  const moreActive = ['/more', '/knowledge', '/stats', '/settings'].some((p) =>
    location.pathname.startsWith(p),
  )

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="麦克·读书笔记首页">
            <span className="brand-seal">麦</span>
            <span className="brand-text">
              <b>麦克·读书笔记</b>
              <small>个人读书档案</small>
            </span>
          </Link>

          <nav className="desktop-nav" aria-label="主导航">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => isActive ? 'active' : ''}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <button
              className="save-indicator"
              onClick={flushSave}
              title="点击立即保存"
              type="button"
              style={{ background: 'transparent', border: 0, minHeight: 44, padding: '0 6px' }}
              aria-label={`数据${saveState.status === 'saved' ? '已保存' : saveState.status === 'saving' ? '保存中' : '保存失败'}，点击立即保存`}
            >
              <i className={`save-dot ${saveState.status === 'saving' ? 'is-saving' : saveState.status === 'error' ? 'is-error' : ''}`} />
              <span>{saveState.status === 'saved' ? '已保存' : saveState.status === 'saving' ? '保存中' : '保存失败'}</span>
            </button>
            <Link to="/knowledge" className="icon-btn" aria-label="全局搜索" title="全局搜索">
              <Search size={18} />
            </Link>
            <button
              className="icon-btn"
              onClick={() => setTheme(theme === 'night' ? 'light' : 'night')}
              aria-label={theme === 'night' ? '切换为日间模式' : '切换为夜间模式'}
              title={theme === 'night' ? '日间模式' : '夜读模式'}
              type="button"
            >
              {theme === 'night' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="site-main">
        <div className="container">{children}</div>
      </main>

      <footer className="site-footer">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', width: '100%' }}>
          <span>麦克·读书笔记 · 数据只保存在这台设备的浏览器里，请定期导出备份</span>
          <span>
            本地占用 {formatBytes(saveState.bytes)} · {saveState.status === 'error' ? saveState.error : '离线可用'}
          </span>
        </div>
      </footer>

      <nav className="mobile-tabbar" aria-label="移动端导航">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon
          const isActive = item.to === '/more'
            ? moreActive
            : item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to)
          return (
            <NavLink key={item.to} to={item.to} className={`tab-item ${isActive ? 'active' : ''}`}>
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="toast-host" aria-live="polite">
        {toasts.map((t) => (
          <div className={`toast toast-${t.tone}`} key={t.id} onClick={() => dismissToast(t.id)}>
            <BookOpen size={15} />
            <span>{t.message}</span>
            <X size={14} />
          </div>
        ))}
      </div>
    </>
  )
}
