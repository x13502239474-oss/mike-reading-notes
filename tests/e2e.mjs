/**
 * 端到端实测：使用系统 Chrome 打开生产构建，逐项操作真实 UI。
 * 运行前需先 `npm run build && npm run preview`（端口 4173）。
 */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:4173'
const ARTIFACTS = path.join(ROOT, 'tests', 'artifacts')
const SHOTS = path.join(ROOT, 'tests', 'screenshots')
fs.mkdirSync(ARTIFACTS, { recursive: true })
fs.mkdirSync(SHOTS, { recursive: true })

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
]
const executablePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p))
if (!executablePath) throw new Error('未找到系统 Chrome / Edge，无法运行浏览器实测')

const ok = (msg) => console.log('  ✓', msg)
const errors = []

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,
  locale: 'zh-CN',
})
const page = await context.newPage()
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error' && !/favicon|service worker|manifest/i.test(m.text())) {
    errors.push(`console: ${m.text()}`)
  }
})

const setRange = async (selector, value) => {
  await page.locator(selector).evaluate((el, v) => {
    // React 会劫持 value 属性，必须用原生 setter 才能触发 onChange
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, String(v))
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

try {
  console.log('\n[1] 首页与初始数据')
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('.stat-strip')
  assert.match(await page.locator('h1').first().innerText(), /把读过的书/)
  assert.equal((await page.locator('.stat-num').first().innerText()).trim(), '2')
  await page.screenshot({ path: path.join(SHOTS, '01-home-desktop.png'), fullPage: true })
  ok('首页渲染、示例数据统计与桌面截图')

  console.log('\n[2] 书架：添加 / 编辑 / 进度 / 刷新持久化')
  await page.goto(`${BASE}/#/books`)
  await page.getByRole('button', { name: '添加书籍' }).click()
  await page.locator('#book-title').fill('E2E 测试之书')
  await page.locator('#book-author').fill('端到端作者')
  await page.locator('#book-category').fill('测试分类')
  await page.locator('#book-status').selectOption('reading')
  await setRange('#book-progress', 37)
  const coverPath = path.join(ROOT, 'public', 'icons', 'icon-192.png')
  await page.locator('.cover-upload input[type=file]').setInputFiles(coverPath)
  await page.waitForSelector('.cover-preview img', { timeout: 8000 })
  await page.getByRole('button', { name: '加入书架' }).click()
  await page.waitForSelector('.detail-hero')
  assert.match(await page.locator('.detail-info h1').innerText(), /E2E 测试之书/)
  assert.ok((await page.locator('.detail-hero .book-cover img').count()) > 0)
  ok('添加书籍（含封面上传压缩）后自动进入详情页')

  await page.reload()
  await page.waitForSelector('.detail-hero')
  assert.match(await page.locator('.detail-info h1').innerText(), /E2E 测试之书/)
  assert.ok((await page.locator('.detail-hero .book-cover img').count()) > 0)
  const storedCover = await page.evaluate(() => localStorage.getItem('mojian.data.v1'))
  assert.ok(storedCover.includes('data:image/jpeg'), '封面未以压缩图片形式持久化')
  ok('书籍与封面在刷新后仍然存在')

  await setRange('.progress-editor input[type=range]', 65)
  await page.waitForTimeout(700)
  assert.match(await page.locator('.progress-editor strong').innerText(), /65/)
  await page.reload()
  await page.waitForSelector('.progress-editor')
  assert.match(await page.locator('.progress-editor strong').innerText(), /65/)
  ok('阅读进度修改并持久化')

  await page.getByRole('button', { name: '编辑信息' }).click()
  await page.locator('#book-summary').fill('这是端到端测试写入的全书总结。')
  await page.getByRole('button', { name: '保存修改' }).click()
  await page.waitForTimeout(500)
  assert.match(await page.locator('.detail-section .prose').first().innerText(), /端到端测试写入/)
  ok('编辑书籍与全书总结')

  await page.goto(`${BASE}/#/books`)
  await page.locator('.segmented').getByRole('button', { name: '已读' }).click()
  assert.equal(await page.locator('.book-card').count(), 1, '按「已读」筛选应只剩一本')
  await page.locator('.segmented').getByRole('button', { name: '在读' }).click()
  assert.equal(await page.locator('.book-card').count(), 2, '按「在读」筛选应有两本')
  await page.getByRole('textbox', { name: '搜索书名或作者' }).fill('E2E 测试之书')
  assert.equal(await page.locator('.book-card').count(), 1, '按书名搜索应只剩一本')
  ok('书架状态筛选与书名搜索')

  console.log('\n[3] 笔记编辑器：富文本 / 标签 / 自动保存 / 意外刷新')
  await page.goto(`${BASE}/#/notes/new`)
  await page.waitForSelector('.editor-title-input')
  await page.locator('.editor-title-input').fill('E2E 自动保存笔记')
  await page.locator('.editor-surface').fill('')
  await page.getByRole('button', { name: '粗体 (Ctrl+B)' }).click()
  await page.keyboard.type('加粗这句话，验证自动保存。')
  const editorHtml = await page.locator('.editor-surface').innerHTML()
  assert.match(editorHtml, /<b|<strong/i, `未生成粗体标签：${editorHtml}`)
  await page.getByRole('textbox', { name: '添加标签' }).fill('自动化')
  await page.getByRole('textbox', { name: '添加标签' }).press('Enter')
  await page.waitForTimeout(900)
  assert.match(await page.locator('.editor-save-status').innerText(), /已自动保存/)
  const noteUrl = page.url()
  assert.match(noteUrl, /#\/notes\/[a-z0-9-]+/i)
  ok('富文本粗体、标签、自动保存状态与路由')

  const stored = await page.evaluate(() => localStorage.getItem('mojian.data.v1'))
  assert.ok(stored && stored.includes('加粗这句话'), 'localStorage 中没有笔记正文')
  assert.ok(stored.includes('自动化'), 'localStorage 中没有标签')
  ok('数据实际写入 localStorage')

  await page.reload()
  await page.waitForSelector('.editor-title-input')
  assert.equal(await page.locator('.editor-title-input').inputValue(), 'E2E 自动保存笔记')
  assert.match(await page.locator('.editor-surface').innerText(), /加粗这句话/)
  assert.match(await page.locator('.tag-editor').innerText(), /自动化/)
  ok('刷新（模拟意外关闭）后标题、正文、标签全部恢复')

  console.log('\n[4] 摘抄：新增 / 搜索 / 复制 / 随机回顾')
  await page.goto(`${BASE}/#/quotes`)
  await page.getByRole('button', { name: '记一段话' }).click()
  await page.locator('#quote-text').fill('E2E 测试摘抄原文：知识需要被反复遇见。')
  await page.locator('#quote-thought').fill('一点端到端感想')
  await page.locator('#quote-fav').check()
  await page.getByRole('button', { name: '保存摘抄' }).click()
  await page.waitForTimeout(400)
  assert.ok((await page.getByText('E2E 测试摘抄原文：知识需要被反复遇见。').count()) > 0)
  await page.getByRole('textbox', { name: '搜索摘抄' }).fill('反复遇见')
  await page.waitForTimeout(200)
  assert.equal(await page.locator('.quote-card').count(), 1)
  ok('新增摘抄与内容搜索')

  await page.locator('.quote-card .icon-btn[aria-label="复制摘抄"]').click()
  await page.waitForTimeout(200)
  assert.ok((await page.locator('.toast').count()) > 0, '复制按钮没有反馈')
  await page.getByRole('textbox', { name: '搜索摘抄' }).fill('')
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: '换一条' }).click()
  ok('一键复制有反馈、随机回顾可切换')

  console.log('\n[5] 知识库：全局搜索与主题筛选')
  await page.goto(`${BASE}/#/knowledge?q=加粗这句话`)
  await page.waitForSelector('.result-count')
  assert.match(await page.locator('.result-count').innerText(), /共 [1-9]/)
  await page.getByRole('textbox', { name: '全局搜索' }).fill('瓦尔登湖')
  await page.waitForTimeout(200)
  assert.ok((await page.locator('.result-item').count()) >= 2)
  await page.locator('.filter-row').first().getByRole('button', { name: '#生活', exact: true }).click()
  await page.waitForTimeout(200)
  assert.match(await page.locator('.report-box').innerText(), /这个主题下有/)
  await page.screenshot({ path: path.join(SHOTS, '02-knowledge.png'), fullPage: true })
  ok('按关键词检索、按主题标签聚合')

  console.log('\n[6] 统计：目标设置与阅读记录')
  await page.goto(`${BASE}/#/stats`)
  await page.locator('#goal-year').fill('24')
  await page.getByLabel('阅读分钟数').fill('45')
  await page.getByLabel('备注').fill('E2E 阅读记录')
  await page.getByRole('button', { name: '记一笔' }).click()
  await page.waitForTimeout(700)
  assert.ok((await page.getByText('E2E 阅读记录').count()) > 0)
  await page.reload()
  await page.waitForSelector('#goal-year')
  assert.equal(await page.locator('#goal-year').inputValue(), '24')
  assert.ok((await page.getByText('E2E 阅读记录').count()) > 0)
  ok('目标与阅读记录均持久化')

  console.log('\n[7] 数据管理：导出 → 校验恢复 → 撤销恢复')
  await page.goto(`${BASE}/#/settings`)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出备份' }).click(),
  ])
  const backupPath = path.join(ARTIFACTS, 'e2e-backup.json')
  await download.saveAs(backupPath)
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
  assert.equal(backup.meta.format, 'mojian-backup')
  assert.ok(backup.meta.counts.books >= 3)
  assert.ok(backup.data.notes.some((n) => n.tags.includes('自动化')))
  ok(`导出 JSON 备份（${backup.meta.counts.books} 本书 / ${backup.meta.counts.notes} 条笔记）`)

  await page.goto(`${BASE}/#/books?add=1`)
  await page.waitForSelector('#book-title')
  await page.locator('#book-title').fill('恢复前临时书')
  await page.getByRole('button', { name: '加入书架' }).click()
  await page.waitForTimeout(400)
  ok('备份之后新增一条临时数据，用于验证覆盖效果')

  await page.goto(`${BASE}/#/settings`)
  await page.locator('input[type=file]').setInputFiles(backupPath)
  await page.waitForSelector('.modal')
  assert.match(await page.locator('.modal-body').innerText(), /校验通过/)
  assert.match(await page.locator('.modal-body').innerText(), /当前 \/ 备份/)
  ok('恢复前完成数据校验并显示数量对比')

  await page.locator('.modal .checkbox-row input').check()
  await page.locator('.modal').getByRole('button', { name: '覆盖并恢复' }).click()
  await page.waitForTimeout(600)
  await page.goto(`${BASE}/#/books`)
  await page.waitForSelector('.book-grid')
  assert.equal(await page.getByText('恢复前临时书').count(), 0, '恢复后临时书不应存在')
  assert.ok((await page.getByText('E2E 测试之书').count()) > 0, '备份中的书应保留')
  ok('确认后正确覆盖，且备份内容完整')

  await page.goto(`${BASE}/#/settings`)
  await page.getByRole('button', { name: '撤销上次恢复' }).click()
  await page.locator('.modal').getByRole('button', { name: '撤销恢复' }).click()
  await page.waitForTimeout(500)
  await page.goto(`${BASE}/#/books`)
  assert.ok((await page.getByText('恢复前临时书').count()) > 0, '回滚点应恢复临时书')
  ok('撤销恢复（回滚点）可用')

  // 拒绝非法备份
  const badPath = path.join(ARTIFACTS, 'bad-backup.json')
  fs.writeFileSync(badPath, '{"hello":"world"}', 'utf8')
  await page.goto(`${BASE}/#/settings`)
  await page.locator('input[type=file]').setInputFiles(badPath)
  await page.waitForSelector('.modal')
  assert.match(await page.locator('.modal-body').innerText(), /校验未通过/)
  assert.equal(await page.locator('.modal').getByRole('button', { name: '覆盖并恢复' }).isDisabled(), true)
  await page.locator('.modal').getByRole('button', { name: '取消' }).click()
  ok('非法备份被拒绝且不会覆盖现有数据')

  console.log('\n[8] 夜间模式与 PWA')
  await page.goto(`${BASE}/#/settings`)
  assert.equal(await page.locator('.modal-backdrop').count(), 0, '连续操作后不应残留弹层遮罩')
  await page.getByRole('button', { name: '切换为夜读模式' }).click()
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'night')
  await page.waitForTimeout(400) // 等主题过渡结束，避免截图捕获中间色
  await page.screenshot({ path: path.join(SHOTS, '03-settings-night.png'), fullPage: true })
  await page.locator('.settings-block').first().getByRole('button', { name: '切换为日间模式' }).click()
  ok('夜间模式切换')

  for (const file of ['manifest.webmanifest', 'sw.js', 'icons/icon-192.png', 'icons/icon-180.png']) {
    const res = await page.request.get(`${BASE}/${file}`)
    assert.equal(res.status(), 200, `${file} 不可访问`)
  }
  const manifest = await (await page.request.get(`${BASE}/manifest.webmanifest`)).json()
  assert.equal(manifest.display, 'standalone')
  ok('PWA manifest、Service Worker、图标均可访问')

  console.log('\n[9] iPhone 视口适配')
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'zh-CN',
  })
  const mp = await mobile.newPage()
  mp.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`))
  await mp.goto(BASE, { waitUntil: 'networkidle' })
  await mp.waitForSelector('.mobile-tabbar')
  assert.equal(await mp.locator('.mobile-tabbar').isVisible(), true)
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  assert.ok(overflow <= 1, `首页存在横向溢出 ${overflow}px`)
  await mp.screenshot({ path: path.join(SHOTS, '04-home-mobile.png'), fullPage: true })
  await mp.locator('.tab-item', { hasText: '笔记' }).click()
  await mp.waitForTimeout(300)
  assert.match(mp.url(), /#\/notes/)
  await mp.screenshot({ path: path.join(SHOTS, '05-notes-mobile.png'), fullPage: true })
  await mp.locator('.tab-item', { hasText: '更多' }).click()
  await mp.waitForTimeout(200)
  assert.ok((await mp.getByText('数据管理与设置').count()) > 0)
  await mp.screenshot({ path: path.join(SHOTS, '06-more-mobile.png'), fullPage: true })
  ok('底部导航、无横向溢出、更多页入口可用')
  await mobile.close()

  console.log('\n[10] 运行时错误检查')
  if (errors.length) throw new Error(`发现 ${errors.length} 个运行时错误：\n${errors.join('\n')}`)
  ok('无未捕获异常与控制台错误')

  console.log('\n全部端到端测试通过 ✅')
} catch (e) {
  console.error('\n端到端测试失败：', e.message)
  try {
    await page.screenshot({ path: path.join(SHOTS, 'FAIL.png'), fullPage: true })
    console.log('已保存失败现场截图 tests/screenshots/FAIL.png')
  } catch { /* ignore */ }
  process.exitCode = 1
} finally {
  await context.close()
  await browser.close()
}
