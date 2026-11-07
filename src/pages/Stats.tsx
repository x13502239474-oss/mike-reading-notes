import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { computeStats } from '../lib/storage'
import { formatCNDate, monthKey, todayStr, STATUS_LABEL } from '../lib/utils'

export function Stats() {
  const { data, setSettings, addLog, deleteLog, toast } = useApp()
  const stats = useMemo(() => computeStats(data), [data])
  const [logBook, setLogBook] = useState('')
  const [logDate, setLogDate] = useState(todayStr())
  const [logMinutes, setLogMinutes] = useState(30)
  const [logNote, setLogNote] = useState('')

  const maxMonth = Math.max(1, ...stats.monthlyFinished.map((m) => m.count))
  const thisMonth = monthKey(todayStr())
  const yearProgress = data.settings.yearlyGoal > 0
    ? Math.min(100, Math.round((stats.yearlyFinished / data.settings.yearlyGoal) * 100))
    : 0
  const monthProgress = data.settings.monthlyGoal > 0
    ? Math.min(100, Math.round((stats.thisMonthFinished / data.settings.monthlyGoal) * 100))
    : 0
  const finishedBooks = data.books
    .filter((b) => b.status === 'finished')
    .sort((a, b) => (b.finishDate ?? b.updatedAt).localeCompare(a.finishDate ?? a.updatedAt))
  const avgRating = (() => {
    const rated = data.books.filter((b) => b.rating > 0)
    return rated.length ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : '—'
  })()

  const submitLog = () => {
    if (logMinutes <= 0) { toast('请填写大于 0 的阅读分钟数', 'error'); return }
    addLog({ bookId: logBook || null, date: logDate, minutes: logMinutes, note: logNote.trim() })
    setLogNote('')
    toast('阅读记录已添加', 'success')
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">READING PLAN</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>阅读计划与统计</h1>
          <p>轻量记录，不必成为负担</p>
        </div>
      </div>

      <section className="goal-line">
        <div>
          <div className="eyebrow">今年已读完</div>
          <div className="goal-big">{stats.yearlyFinished}<small>/ {data.settings.yearlyGoal} 本</small></div>
          <div className="progress-track" style={{ width: 220, marginTop: 12 }}>
            <div className="progress-fill" style={{ width: `${yearProgress}%` }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="field">
            <label htmlFor="goal-year">年度目标（本）</label>
            <input id="goal-year" className="setting-number" type="number" min={0} max={999} value={data.settings.yearlyGoal}
              onChange={(e) => setSettings({ yearlyGoal: Math.max(0, Math.min(999, Number(e.target.value) || 0)) })} />
          </div>
          <div className="field">
            <label htmlFor="goal-month">每月目标（本）</label>
            <input id="goal-month" className="setting-number" type="number" min={0} max={99} value={data.settings.monthlyGoal}
              onChange={(e) => setSettings({ monthlyGoal: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })} />
          </div>
        </div>
      </section>

      <div className="two-columns" style={{ marginTop: 44 }}>
        <section>
          <div className="section-head"><h2>近半年读完</h2></div>
          <div className="month-chart">
            {stats.monthlyFinished.map((m) => (
              <div className={`month-col ${m.month === thisMonth ? 'is-current' : ''}`} key={m.month}>
                <strong>{m.count || ''}</strong>
                <div className="month-bar" style={{ height: `${m.count ? Math.max(8, (m.count / maxMonth) * 110) : 3}px` }} />
                <span>{Number(m.month.slice(5))}月</span>
              </div>
            ))}
          </div>
          <div className="divider" style={{ margin: '24px 0' }} />
          <div className="section-head"><h2>这个月</h2></div>
          <div style={{ fontSize: 14, lineHeight: 2.1, color: 'var(--ink-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>读完 {stats.thisMonthFinished} / {data.settings.monthlyGoal} 本</span><span>{monthProgress}%</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${monthProgress}%` }} /></div>
            <div style={{ marginTop: 12 }}>新增 {stats.thisMonthNotes} 条笔记 · {stats.thisMonthQuotes} 条摘抄</div>
            <div>累计阅读 {stats.thisMonthMinutes} 分钟</div>
          </div>
        </section>

        <section>
          <div className="section-head"><h2>书架一览</h2></div>
          <div style={{ fontSize: 14, lineHeight: 2.1, color: 'var(--ink-2)' }}>
            <div>藏书 {stats.totalBooks} 本 · 已读 {stats.finishedBooks} 本 · 在读 {stats.readingBooks} 本</div>
            <div>想读 {stats.wantBooks} 本 · 暂停 {stats.pausedBooks} 本</div>
            <div>平均评分 {avgRating} · 在读平均进度 {stats.avgProgress}%</div>
            <div>累计 {stats.totalNotes} 条笔记 · {stats.totalQuotes} 条摘抄</div>
          </div>
          <div className="divider" style={{ margin: '20px 0' }} />
          <div className="section-head"><h2>最近读完</h2></div>
          {finishedBooks.length ? finishedBooks.slice(0, 6).map((b) => (
            <div className="log-item" key={b.id}>
              <Link to={`/books/${b.id}`} className="serif" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{b.title}</Link>
              <span className="spacer" />
              <span className="muted" style={{ fontSize: 12 }}>{formatCNDate(b.finishDate, false)}</span>
              <span className={`status-text-${b.status}`} style={{ fontSize: 12 }}>{STATUS_LABEL[b.status]}</span>
            </div>
          )) : <p className="muted" style={{ fontSize: 14 }}>还没有读完的书。</p>}
        </section>
      </div>

      <section style={{ marginTop: 52 }}>
        <div className="section-head"><h2>阅读时间记录</h2></div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>选填。只记时长，不做打卡压力。</p>
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <select className="select" aria-label="选择书籍" style={{ width: 170 }} value={logBook} onChange={(e) => setLogBook(e.target.value)}>
            <option value="">未关联书籍</option>
            {data.books.map((b) => <option value={b.id} key={b.id}>{b.title}</option>)}
          </select>
          <input className="input" type="date" aria-label="阅读日期" style={{ width: 160 }} value={logDate} onChange={(e) => setLogDate(e.target.value)} />
          <input className="input" type="number" min={1} max={1440} aria-label="阅读分钟数" style={{ width: 110 }} value={logMinutes} onChange={(e) => setLogMinutes(Number(e.target.value) || 0)} />
          <input className="input" aria-label="备注" placeholder="读了什么（选填）" style={{ flex: 1 }} value={logNote} onChange={(e) => setLogNote(e.target.value)} />
          <button className="btn btn-primary" onClick={submitLog}><Plus size={15} /> 记一笔</button>
        </div>
        {data.logs.length ? (
          <div>
            {[...data.logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((l) => (
              <div className="log-item" key={l.id}>
                <span style={{ width: 90, flex: 'none' }} className="muted">{formatCNDate(l.date, false)}</span>
                <span>{data.books.find((b) => b.id === l.bookId)?.title ?? '未关联书籍'}</span>
                <span className="muted" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.note}</span>
                <span className="spacer" />
                <strong className="serif">{l.minutes} 分钟</strong>
                {l.sample && <span className="badge-sample">示例</span>}
                <button className="icon-btn is-danger" aria-label="删除这条记录" onClick={() => { deleteLog(l.id); toast('记录已删除', 'success') }}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        ) : <p className="muted" style={{ fontSize: 14 }}>还没有阅读时间记录。</p>}
      </section>
    </div>
  )
}
