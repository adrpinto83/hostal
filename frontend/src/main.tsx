import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { StripeProvider } from './components/payments/StripeProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StripeProvider>
      <App />
    </StripeProvider>
  </React.StrictMode>
);
