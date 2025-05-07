// lib/blinkit.ts
import { v4 as uuidv4 } from 'uuid';
import { launchBrowser } from '@/services/playwrightService';
import { saveSession, getSession } from '@/services/sessionService';
import { saveBrowser, getBrowser, closeBrowser } from '@/services/browserpool';
import { log } from 'console'
import type { LoginResult, SubmitOtpResult, AddProductsResult } from '@/app/actions';
import type { CartSummary, CartLineItem, Product } from '@/services/grocery-site';

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

        return { success: true, session: { sessionId, cookies: JSON.stringify(cookies), domSnapshot, url } };
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
    }
}

export async function addProductsToCartViaPlaywright(
    sessionId: string,
    products: Product[] // Use Product type from grocery-site
): Promise<AddProductsResult> { // Changed return type
    const session = await getSession(sessionId);
    if (!session) {
        return { success: false, error: 'Session not found' };
    }

    const browserObj = getBrowser(sessionId);
    if (!browserObj) {
        return { success: false, error: 'Session expired or browser closed' };
    }

    const { page } = browserObj;
    try {
        await page.context().addCookies(session.cookies);

        for (const product of products) {
            await page.goto(product.url, { waitUntil: 'domcontentloaded' });
            await page.locator('div').filter({ hasText: /^ADD$/ }).first().click();
            log(`Attempted to add product from ${product.url} with variant ${product.variant} to cart`);
            await page.waitForTimeout(1000);
        }
        await page.goto('https://blinkit.com', { waitUntil: 'domcontentloaded' });
        log('Navigated to cart page');
        // await page.locator('div.Header__HeaderRight-sc-hejrxh-3 > div').nth(1).click();
        await page.getByText('r', { exact: true }).click();
        log('Clicked on cart icon');
        await page.waitForTimeout(1000);
        const productWidgets = page.locator('div[type="123"]');
        const count = await productWidgets.count();
        const cartItems: CartLineItem[] = [];

        for (let i = 0; i < count; i++) {
            const widget = productWidgets.nth(i);
            const name = await widget
                .locator('.DefaultProductCard__ProductTitle-sc-18qk0hu-6')
                .innerText();

            const price = await widget
                .locator('.DefaultProductCard__Price-sc-18qk0hu-15')
                .innerText();

            const qtyRaw = await widget
                .locator('.AddToCart__UpdatedButtonContainer-sc-17ig0e3-0')
                .innerText();
            const qtyMatch = qtyRaw.match(/\d+/);
            const quantity = qtyMatch ? parseInt(qtyMatch[0], 10) : 0;

            cartItems.push({
                name: name.trim(),
                quantity: quantity || 1,
                price: parseFloat(price.replace(/[^0-9.-]+/g, "")) || 0,
            });
        }

        console.log(products);
        const price = await page.locator(
            'div[type="115"] .CheckoutStrip__NetPriceText-sc-1fzbdhy-11'
        ).textContent();

        const cartSummary: CartSummary = {
            items: cartItems,
            totalPrice: price ? parseFloat(price.trim().replace(/[^0-9.-]+/g, "")) || 0 : 0,
        };
        log('Cart Summary:', cartSummary);
        await saveSession(sessionId, {
            phoneNumber: session.phoneNumber,
            cookies: session.cookies,
            domSnapshot: session.domSnapshot,
            url: session.url,
        });

        return { success: true, cartSummary };

    } catch (err: any) {
        log('Error in addProductsToCartViaPlaywright:', err);
        return { success: false, error: err.message || 'Adding products to cart failed' };
    } finally {
        closeBrowser(sessionId);
    }
}