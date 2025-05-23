"use server";

import { z } from "zod";
import type { Product, CartSummary } from "@/services/grocery-site";
import { addProductsToCartViaPlaywright, requestOtpViaPlaywright, submitOtpViaPlaywright } from "@/lib/blinkit";
import { log } from "console";

// Schema Definitions
const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian phone number");
const otpSchema = z.string().length(4, "OTP must be 4 digits");
const sessionIdSchema = z.string().min(1, "Session ID is required");
const productSchema = z.object({
  url: z.string().url("Invalid URL"),
  variant: z.string().min(1, "Variant cannot be empty"),
});
const productsSchema = z.array(productSchema);

// Types for return values
export type LoginResult =
  { success: true; session: { sessionId: string; cookies: string; domSnapshot: string; url: string } } |
  { success: false; error: string }; // Error case
export type SubmitOtpResult = { success: true } | { success: false; error: string };
export type AddProductsResult = { success: true; cartSummary: CartSummary } | { success: false; error: string };

// --- Placeholder Functions for Backend Logic ---
// Simulate requesting OTP
async function requestOtpFromBackend(phoneNumber: string): Promise<LoginResult> {
  if (typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
    return { success: false, error: 'Phone number is required.' };
  }

  // Delegate to your Playwright logic
  const result = await requestOtpViaPlaywright(phoneNumber.trim());
  log("OTP request result:", result.success);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // On success, return the generated session ID
  return {
    success: true,
    session: result.session,
  };
}

// Simulate submitting OTP
async function submitOtpToBackend(sessionId: string, otp: string): Promise<SubmitOtpResult> {
  const result = await submitOtpViaPlaywright(sessionId, otp);
  if (!result.success) throw new Error(result.error);
  return { success: true };
}

// Use the existing service for adding products
async function addProductsViaBackend(sessionId: string, products: Product[]): Promise<AddProductsResult> {
  const cartSummary = await addProductsToCartViaPlaywright(sessionId, products);
  if (!cartSummary) {
    return { success: false, error: "Failed to add products to cart." };
  }
  return cartSummary;
}

// --- Server Actions ---

export async function handleLogin(prevState: any, formData: FormData): Promise<LoginResult> {
  const phoneNumber = formData.get("phoneNumber") as string;

  const validation = phoneSchema.safeParse(phoneNumber);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0]?.message ?? "Invalid phone number." };
  }

  try {
    return await requestOtpFromBackend(validation.data);
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Could not start login process. Please try again." };
  }
}

export async function handleSubmitOtp(prevState: any, formData: FormData): Promise<SubmitOtpResult> {
  const otp = formData.get("otp") as string;
  const sessionId = formData.get("sessionId") as string; // Assuming sessionId is passed in the form

  const otpValidation = otpSchema.safeParse(otp);
  if (!otpValidation.success) {
    return { success: false, error: otpValidation.error.errors[0]?.message ?? "Invalid OTP format." };
  }

  const sessionIdValidation = sessionIdSchema.safeParse(sessionId);
  if (!sessionIdValidation.success) {
    return { success: false, error: "Session ID is missing or invalid." };
  }

  try {
    return await submitOtpToBackend(sessionIdValidation.data, otpValidation.data);
  } catch (error) {
    console.error("OTP submission error:", error);
    return { success: false, error: "Could not verify OTP. Please try again." };
  }
}

export async function handleAddProducts(prevState: any, formData: FormData): Promise<AddProductsResult> {
  const sessionId = formData.get("sessionId") as string;
  const productsString = formData.get("products") as string; // Expecting a JSON string

  const sessionIdValidation = sessionIdSchema.safeParse(sessionId);
  if (!sessionIdValidation.success) {
    return { success: false, error: "Session ID is missing or invalid." };
  }

  let products: Product[];
  try {
    const parsedProducts = JSON.parse(productsString);
    const validation = productsSchema.safeParse(parsedProducts);
    if (!validation.success) {
      console.error("Product validation error:", validation.error.errors);
      const errorMessages = validation.error.errors.map((e, i) => `Product ${i + 1}: ${e.message} (at ${e.path.join('.')})`).join('\n');
      return { success: false, error: `Invalid product data:\n${errorMessages}` };
    }
    products = validation.data;
  } catch (e) {
    return { success: false, error: "Invalid products format. Expected JSON." };
  }

  if (products.length === 0) {
    return { success: false, error: "No products provided." };
  }

  try {
    return await addProductsViaBackend(sessionIdValidation.data, products);
  } catch (error) {
    console.error("Add products error:", error);
    return { success: false, error: "Could not add products to cart. Please try again." };
  }
}
