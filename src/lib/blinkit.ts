// lib/blinkit.ts
import { v4 as uuidv4 } from 'uuid';
import { launchBrowser } from '@/services/playwrightService';
import { saveSession, getSession } from '@/services/sessionService';
import { saveBrowser, getBrowser, closeBrowser } from '@/services/browserpool';
import { log } from 'console'
import type { LoginResult, SubmitOtpResult } from '@/app/actions';

export interface LoginSession {
    sessionId: string;
    cookies: any[];
    domSnapshot: string;
    url: string;
}

export async function requestOtpViaPlaywright(
    phoneNumber: string,
    pinCode = '110001'
): Promise<LoginResult> {
    const { browser, page } = await launchBrowser();
    try {
        await page.goto('https://www.blinkit.com', { waitUntil: 'domcontentloaded' });
        await page.getByPlaceholder('Search delivery location').click();
        await page.getByPlaceholder('Search delivery location').fill(pinCode);
        await page.locator('.address-container-v1 > div:nth-child(1)').click();
        await page.getByText('Login').click();
        await page.locator('[data-test-id="phone-no-text-box"]').click();
        await page.locator('[data-test-id="phone-no-text-box"]').fill(phoneNumber);
        await page.getByText('Continue').click();

        const cookies = await page.context().cookies();
        const domSnapshot = await page.content();
        const url = page.url();

        const sessionId = uuidv4();
        await saveSession(sessionId, { phoneNumber, cookies, domSnapshot, url });
        saveBrowser(sessionId, browser, page);

        return { success: true, session: { sessionId, cookies, domSnapshot, url } };
    } catch (err: any) {
        await browser.close();
        return { success: false, error: err.message || 'Playwright login failed' };
    }
}

export async function submitOtpViaPlaywright(
    sessionId: string,
    otp: string
): Promise<SubmitOtpResult> {
    const session = await getSession(sessionId);
    if (!session) {
        return { success: false, error: 'Session not found' };
    }

    // 2. grab the live browser/page instance
    const browserObj = getBrowser(sessionId);
    if (!browserObj) {
        return { success: false, error: 'Session expired or browser closed' };
    }

    const { browser, page } = browserObj;
    try {
        // 3. restore cookies so we're back in the same state
        await page.context().addCookies(session.cookies);

        // 4. fill each OTP digit
        for (let i = 0; i < otp.length; i++) {
            const digit = otp[i];
            await page.locator('[data-test-id="otp-text-box"]').nth(i).fill(digit);
            log(`Filling OTP digit ${i + 1}: ${digit}`);
        }

        const finalCookies = await page.context().cookies();
        const finalDomSnapshot = await page.content();
        const finalUrl = page.url();
        await saveSession(sessionId, {
            phoneNumber: session.phoneNumber,
            cookies: finalCookies,
            domSnapshot: finalDomSnapshot,
            url: finalUrl,
        });

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || 'OTP submission failed' };
    } finally {
        await closeBrowser(sessionId);
    }
}