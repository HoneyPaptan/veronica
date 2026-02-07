import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next"
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Veronica",
  description: "Static dashboards fail in a crisis. Veronica uses Tambo AI to build live tactical maps, track wildfires, and plot evacuation routes in real-time.",
  openGraph: {
    title: "Veronica",
    description: "Static dashboards fail in a crisis. Veronica uses Tambo AI to build live tactical maps, track wildfires, and plot evacuation routes in real-time.",
    url: "https://veronica-six.vercel.app",
    siteName: "Veronica",
    images: [
      {
        url: "/opengraphimg.png",
        width: 1200,
        height: 630,
        alt: "Veronica",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Veronica",
    description: "Static dashboards fail in a crisis. Veronica uses Tambo AI to build live tactical maps, track wildfires, and plot evacuation routes in real-time.z",
    images: ["/opengraphimg.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-center" richColors />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
