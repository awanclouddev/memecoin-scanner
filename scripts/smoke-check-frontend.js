#!/usr/bin/env node
const puppeteer = require('puppeteer')

async function singleRun() {
  const url = process.env.URL || 'http://localhost:3000/'
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  // capture console logs and page errors to help debugging client render issues
  page.on('console', msg => {
    try { console.log('PAGE LOG:', msg.type(), msg.text()) } catch (e) {}
  })
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err && err.stack ? err.stack : err)
  })
  page.setDefaultNavigationTimeout(120000)
  await page.goto(url, { waitUntil: 'networkidle2' })

  // Wait for client to hydrate and table rows to appear (client component may lazy-load)
  // Retry if client doesn't hydrate immediately
  const maxAttempts = 5
  let attempt = 0
  while (attempt < maxAttempts) {
    try {
      await page.waitForFunction(() => !document.querySelector('p') || document.querySelectorAll('table tbody tr').length > 0, { timeout: 30000 })
      break
    } catch (e) {
      attempt++
      if (attempt >= maxAttempts) throw e
      await page.reload({ waitUntil: 'networkidle2' })
      // small grace period for client hydrate
      await page.waitForTimeout(5000)
    }
  }

  // Try a couple of possible selectors to find the first product name
  const selectors = [
    'table tbody tr td:nth-child(2) .font-medium',
    'table tbody tr td:nth-child(2) div.font-medium',
    'table tbody tr td:nth-child(2) .text-sm',
    'table tbody tr td:nth-child(2)'
  ]
  let firstName = null
  for (const s of selectors) {
    try {
      firstName = await page.$eval(s, el => el.textContent.trim())
      if (firstName) break
    } catch (e) {}
  }
  if (!firstName) {
    try {
      const tableHTML = await page.$eval('table', el => el.outerHTML)
      console.error('TABLE_HTML_DUMP:\n', tableHTML.slice(0, 4000))
    } catch (e) {
      console.error('TABLE not found in DOM')
    }
    throw new Error('first name selector not found')
  }

  let firstRowHtml = null
  try { firstRowHtml = await page.$eval('table tbody tr', el => el.outerHTML) } catch (e) {}

  await browser.close()
  return { name: firstName, rowHtml: firstRowHtml }
}

async function main() {
  const attempts = 3
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await singleRun()
      console.log('firstCoinName:', res.name)
      if (res.rowHtml) console.log('\nFIRST_ROW_HTML_SNIPPET:\n', res.rowHtml.slice(0, 2000))
      return
    } catch (e) {
      console.error('attempt', i + 1, 'failed:', e.message || e)
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 5000))
    }
  }
  throw new Error('All attempts failed')
}

main().catch(e => { console.error(e); process.exit(2) })
