import { ToastProvider } from '@/components/ToastProvider';
import './globals.css';

export const metadata = {
  title: 'Ghana Susu App',
  description: 'A modern, MVP-focused Susu savings tracker for Ghana',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://js.paystack.co/v1/inline.js" async></script>
      </head>
      <body>
        <ToastProvider>
          <main className="container">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
