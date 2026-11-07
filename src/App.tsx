import { useEffect } from 'react'
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider } from './state/AppContext'
import { Shell } from './components/Shell'
import { Home } from './pages/Home'
import { Books } from './pages/Books'
import { BookDetail } from './pages/BookDetail'
import { Notes } from './pages/Notes'
import { NoteEditor } from './pages/NoteEditor'
import { Quotes } from './pages/Quotes'
import { Knowledge } from './pages/Knowledge'
import { Stats } from './pages/Stats'
import { More } from './pages/More'
import { DataSettings } from './pages/DataSettings'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function NotFound() {
  return (
    <div className="page">
      <div className="empty">
        <div className="empty-mark">页</div>
        <p>这一页不在书里。</p>
        <Link className="btn btn-outline" to="/">回到首页</Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <ScrollToTop />
        <Shell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/books" element={<Books />} />
            <Route path="/books/:id" element={<BookDetail />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/notes/new" element={<NoteEditor />} />
            <Route path="/notes/:id" element={<NoteEditor />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/more" element={<More />} />
            <Route path="/settings" element={<DataSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Shell>
      </AppProvider>
    </HashRouter>
  )
}
