/* global Buffer, console, document, process */
import { chromium } from 'playwright-core'

const baseUrl = process.env.BASE_URL || 'http://host.docker.internal:38112'
const adminPassword = process.env.ADMIN_PASSWORD || 'BrowserQa123!'
const siteName = process.env.SITE_NAME || 'StarNav Browser QA'

const pngBuffer = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
  0x00,
  0x00,
  0x00,
  0x0d,
  0x49,
  0x48,
  0x44,
  0x52,
  0x00,
  0x00,
  0x00,
  0x10,
  0x00,
  0x00,
  0x00,
  0x10,
  0x08,
  0x02,
  0x00,
  0x00,
  0x00
])

const log = (message) => {
  console.log(`[browser-regression] ${message}`)
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const clickMenuItem = async (page, labels) => {
  for (const label of labels) {
    const locator = page.locator('.admin-menu-item').filter({ hasText: label }).first()
    if (await locator.count()) {
      await locator.click()
      return
    }
  }

  throw new Error(`menu item not found: ${labels.join(', ')}`)
}

const clickButtonByText = async (scope, labels) => {
  for (const label of labels) {
    const locator = scope.locator('button').filter({ hasText: label }).first()
    if (await locator.count()) {
      await locator.click()
      return
    }
  }

  throw new Error(`button not found: ${labels.join(', ')}`)
}

const waitForVisibleText = async (page, patterns) => {
  await page.waitForFunction((expectedPatterns) => {
    const text = document.body?.innerText || ''
    return expectedPatterns.some((pattern) => {
      const regex = new RegExp(pattern, 'i')
      return regex.test(text)
    })
  }, patterns)
}

const waitForAdminSettingsSave = async (page, trigger) => {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/api/admin/settings') &&
        ['POST', 'PUT'].includes(res.request().method()) &&
        res.status() === 200
    ),
    trigger()
  ])

  assert(response.ok(), 'admin settings save failed')
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } })
  const page = await context.newPage()

  page.on('console', (message) => {
    if (message.type() === 'error') {
      console.error('[browser-regression] console error:', message.text())
    }
  })

  page.on('pageerror', (error) => {
    console.error('[browser-regression] pageerror', error)
  })

  log('open home page')
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await waitForVisibleText(page, ['StarNav', '星语导航', '登录', 'Login'])
  await page.locator('.collapsible-sidebar').waitFor()
  await page.locator('.category-section .site-item').first().waitFor()

  log('toggle homepage dark mode')
  await page.locator('.theme-toggle').click()
  await page.waitForFunction(() => document.documentElement.getAttribute('theme-mode') === 'dark')
  await page.waitForFunction(() => {
    const readSurface = (selector) => {
      const node = document.querySelector(selector)
      return node ? globalThis.getComputedStyle(node).backgroundColor : ''
    }

    return (
      !readSurface('.head-shell').includes('255, 255, 255') &&
      !readSurface('.collapsible-sidebar').includes('255, 255, 255') &&
      !readSurface('.category-section .site-item').includes('255, 255, 255')
    )
  })

  const homeThemeSurfaces = await page.evaluate(() => {
    const readSurface = (selector) => {
      const node = document.querySelector(selector)
      return node ? globalThis.getComputedStyle(node).backgroundColor : ''
    }

    return {
      header: readSurface('.head-shell'),
      sidebar: readSurface('.collapsible-sidebar'),
      site: readSurface('.category-section .site-item')
    }
  })

  assert(
    homeThemeSurfaces.header &&
      homeThemeSurfaces.sidebar &&
      homeThemeSurfaces.site &&
      !homeThemeSurfaces.header.includes('255, 255, 255') &&
      !homeThemeSurfaces.sidebar.includes('255, 255, 255') &&
      !homeThemeSurfaces.site.includes('255, 255, 255'),
    `homepage dark mode did not fully apply: ${JSON.stringify(homeThemeSurfaces)}`
  )

  await clickMenuItem(page, ['登录', 'Login'])
  await page.locator('.login-dialog-shell').waitFor()
  await page.waitForFunction(() => {
    const readSurface = (selector) => {
      const node = document.querySelector(selector)
      return node ? globalThis.getComputedStyle(node).backgroundColor : ''
    }

    return (
      readSurface('.login-dialog-shell') !== 'rgba(255, 255, 255, 0.96)' &&
      readSurface('.dialog-input') !== 'rgba(255, 255, 255, 0.92)' &&
      readSurface('.dialog-close') !== 'rgba(148, 163, 184, 0.14)'
    )
  })

  const loginDialogSurfaces = await page.evaluate(() => {
    const readSurface = (selector) => {
      const node = document.querySelector(selector)
      return node ? globalThis.getComputedStyle(node).backgroundColor : ''
    }

    return {
      shell: readSurface('.login-dialog-shell'),
      input: readSurface('.dialog-input'),
      close: readSurface('.dialog-close')
    }
  })

  assert(
    loginDialogSurfaces.shell &&
      loginDialogSurfaces.input &&
      loginDialogSurfaces.close &&
      loginDialogSurfaces.shell !== 'rgba(255, 255, 255, 0.96)' &&
      loginDialogSurfaces.input !== 'rgba(255, 255, 255, 0.92)' &&
      loginDialogSurfaces.close !== 'rgba(148, 163, 184, 0.14)',
    `login dialog dark mode did not fully apply: ${JSON.stringify(loginDialogSurfaces)}`
  )

  log('login from dialog')
  await page.locator('input[autocomplete="username"]').fill('admin')
  await page.locator('input[type="password"]').fill(adminPassword)
  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/api/login') &&
        res.request().method() === 'POST' &&
        res.status() === 200
    ),
    page.locator('.login-btn').click()
  ])
  await page.locator('.admin-menu-item').filter({ hasText: /管理后台|Admin/i }).first().waitFor()
  await page.locator('.admin-menu-item').filter({ hasText: /退出登录|Logout/i }).first().waitFor()

  log('enter admin dashboard')
  await clickMenuItem(page, ['管理后台', 'Admin'])
  await page.waitForURL(/\/admin\/dashboard/)
  await page.locator('.system-settings').waitFor()
  await page.waitForFunction(() => document.documentElement.getAttribute('theme-mode') === 'dark')

  const adminHeaderSurface = await page.evaluate(() => {
    const header = document.querySelector('.main-header')
    return header ? globalThis.getComputedStyle(header).backgroundColor : ''
  })

  assert(
    adminHeaderSurface && !adminHeaderSurface.includes('255, 255, 255'),
    `admin header did not keep dark mode: ${adminHeaderSurface}`
  )

  log('update site name and save')
  await page.locator('[data-setting-field="siteName"] .settings-input').fill(siteName)
  await waitForAdminSettingsSave(page, async () => {
    await page.locator('button.settings-button.primary').click()
  })
  await page.waitForFunction(
    (expected) =>
      document.querySelector('.admin-sidebar .gradient-text')?.textContent?.includes(expected),
    siteName
  )

  log('upload background asset')
  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/api/upload-background') &&
        res.request().method() === 'POST' &&
        res.status() === 200
    ),
    page.locator('input[type="file"]').setInputFiles({
      name: 'browser-regression-bg.png',
      mimeType: 'image/png',
      buffer: pngBuffer
    })
  ])
  await page.locator('.uploaded-files .file-item').first().waitFor()

  log('apply uploaded asset to background, favicon, and logo')
  const firstUploadedFile = page.locator('.uploaded-files .file-item').first()
  await clickButtonByText(firstUploadedFile, ['设为背景', 'Set as Background'])
  await clickButtonByText(firstUploadedFile, ['设为图标', 'Set as Favicon'])
  await clickButtonByText(firstUploadedFile, ['设为 Logo', 'Set as Logo'])
  await waitForAdminSettingsSave(page, async () => {
    await page.locator('button.settings-button.primary').click()
  })
  await page.waitForFunction(() => {
    const favicon = document.querySelector('.favicon-preview')
    const logo = document.querySelector('.logo-preview')
    const bg = document.querySelector('.bg-preview')

    return Boolean(
      favicon?.getAttribute('src')?.includes('/uploads/') &&
        logo?.getAttribute('src')?.includes('/uploads/') &&
        bg?.getAttribute('style')?.includes('/uploads/')
    )
  })

  log('reload dashboard to confirm cookie-backed session persistence')
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForURL(/\/admin\/dashboard/)
  await page.locator('.system-settings').waitFor()
  await page.waitForFunction(
    (expected) =>
      document.querySelector('.admin-sidebar .gradient-text')?.textContent?.includes(expected),
    siteName
  )

  log('logout through admin sidebar dialog')
  await page.locator('.admin-sidebar .logout-btn').click()
  await page.locator('.sn-feedback-dialog-button.primary').click()
  await page.waitForURL(`${baseUrl}/`)
  await page.locator('.admin-menu-item').filter({ hasText: /登录|Login/i }).first().waitFor()

  log('browser regression passed')
  await context.close()
  await browser.close()
}

run().catch((error) => {
  console.error('[browser-regression] FAILED')
  console.error(error)
  process.exit(1)
})
