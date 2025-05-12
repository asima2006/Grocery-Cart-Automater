// src/services/playwrightService.ts
import { chromium, Browser, Page } from 'playwright'; // Added Browser and Page for return type

// It's good practice to type the return value
interface LaunchResult {
  browser: Browser;
  page: Page;
}

export const launchBrowser = async (): Promise<LaunchResult> => {
    const browser = await chromium.launch({ headless: true }); // or true if you don't want GUI
    const page = await browser.newPage();
    return { browser, page };
};
