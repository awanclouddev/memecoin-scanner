#!/usr/bin/env node
const puppeteer = require('puppeteer')

async function main() {
  const url = process.env.URL || 'http://localhost:3000/'
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  page.on('console', msg => { try { console.log('PAGE LOG:', msg.type(), msg.text()) } catch (e) {} })
  page.on('pageerror', err => { console.error('PAGE ERROR:', err && err.stack ? err.stack : err) })
  await page.goto(url, { waitUntil: 'networkidle2' })

  // wait for rows
  await page.waitForSelector('table tbody tr', { timeout: 30000 })

  // click first address link
  const firstLink = await page.$('table tbody tr td a')
  if (!firstLink) {
    console.error('NO_ADDRESS_LINK')
    await browser.close()
    process.exit(2)
  }
  await firstLink.click()

  // wait for portal container
  try {
    await page.waitForSelector('.modal-portal', { timeout: 5000 })
    const modalHtml = await page.$eval('.modal-portal', el => el.innerHTML)
    console.log('MODAL_PRESENT')
    console.log('MODAL_HTML_SNIPPET:\n', modalHtml.slice(0, 2000))
    await browser.close()
    process.exit(0)
  } catch (e) {
    console.error('MODAL_NOT_FOUND', e.message)
    try {
      const dump = await page.$eval('body', b => b.innerHTML.slice(0, 4000))
      console.error('BODY_SNIPPET:\n', dump)
    } catch (e2) {}
    await browser.close()
    process.exit(3)
  }
}

main().catch(e => { console.error(e); process.exit(4) })
