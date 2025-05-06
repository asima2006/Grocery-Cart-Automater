'use client';

import React, { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { handleLogin, handleSubmitOtp, handleAddProducts } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Loader2, Phone, KeyRound, ShoppingCart, CheckCircle, AlertCircle } from 'lucide-react';
import type { Product, CartSummary } from "@/services/grocery-site";
import type { AddProductsResult, LoginResult, SubmitOtpResult } from "./actions"; // Import all action result types

// Initial states for useActionState
const initialLoginState: { success: false; error: string } = { success: false, error: '' };
const initialOtpState: { success: false; error: string } = { success: false, error: '' };
const initialAddProductsState: { success: false; error: string } = { success: false, error: '' };

// SubmitButton component to show loading state
function SubmitButton({ children, pendingText }: { children: React.ReactNode, pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending} disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export default function Home() {
  const [loginState, loginFormAction] = useActionState<LoginResult, FormData>(handleLogin, initialLoginState);
  const [otpState, otpFormAction] = useActionState<SubmitOtpResult, FormData>(handleSubmitOtp, initialOtpState);
  const [addProductsState, addProductsFormAction] = useActionState<AddProductsResult, FormData>(handleAddProducts, initialAddProductsState);

  const [currentSessionId, setCurrentSessionId] = useState<string | ''>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [productsJson, setProductsJson] = useState<string>('');
  const [productInputError, setProductInputError] = useState<string | ''>('');

  // Update state based on form results
  useEffect(() => {
    if (loginState.success && loginState.sessionId) { // Guarded by loginState.success
      setCurrentSessionId(loginState.sessionId);
    }
  }, [loginState]);

  useEffect(() => {
    if (otpState.success) { // Guarded by otpState.success
      setIsAuthenticated(true);
    }
  }, [otpState]);

  // Validate JSON input for products
  const handleProductInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setProductsJson(value);
    if (!value) {
      setProductInputError('');
      return;
    }
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        throw new Error('Input must be a JSON array.');
      }
      // Basic check for required fields in each object (can be enhanced)
      parsed.forEach((item, index) => {
        if (typeof item !== 'object' || item === '') throw new Error(`Item ${index + 1} must be an object.`);
        if (typeof item.url !== 'string' || !item.url) throw new Error(`Item ${index + 1} must have a 'url' string.`);
        if (typeof item.variant !== 'string' || !item.variant) throw new Error(`Item ${index + 1} must have a 'variant' string.`);
      });
      setProductInputError(''); // Clear error if valid JSON array of products
    } catch (e) {
      setProductInputError(e instanceof Error ? e.message : 'Invalid JSON format.');
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center space-y-8">
      <header className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-primary">Grocery Cart Automator</h1>
        <p className="text-muted-foreground mt-2">
          Enter your phone number to start, verify with OTP, then add products via URL.
        </p>
      </header>

      {/* Step 1: Login Form */}
      {!currentSessionId && !isAuthenticated && (
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary"><Phone /> Step 1: Login</CardTitle>
            <CardDescription>Enter your phone number to receive an OTP.</CardDescription>
          </CardHeader>
          <form action={loginFormAction}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="+1234567890"
                  required
                />
              </div>
              {!loginState.success && loginState.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Login Failed</AlertTitle>
                  <AlertDescription>{loginState.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <SubmitButton pendingText="Requesting OTP...">Request OTP</SubmitButton>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Step 2: OTP Form */}
      {currentSessionId && !isAuthenticated && (
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary"><KeyRound /> Step 2: Verify OTP</CardTitle>
            <CardDescription>Enter the 6-digit code sent to your phone.</CardDescription>
          </CardHeader>
          <form action={otpFormAction}>
            <CardContent className="space-y-4">
              <input type="hidden" name="sessionId" value={currentSessionId} />
              <div className="space-y-2">
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  required
                />
              </div>
              {!otpState.success && otpState.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Verification Failed</AlertTitle>
                  <AlertDescription>{otpState.error}</AlertDescription>
                </Alert>
              )}
              {loginState.success && !otpState.success && !otpState.error && (
                <Alert variant="default" className="bg-accent/10 border-accent/50 text-accent-foreground">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <AlertTitle>OTP Sent!</AlertTitle>
                  <AlertDescription>Check your phone for the code.</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <SubmitButton pendingText="Verifying...">Verify OTP</SubmitButton>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Step 3: Add Products Form */}
      {isAuthenticated && (
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary"><ShoppingCart /> Step 3: Add Products</CardTitle>
            <CardDescription>
              Paste a JSON array of products (URL and variant) to add them to your cart.
              Example: <code className='text-xs bg-muted p-1 rounded'>{'[{"url": "http://example.com/product1", "variant": "500g"}]'}</code>
            </CardDescription>
          </CardHeader>
          <form action={addProductsFormAction}>
            <CardContent className="space-y-4">
              <input type="hidden" name="sessionId" value={currentSessionId!} />
              <div className="space-y-2">
                <Label htmlFor="products">Products (JSON Array)</Label>
                <Textarea
                  id="products"
                  name="products"
                  rows={5}
                  placeholder='[{"url": "https://...", "variant": "..."}, ...]'
                  required
                  value={productsJson}
                  onChange={handleProductInputChange}
                  className={productInputError ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}
                />
                {productInputError && (
                  <p className="text-sm text-destructive">{productInputError}</p>
                )}
              </div>
              {!addProductsState.success && addProductsState.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Adding Products</AlertTitle>
                  <AlertDescription>{addProductsState.error}</AlertDescription>
                </Alert>
              )}
              {otpState.success && !addProductsState.success && !addProductsState.error && ( // Show only after OTP success and before product success/error
                <Alert variant="default" className="bg-accent/10 border-accent/50 text-accent-foreground">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <AlertTitle>Authentication Successful!</AlertTitle>
                  <AlertDescription>You can now add products.</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <SubmitButton pendingText="Adding Products...">Add Products to Cart</SubmitButton>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Step 4: Cart Summary Display */}
      {addProductsState.success && addProductsState.cartSummary && (
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-accent"><CheckCircle /> Cart Summary</CardTitle>
            <CardDescription>Here are the items added to your cart.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addProductsState.cartSummary.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${(item.price * item.quantity).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption className="text-right font-bold text-lg text-foreground pr-4 py-2">
                Total Price: <span className="text-accent">${addProductsState.cartSummary.totalPrice.toFixed(2)}</span>
              </TableCaption>
            </Table>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
