/**
 * PNG Image Generator
 * Uses Puppeteer with headless Chrome to generate high-quality PNG images
 */

const chromium = require('@sparticuz/chromium')
const puppeteer = require('puppeteer-core')

// Reuse browser instance across warm Lambda invocations for better performance
let browser = null

async function generatePNG(htmlContent) {
  try {
    // Launch browser if not already running (or reuse from previous invocation)
    if (!browser) {
      console.log('Launching new browser instance...')
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      })
    }

    // Create a new page
    const page = await browser.newPage()

    // Set viewport for 2x retina quality
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2 // High DPI for better quality
    })

    // Inject HTML content and wait for fonts to load
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0' // Wait for fonts and all resources
    })

    // Get the element to screenshot (the code-window div)
    const element = await page.$('.code-window')

    if (!element) {
      throw new Error('Could not find .code-window element in rendered HTML')
    }

    // Take screenshot of the element
    const screenshot = await element.screenshot({
      type: 'png',
      omitBackground: false // Include the background gradient
    })

    // Close the page (but keep browser alive for reuse)
    await page.close()

    return screenshot // Returns Buffer
  } catch (error) {
    console.error('Error generating PNG:', error)
    // Close browser on error to force fresh start next time
    if (browser) {
      await browser.close()
      browser = null
    }
    throw error
  }
}

// Cleanup function for graceful shutdown
async function cleanup() {
  if (browser) {
    await browser.close()
    browser = null
  }
}

module.exports = { generatePNG, cleanup }
