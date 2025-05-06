"use server";

import { z } from "zod";
import { addProductsToCart } from "@/services/grocery-site";
import type { Product, CartSummary } from "@/services/grocery-site";

// Schema Definitions
const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"); // Basic E.164 format check
const otpSchema = z.string().length(6, "OTP must be 6 digits");
const sessionIdSchema = z.string().min(1, "Session ID is required");
const productSchema = z.object({
  url: z.string().url("Invalid URL"),
  variant: z.string().min(1, "Variant cannot be empty"),
});
const productsSchema = z.array(productSchema);

// Types for return values
type LoginResult = { success: true; sessionId: string } | { success: false; error: string };
type SubmitOtpResult = { success: true } | { success: false; error: string };
type AddProductsResult = { success: true; cartSummary: CartSummary } | { success: false; error: string };

// --- Placeholder Functions for Backend Logic ---
// Simulate requesting OTP
async function requestOtpFromBackend(phoneNumber: string): Promise<LoginResult> {
  console.log(`Simulating OTP request for: ${phoneNumber}`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // In a real scenario, this would call the Playwright backend
  // For now, assume success and return a dummy session ID
  const dummySessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  console.log(`Simulated OTP sent. Session ID: ${dummySessionId}`);
  return { success: true, sessionId: dummySessionId };
  // Example failure:
  // return { success: false, error: "Failed to initiate login process." };
}

// Simulate submitting OTP
async function submitOtpToBackend(sessionId: string, otp: string): Promise<SubmitOtpResult> {
  console.log(`Simulating OTP submission for Session ID: ${sessionId} with OTP: ${otp}`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // In a real scenario, this would call the Playwright backend
  // For now, assume success if OTP is '123456'
  if (otp === '123456') {
    console.log(`Simulated OTP verification successful for Session ID: ${sessionId}`);
    return { success: true };
  } else {
    console.log(`Simulated OTP verification failed for Session ID: ${sessionId}`);
    return { success: false, error: "Invalid OTP." };
  }
}

// Use the existing service for adding products
async function addProductsViaBackend(sessionId: string, products: Product[]): Promise<AddProductsResult> {
  console.log(`Simulating adding products for Session ID: ${sessionId}`, products);
  // Simulate network delay before calling the service
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    // In a real scenario, this would call the Playwright backend, which might then call addProductsToCart or similar logic.
    // Here, we directly call the placeholder service.
    const cartSummary = await addProductsToCart(sessionId, products);
    console.log(`Simulated product addition successful. Cart Summary:`, cartSummary);
    return { success: true, cartSummary };
  } catch (error) {
    console.error("Error during product addition simulation:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while adding products.";
    return { success: false, error: errorMessage };
  }
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
      // Provide a more user-friendly error message
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
