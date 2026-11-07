import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Plus, RefreshCw } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { bookById, computeStats } from '../lib/storage'
import { excerpt, formatCNDate, relativeTime, stripHtml, STATUS_LABEL } from '../lib/utils'
import { Cover } from '../components/Cover'

export function Home() {
  const { data } = useApp()
  const stats = useMemo(() => computeStats(data), [data])
  const pool = useMemo(() => {
    const favorites = data.quotes.filter((q) => q.favorite)
    return favorites.length ? favorites : data.quotes
  }, [data.quotes])
  const [quoteIndex, setQuoteIndex] = useState(() => (pool.length ? Math.floor(Math.random() * pool.length) : 0))
  const randomQuote = pool.length ? pool[quoteIndex % pool.length] : undefined

  const byUpdated = (a: { updatedAt: string }, b: { updatedAt: string }) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  const reading = data.books.filter((b) => b.status === 'reading').sort(byUpdated)
  const recentBooks = [...data.books].sort(byUpdated).slice(0, 4)
  const recentNotes = [...data.notes].sort(byUpdated).slice(0, 4)

  const today = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  }).format(new Date())

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <section className="hero">
        <div className="eyebrow">{today}</div>
        <h1>
          把读过的书，<em>留成自己的</em>。
        </h1>
        {randomQuote ? (
          <div className="hero-quote">
            <p>{randomQuote.text}</p>
            <footer>
              —— {bookById(data, randomQuote.bookId)?.title ?? randomQuote.author ?? '未注明出处'}
              {randomQuote.page ? ` · ${randomQuote.page}` : ''}
              <button
                type="button"
                className="btn btn-quiet"
                style={{ minHeight: 30, padding: '0 8px', marginLeft: 10 }}
                onClick={() => setQuoteIndex((i) => (i + 1) % pool.length)}
                aria-label="换一条摘抄"
              >
                <RefreshCw size={12} /> 换一条
              </button>
            </footer>
          </div>
        ) : (
          <div className="hero-quote">
            <p>读到喜欢的句子，就把它收进这里，日后再与它相遇。</p>
            <footer><Link to="/quotes" className="link-more">去记第一条摘抄 <ArrowUpRight size={12} /></Link></footer>
          </div>
        )}
      </section>

      <section className="stat-strip" aria-label="阅读概览">
        <div className="stat-cell">
          <div className="stat-num">{stats.totalBooks}</div>
          <div className="stat-label">书架上的书</div>
        </div>
        <div className="stat-cell">
          <div className="stat-num">{stats.totalNotes}</div>
          <div className="stat-label">写下的笔记</div>
        </div>
        <div className="stat-cell">
          <div className="stat-num">{stats.thisMonthFinished}<small>本</small></div>
          <div className="stat-label">本月读完</div>
        </div>
        <div className="stat-cell">
          <div className="stat-num">{stats.finishedBooks}<small>本</small></div>
          <div className="stat-label">累计读完</div>
        </div>
      </section>

      <div className="home-columns">
        <div>
          <section className="home-section">
            <div className="section-head">
              <h2>正在读</h2>
              <span className="head-extra"><Link className="link-more" to="/books">书架 <ArrowUpRight size={12} /></Link></span>
            </div>
            {reading.length ? (
              reading.slice(0, 4).map((b) => (
                <Link className="book-row" to={`/books/${b.id}`} key={b.id}>
                  <Cover book={b} className="mini-cover" />
                  <div className="row-body">
                    <div className="row-title">{b.title}</div>
                    <div className="row-meta">{b.author || '佚名'} · 读到 {b.progress}%</div>
                  </div>
                  <div className="row-progress">
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${b.progress}%` }} /></div>
                    <span>{b.progress}%</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="empty" style={{ padding: '28px 0', textAlign: 'left' }}>
                <p>书架上还没有在读的书。</p>
                <Link className="btn btn-outline" to="/books?add=1"><Plus size={15} /> 添加一本书</Link>
              </div>
            )}
          </section>

          <section className="home-section">
            <div className="section-head">
              <h2>最近的笔记</h2>
              <span className="head-extra"><Link className="link-more" to="/notes">全部笔记 <ArrowUpRight size={12} /></Link></span>
            </div>
            {recentNotes.length ? (
              recentNotes.map((n) => (
                <Link className="note-row" to={`/notes/${n.id}`} key={n.id}>
                  <div className="row-title">{n.title || '无标题笔记'}</div>
                  <div className="row-excerpt">{excerpt(stripHtml(n.content), 110) || '（空白笔记）'}</div>
                  <div className="row-meta">
                    {bookById(data, n.bookId)?.title ?? '未关联书籍'} · {relativeTime(n.updatedAt)}
                    {n.favorite ? ' · 已收藏' : ''}
                  </div>
                </Link>
              ))
            ) : (
              <div className="empty" style={{ padding: '28px 0', textAlign: 'left' }}>
                <p>还没有笔记。读到一个想法，就顺手写下来。</p>
                <Link className="btn btn-outline" to="/notes/new"><Plus size={15} /> 写一条笔记</Link>
              </div>
            )}
          </section>
        </div>

        <div>
          <section className="home-section">
            <div className="section-head"><h2>阅读进度</h2></div>
            {reading.length ? (
              reading.map((b) => (
                <div key={b.id} style={{ padding: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
                    <Link to={`/books/${b.id}`} className="serif" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</Link>
                    <span className="muted">{b.progress}%</span>
                  </div>
                  <div className="progress-track" style={{ marginTop: 8 }}>
                    <div className="progress-fill" style={{ width: `${b.progress}%` }} />
                  </div>
                </div>
              ))
            ) : <p className="muted" style={{ fontSize: 14 }}>暂无在读的书。</p>}
            <div className="divider" style={{ margin: '18px 0' }} />
            <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 2 }}>
              <div>在读平均进度 <strong className="serif" style={{ fontSize: 18, color: 'var(--ink)' }}>{stats.avgProgress}%</strong></div>
              <div>想读 {stats.wantBooks} 本 · 暂停 {stats.pausedBooks} 本</div>
            </div>
          </section>

          <section className="home-section">
            <div className="section-head"><h2>本月</h2></div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 2.1 }}>
              <div>读完 <strong className="serif" style={{ color: 'var(--ink)', fontSize: 17 }}>{stats.thisMonthFinished}</strong> 本，目标 {data.settings.monthlyGoal} 本</div>
              <div>新增 {stats.thisMonthNotes} 条笔记、{stats.thisMonthQuotes} 条摘抄</div>
              <div>记录阅读 {stats.thisMonthMinutes} 分钟</div>
            </div>
            <Link to="/stats" className="link-more" style={{ marginTop: 12, display: 'inline-flex' }}>查看统计与目标 <ArrowUpRight size={12} /></Link>
          </section>

          <section className="home-section">
            <div className="section-head"><h2>最近加入书架</h2></div>
            {recentBooks.length ? recentBooks.map((b) => (
              <Link className="book-row" to={`/books/${b.id}`} key={b.id} style={{ padding: '10px 0' }}>
                <Cover book={b} className="mini-cover" />
                <div className="row-body">
                  <div className="row-title">{b.title}</div>
                  <div className="row-meta">{b.author || '佚名'} · {STATUS_LABEL[b.status]}</div>
                </div>
                <span className="muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{formatCNDate(b.updatedAt, false)}</span>
              </Link>
            )) : <p className="muted" style={{ fontSize: 14 }}>书架还是空的。</p>}
          </section>
        </div>
      </div>
    </div>
  )
}
