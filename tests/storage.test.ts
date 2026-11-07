import { describe, expect, it } from 'vitest'
import {
  buildKnowledgeItems,
  computeStats,
  countSamples,
  createEmptyData,
  makeSampleData,
  removeSamples,
  searchKnowledge,
  serializeBackup,
  validateBackup,
} from '../src/lib/storage'
import { sanitizeHtml, stripHtml } from '../src/lib/utils'

describe('示例数据与清理', () => {
  it('初始示例全部带 sample 标记，且可一次性清除', () => {
    const data = makeSampleData()
    expect(data.books.length).toBeGreaterThan(0)
    expect(data.books.every((b) => b.sample)).toBe(true)
    expect(countSamples(data)).toBe(
      data.books.length + data.notes.length + data.quotes.length + data.logs.length,
    )
    const cleaned = removeSamples(data)
    expect(cleaned.books).toHaveLength(0)
    expect(cleaned.notes).toHaveLength(0)
    expect(cleaned.quotes).toHaveLength(0)
    expect(cleaned.seeded).toBe(true) // 清除后不会重新生成示例
  })
})

describe('富文本清洗与纯文本提取', () => {
  it('剥离脚本、事件属性与非白名单标签', () => {
    const dirty = '<p onclick="alert(1)">你好<script>alert(2)</script><b>粗</b><a href="javascript:evil">链接</a><blockquote>引</blockquote></p><style>x</style>'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toMatch(/script|onclick|javascript|style|<a/i)
    expect(clean).toContain('<p>')
    expect(clean).toContain('<b>粗</b>')
    expect(clean).toContain('<blockquote>引</blockquote>')
    expect(clean).toContain('链接') // 去掉标签但保留文字
  })

  it('清洗是幂等的', () => {
    const html = '<h2>标题</h2><p>一段<strong>加粗</strong>与<em>斜体</em></p><ul><li>一</li><li>二</li></ul>'
    expect(sanitizeHtml(sanitizeHtml(html))).toBe(sanitizeHtml(html))
  })

  it('stripHtml 正确还原段落与实体', () => {
    expect(stripHtml('<p>第一句</p><p>第二句 &amp; 结束</p>')).toContain('第二句 & 结束')
    expect(stripHtml('<p>第一句</p><p>第二句</p>')).toContain('\n')
  })
})

describe('备份导出 / 校验 / 恢复', () => {
  const original = makeSampleData()
  const json = serializeBackup(original)

  it('导出的备份结构完整且关系一致', () => {
    const parsed = JSON.parse(json)
    expect(parsed.meta.format).toBe('mojian-backup')
    expect(parsed.meta.counts.books).toBe(original.books.length)
    const report = validateBackup(json)
    expect(report.ok).toBe(true)
    expect(report.counts?.books).toBe(original.books.length)
    expect(report.counts?.notes).toBe(original.notes.length)
    expect(report.counts?.quotes).toBe(original.quotes.length)
    const ids = new Set(report.data!.books.map((b) => b.id))
    for (const n of report.data!.notes) {
      if (n.bookId) expect(ids.has(n.bookId)).toBe(true)
    }
    for (const q of report.data!.quotes) {
      if (q.bookId) expect(ids.has(q.bookId)).toBe(true)
    }
    // 标签关系随条目一起保存
    expect(report.data!.notes[0].tags).toEqual(original.notes[0].tags)
  })

  it('恢复后再导出，仍然完全一致（往返幂等）', () => {
    const first = validateBackup(json)
    const second = validateBackup(serializeBackup(first.data!))
    expect(second.ok).toBe(true)
    expect(second.data!.books.length).toBe(first.data!.books.length)
    expect(second.data!.notes[0].content).toBe(first.data!.notes[0].content)
    expect(second.data!.quotes[0].text).toBe(first.data!.quotes[0].text)
    expect(second.data!.settings).toEqual(first.data!.settings)
  })

  it('拒绝非法 JSON、错误结构和缺少数据体的文件', () => {
    expect(validateBackup('').ok).toBe(false)
    expect(validateBackup('{not json').ok).toBe(false)
    expect(validateBackup('[]').ok).toBe(false)
    expect(validateBackup('{"foo":1}').ok).toBe(false)
    expect(validateBackup('{"books":[],"notes":[]}').ok).toBe(false)
  })

  it('修复悬空引用、重复 ID、越界数值与不安全封面', () => {
    const broken = JSON.parse(json)
    broken.data.notes[0].bookId = 'ghost-book'
    broken.data.quotes[0].bookId = 'ghost-book'
    broken.data.books[1].id = broken.data.books[0].id
    broken.data.books[0].progress = 999
    broken.data.books[0].rating = -3
    broken.data.books[0].cover = 'javascript:alert(1)'
    broken.data.notes[0].tags = ['重复', '重复', 42, null]
    const report = validateBackup(JSON.stringify(broken))
    expect(report.ok).toBe(true)
    expect(report.data!.notes[0].bookId).toBeNull()
    expect(report.data!.quotes[0].bookId).toBeNull()
    expect(report.data!.books[0].id).not.toBe(report.data!.books[1].id)
    expect(report.data!.books[0].progress).toBe(100)
    expect(report.data!.books[0].rating).toBe(0)
    expect(report.data!.books[0].cover).toBeUndefined()
    expect(report.data!.notes[0].tags).toEqual(['重复'])
    expect(report.issues.join('')).toContain('不存在')
  })

  it('空档案也给出明确的提示', () => {
    const report = validateBackup(serializeBackup(createEmptyData()))
    expect(report.ok).toBe(true)
    expect(report.issues.join('')).toContain('空档案')
  })

  it('兼容不带 meta 包装的裸数据', () => {
    const report = validateBackup(JSON.stringify(original))
    expect(report.ok).toBe(true)
    expect(report.counts?.books).toBe(original.books.length)
  })
})

describe('知识库检索', () => {
  const data = makeSampleData()

  it('把书籍、笔记、摘抄整合成统一条目', () => {
    const items = buildKnowledgeItems(data)
    expect(items.length).toBe(data.books.length + data.notes.length + data.quotes.length)
    expect(new Set(items.map((i) => i.kind))).toEqual(new Set(['book', 'note', 'quote']))
    expect(items.find((i) => i.kind === 'note')?.body).toContain('梭罗')
  })

  it('按关键词搜索标题与正文', () => {
    const byTitle = searchKnowledge(data, { query: '简朴' })
    expect(byTitle.some((i) => i.kind === 'note')).toBe(true)
    const byBody = searchKnowledge(data, { query: '丛林' })
    expect(byBody.length).toBeGreaterThan(0)
    expect(byBody.every((i) => i.kind === 'quote')).toBe(true)
  })

  it('按标签、书籍、类型组合筛选', () => {
    const tagged = searchKnowledge(data, { tags: ['生活'] })
    expect(tagged.length).toBeGreaterThan(0)
    expect(tagged.every((i) => i.tags.includes('生活'))).toBe(true)
    const bookId = data.books[0].id
    const byBook = searchKnowledge(data, { bookId, kind: 'quote' })
    expect(byBook.length).toBeGreaterThan(0)
    expect(byBook.every((i) => i.bookId === bookId && i.kind === 'quote')).toBe(true)
  })

  it('按时间排序可用', () => {
    const newest = searchKnowledge(data, { sort: 'newest' })
    const oldest = searchKnowledge(data, { sort: 'oldest' })
    expect(new Date(newest[0].date).getTime()).toBeGreaterThanOrEqual(new Date(oldest[0].date).getTime())
  })
})

describe('统计', () => {
  it('汇总数量与示例数据一致', () => {
    const stats = computeStats(makeSampleData())
    expect(stats.totalBooks).toBe(2)
    expect(stats.finishedBooks).toBe(1)
    expect(stats.readingBooks).toBe(1)
    expect(stats.totalNotes).toBe(1)
    expect(stats.totalQuotes).toBe(2)
    expect(stats.monthlyFinished).toHaveLength(6)
    expect(stats.avgProgress).toBeGreaterThan(0)
  })
})
