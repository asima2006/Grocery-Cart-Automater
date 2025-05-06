//typescript
import { Browser, Page } from 'playwright';

interface BrowserData {
  browser: Browser;
  page: Page;
}

const activeBrowsers = new Map<string, BrowserData>();

function saveBrowser(sessionId: string, browser: Browser, page: Page): void {
  activeBrowsers.set(sessionId, { browser, page });
}

function getBrowser(sessionId: string): BrowserData | undefined {
  return activeBrowsers.get(sessionId);
}

async function closeBrowser(sessionId: string): Promise<void> {
  const browserObj = activeBrowsers.get(sessionId);
  if (browserObj) {
    await browserObj.browser.close();
    activeBrowsers.delete(sessionId);
  }
}

async function clearAllBrowsers(): Promise<void> {
  for (const { browser } of activeBrowsers.values()) {
    await browser.close();
  }
  activeBrowsers.clear();
}

export { saveBrowser, getBrowser, closeBrowser, clearAllBrowsers };