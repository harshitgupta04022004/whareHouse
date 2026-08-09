import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Radheshyam Warehouse — DO Records",
  description:
    "Radheshyam Warehouse DO records — In/Out, bags, weight, totals and delivery summaries.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Inline script: runs before React hydration to catch recovery/invite tokens */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=window.location.hash;if(h.indexOf('type=recovery')!==-1||h.indexOf('type=invite')!==-1){if(!sessionStorage.getItem('resetRedirect')){sessionStorage.setItem('resetRedirect','1');window.location.replace('/reset-password'+h);}}}catch(e){}})();`,
          }}
        />
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
