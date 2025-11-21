import { ReactNode } from 'react';
import { loadStripe } from '@stripe/js';
import {
  Elements,
} from '@stripe/react-stripe-js';

// Get Stripe publishable key from environment
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

// Initialize Stripe (will be null if key is not provided)
const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);

interface StripeProviderProps {
  children: ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  if (!STRIPE_PUBLISHABLE_KEY) {
    // If Stripe key is not configured, render children without Elements provider
    console.warn(
      'VITE_STRIPE_PUBLISHABLE_KEY is not configured. Stripe payments will not work. ' +
      'Set this environment variable to enable Stripe payments.'
    );
    return <>{children}</>;
  }

  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}
