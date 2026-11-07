import { useMemo, useState, type ChangeEvent } from 'react'
import { Download, Upload, RotateCcw, Trash2, Moon, Sun, Save, ShieldCheck, AlertTriangle } from 'lucide-react'
import { useApp } from '../state/AppContext'
import {
  clearSnapshot,
  countSamples,
  createEmptyData,
  readSnapshot,
  removeSamples,
  saveSnapshot,
  serializeBackup,
  validateBackup,
} from '../lib/storage'
import type { BackupReport } from '../lib/types'
import { downloadText, formatBytes, formatCNDate, todayStr } from '../lib/utils'
import { ConfirmDialog } from '../components/ConfirmDialog'

const LIMIT_BYTES = 5 * 1024 * 1024

export function DataSettings() {
  const { data, theme, setTheme, replaceData, flushSave, saveState, toast } = useApp()
  const [importState, setImportState] = useState<{ filename: string; report: BackupReport } | null>(null)
  const [importConfirmed, setImportConfirmed] = useState(false)
  const [undoOpen, setUndoOpen] = useState(false)
  const [clearSamplesOpen, setClearSamplesOpen] = useState(false)
  const [clearAllOpen, setClearAllOpen] = useState(false)
  const [clearAllConfirmed, setClearAllConfirmed] = useState(false)

  const samples = countSamples(data)
  const snapshot = useMemo(() => readSnapshot(), [data])
  const usage = Math.min(100, Math.round((saveState.bytes / LIMIT_BYTES) * 100))
  const counts = {
    books: data.books.length,
    notes: data.notes.length,
    quotes: data.quotes.length,
    logs: data.logs.length,
  }

  const exportBackup = () => {
    flushSave()
    downloadText(`mike-reading-notes-backup-${todayStr()}.json`, serializeBackup(data))
    toast('备份已导出，请把文件保存到安全的地方', 'success')
  }

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 30 * 1024 * 1024) {
      toast('文件超过 30 MB，可能不是麦克·读书笔记备份', 'error')
      return
    }
    try {
      const text = await file.text()
      const report = validateBackup(text)
      setImportConfirmed(false)
      setImportState({ filename: file.name, report })
      if (!report.ok) toast(`备份校验未通过：${report.error}`, 'error')
    } catch {
      toast('无法读取这个文件', 'error')
    }
  }

  const doRestore = () => {
    if (!importState?.report.ok || !importState.report.data) return
    const ok = saveSnapshot(data)
    replaceData(importState.report.data)
    setImportState(null)
    setImportConfirmed(false)
    toast(ok ? '数据已恢复，旧数据已保留为回滚点' : '数据已恢复（回滚点保存失败）', 'success')
  }

  const doUndo = () => {
    const snap = readSnapshot()
    if (!snap) { toast('没有可撤销的恢复记录', 'error'); setUndoOpen(false); return }
    replaceData(snap.data)
    clearSnapshot()
    setUndoOpen(false)
    toast('已撤销上次恢复', 'success')
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">DATA & SETTINGS</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>数据管理与设置</h1>
          <p>你的档案只属于这台设备，记得定期留一份备份</p>
        </div>
      </div>

      <section className="settings-block">
        <h3>外观</h3>
        <p>夜里读书可以切换到低亮度的墨色主题，偏好也会保存在本机。</p>
        <div className="settings-row">
          <button className="btn btn-outline" onClick={() => setTheme(theme === 'night' ? 'light' : 'night')}>
            {theme === 'night' ? <Sun size={15} /> : <Moon size={15} />}
            {theme === 'night' ? '切换为日间模式' : '切换为夜读模式'}
          </button>
          <span className="spacer" />
          <span className="muted" style={{ fontSize: 12 }}>当前：{theme === 'night' ? '夜读' : '日间'}</span>
        </div>
      </section>

      <section className="settings-block">
        <h3>档案概况</h3>
        <p>下面是这份档案的全部内容，导出时它们会一起打包。</p>
        <div className="stat-strip" style={{ margin: 0 }}>
          <div className="stat-cell"><div className="stat-num">{counts.books}</div><div className="stat-label">书籍</div></div>
          <div className="stat-cell"><div className="stat-num">{counts.notes}</div><div className="stat-label">笔记</div></div>
          <div className="stat-cell"><div className="stat-num">{counts.quotes}</div><div className="stat-label">摘抄</div></div>
          <div className="stat-cell"><div className="stat-num">{counts.logs}</div><div className="stat-label">阅读记录</div></div>
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)' }}>
            <span>浏览器本地存储占用（估算上限 5 MB）</span>
            <span>{formatBytes(saveState.bytes)} · {usage}%</span>
          </div>
          <div className="storage-bar"><div style={{ width: `${Math.max(1, usage)}%` }} /></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
            <button className="btn btn-outline" onClick={() => { flushSave(); toast('已立即写入本机', 'success') }}><Save size={15} /> 立即保存</button>
            <span className="muted" style={{ fontSize: 12 }}>
              {saveState.status === 'error' ? saveState.error : `上次写入 ${formatCNDate(saveState.at, false)}`}
            </span>
          </div>
        </div>
      </section>

      <section className="settings-block">
        <h3>备份与恢复</h3>
        <p>
          导出会得到一个完整的 JSON 文件，包含书籍、笔记、摘抄、标签、阅读记录与设置，以及它们之间的关联。
          恢复前会先校验文件结构与引用关系，再由你确认覆盖。
        </p>
        <div className="data-cards">
          <div className="data-card">
            <h4><Download size={14} style={{ verticalAlign: -2, marginRight: 6 }} />导出 JSON 备份</h4>
            <p>建议每月导出一次，或在大批量录入之后导出。文件可以放在网盘、U 盘或邮箱里。</p>
            <button className="btn btn-primary" onClick={exportBackup}><Download size={15} /> 导出备份</button>
          </div>
          <div className="data-card">
            <h4><Upload size={14} style={{ verticalAlign: -2, marginRight: 6 }} />从 JSON 恢复</h4>
            <p>选择麦克·读书笔记导出的 .json 文件。校验通过后需二次确认；恢复前会自动留一份回滚点。</p>
            <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
              <Upload size={15} /> 选择备份文件
              <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={(e) => void handleFile(e)} />
            </label>
          </div>
        </div>
        {snapshot && (
          <div className="settings-row" style={{ marginTop: 16 }}>
            <RotateCcw size={15} className="muted" />
            <span className="muted" style={{ fontSize: 13 }}>存在 {formatCNDate(snapshot.savedAt, false)} 的回滚点（恢复前的数据）</span>
            <span className="spacer" />
            <button className="btn btn-quiet" onClick={() => setUndoOpen(true)}>撤销上次恢复</button>
          </div>
        )}
      </section>

      <section className="settings-block">
        <h3>清理</h3>
        <p>初始页面带有少量标注为「示例」的内容，随时可以移除，之后不会再自动生成。</p>
        <div className="settings-row">
          <button className="btn btn-outline" disabled={samples === 0} onClick={() => setClearSamplesOpen(true)}>
            <Trash2 size={15} /> 清除示例数据（{samples}）
          </button>
          <span className="spacer" />
          <button className="btn btn-danger" onClick={() => { setClearAllConfirmed(false); setClearAllOpen(true) }}>
            清空全部数据
          </button>
        </div>
      </section>

      <section className="settings-block" style={{ borderBottom: 0 }}>
        <h3><ShieldCheck size={16} style={{ verticalAlign: -2, marginRight: 6 }} />关于存储</h3>
        <div style={{ fontSize: 13, lineHeight: 2, color: 'var(--ink-2)', maxWidth: '70ch' }}>
          <p>数据保存在浏览器的 localStorage 中，关闭浏览器、重启电脑都不会丢失；网站不联网、不上传、不需要账号。</p>
          <p><strong>会丢失数据的情况</strong>：清除浏览器网站数据、使用无痕模式、卸载浏览器、更换设备或浏览器。因此请定期导出备份。</p>
          <p>封面图片会被压缩到较小尺寸后以文本形式一起保存；纯文字笔记可以积累很多年，但浏览器通常给单个站点约 5 MB 空间，若接近上限请删除部分封面或导出后清理。</p>
          <p>整份档案是一个自包含的 JSON（书籍、笔记、摘抄通过 ID 关联，标签内嵌在条目上），未来接入多设备同步时可直接作为同步单元扩展。</p>
        </div>
      </section>

      {importState && (
        <ConfirmDialog
          title="恢复前确认"
          tone="danger"
          confirmText="覆盖并恢复"
          disabled={!importState.report.ok || !importConfirmed}
          onCancel={() => { setImportState(null); setImportConfirmed(false) }}
          onConfirm={doRestore}
        >
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>文件：{importState.filename}</p>
          {!importState.report.ok ? (
            <div className="report-box" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
              <AlertTriangle size={15} style={{ verticalAlign: -3, marginRight: 6 }} />
              校验未通过：{importState.report.error}
              <p style={{ marginTop: 8, fontSize: 13 }}>当前数据不会被改动，请确认选择的是麦克·读书笔记导出的备份文件。</p>
            </div>
          ) : (
            <>
              <div className="report-box">
                <strong>校验通过</strong>
                {importState.report.exportedAt && <span> · 备份导出于 {formatCNDate(importState.report.exportedAt)}</span>}
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                  <div><div className="muted" style={{ fontSize: 11 }}>当前 / 备份</div><div className="serif" style={{ fontSize: 18 }}>{counts.books} / {importState.report.counts?.books}</div><div className="muted" style={{ fontSize: 11 }}>书籍</div></div>
                  <div><div className="muted" style={{ fontSize: 11 }}>当前 / 备份</div><div className="serif" style={{ fontSize: 18 }}>{counts.notes} / {importState.report.counts?.notes}</div><div className="muted" style={{ fontSize: 11 }}>笔记</div></div>
                  <div><div className="muted" style={{ fontSize: 11 }}>当前 / 备份</div><div className="serif" style={{ fontSize: 18 }}>{counts.quotes} / {importState.report.counts?.quotes}</div><div className="muted" style={{ fontSize: 11 }}>摘抄</div></div>
                </div>
                {importState.report.issues.length > 0 && (
                  <>
                    <div style={{ marginTop: 12 }}><strong>校验提示（{importState.report.issues.length}）</strong></div>
                    <ul>{importState.report.issues.slice(0, 20).map((issue, i) => <li key={i}>{issue}</li>)}</ul>
                  </>
                )}
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={importConfirmed} onChange={(e) => setImportConfirmed(e.target.checked)} />
                <span>我确认这份备份是正确的，并知悉恢复会<strong>覆盖当前全部 {counts.books + counts.notes + counts.quotes} 条内容</strong>。系统会先保存一份可撤销的回滚点。</span>
              </label>
            </>
          )}
        </ConfirmDialog>
      )}

      {undoOpen && (
        <ConfirmDialog title="撤销上次恢复？" confirmText="撤销恢复" onCancel={() => setUndoOpen(false)} onConfirm={doUndo}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-2)' }}>
            将回到恢复之前的数据（{snapshot ? formatCNDate(snapshot.savedAt) : '—'}），恢复之后新增或修改的内容会被覆盖。
          </p>
        </ConfirmDialog>
      )}

      {clearSamplesOpen && (
        <ConfirmDialog title="清除示例数据？" confirmText="清除示例" tone="danger" onCancel={() => setClearSamplesOpen(false)} onConfirm={() => {
          replaceData(removeSamples(data))
          setClearSamplesOpen(false)
          toast('示例数据已清除', 'success')
        }}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-2)' }}>
            将移除 {samples} 条标注为「示例」的书籍、笔记、摘抄与记录，你自己添加的内容不受影响。
          </p>
        </ConfirmDialog>
      )}

      {clearAllOpen && (
        <ConfirmDialog title="清空全部数据？" confirmText="我确认清空" tone="danger" disabled={!clearAllConfirmed} onCancel={() => setClearAllOpen(false)} onConfirm={() => {
          saveSnapshot(data)
          replaceData(createEmptyData())
          setClearAllOpen(false)
          toast('数据已清空，可在回滚点中撤销', 'success')
        }}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-2)' }}>
            这会删除全部 {counts.books} 本书、{counts.notes} 条笔记、{counts.quotes} 条摘抄与阅读记录。
            建议先导出备份；系统仍会留一份可撤销的回滚点。
          </p>
          <label className="checkbox-row">
            <input type="checkbox" checked={clearAllConfirmed} onChange={(e) => setClearAllConfirmed(e.target.checked)} />
            <span>我已备份或不再需要这些数据，确认清空。</span>
          </label>
        </ConfirmDialog>
      )}
    </div>
  )
}
