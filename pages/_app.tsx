import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Provider } from '@react-spectrum/s2';
import { PartnerProvider } from '../contexts/PartnerContext';
import { CartProvider } from '../contexts/CartContext';
import Head from 'next/head';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Source_Sans_3 } from 'next/font/google';

const sourceSans3 = Source_Sans_3({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-sans',
  display: 'swap',
});

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={sourceSans3.variable}>
      <Head>
        <title>Adobe: The Bridge</title>
        <link rel="icon" href="/favicon.svg?v=5" type="image/svg+xml" />'
      </Head>
      <QueryClientProvider client={queryClient}>
        <Provider colorScheme="light">
          <PartnerProvider>
            <CartProvider>
              <Component {...pageProps} />
            </CartProvider>
          </PartnerProvider>
        </Provider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </div>
  );
}
