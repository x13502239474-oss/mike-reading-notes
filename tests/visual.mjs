/** 干净上下文下的视觉复核（独立于 E2E 流程，避免残留 toast / 弹层干扰） */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:4173'
const SHOTS = path.join(ROOT, 'tests', 'screenshots')
fs.mkdirSync(SHOTS, { recursive: true })
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const executablePath = fs.existsSync(chrome) ? chrome : edge

const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: 'zh-CN',
  serviceWorkers: 'block',
})
const page = await context.newPage()

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForSelector('.stat-strip')
assert.equal(await page.locator('.modal-backdrop').count(), 0)
const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
console.log('日间背景:', lightBg)

await page.getByRole('button', { name: '切换为夜间模式' }).click()
await page.waitForTimeout(300)
const nightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
const backdropCount = await page.locator('.modal-backdrop').count()
console.log('夜间背景:', nightBg, '| 遮罩数量:', backdropCount)
assert.equal(backdropCount, 0, '夜间页面不应有弹层遮罩')
assert.notEqual(nightBg, lightBg)
await page.screenshot({ path: path.join(SHOTS, '07-night-clean.png') })

await page.getByRole('button', { name: '切换为日间模式' }).click()
await page.waitForTimeout(500)
await page.goto(`${BASE}/#/books`)
await page.waitForSelector('.book-grid')
await page.waitForTimeout(200)
console.log('书架诊断:', await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme || '(light)',
  body: getComputedStyle(document.body).backgroundColor,
  header: getComputedStyle(document.querySelector('.site-header')).backgroundColor,
  backdrops: document.querySelectorAll('.modal-backdrop').length,
  atPoint: Array.from(document.elementsFromPoint(500, 400)).slice(0, 4).map((e) => String(e.className).slice(0, 50)),
})))
await page.screenshot({ path: path.join(SHOTS, '08-books.png'), fullPage: true })

await page.goto(`${BASE}/#/books/sample-book-walden`)
await page.waitForSelector('.detail-hero')
await page.screenshot({ path: path.join(SHOTS, '09-book-detail.png'), fullPage: true })

await page.goto(`${BASE}/#/notes/sample-note-1`)
await page.waitForSelector('.editor-surface')
await page.screenshot({ path: path.join(SHOTS, '10-editor.png'), fullPage: true })

console.log('视觉复核截图已保存')
await context.close()
await browser.close()
