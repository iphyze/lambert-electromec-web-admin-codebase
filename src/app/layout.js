import { Sora } from "next/font/google";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import AuthBootstrap from "@/components/auth/AuthBootstrap";
import ThemeProvider from "@/components/theme/ThemeProvider";
import ServiceWorkerManager from "@/components/pwa/ServiceWorkerManager";
import ViewportManager from "@/components/pwa/ViewportManager";
import { InstallAppProvider } from "@/components/pwa/InstallAppButton";

const sora = Sora({ subsets: ["latin"], display: "swap", variable: "--font-sora" });
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const at = (path) => `${basePath}${path}`;

export const metadata = {
  title: { default: "Lambert Admin", template: "%s | Lambert Admin" },
  description: "Secure administration portal for Lambert Electromec.",
  applicationName: "Lambert Admin Console",
  manifest: at("/manifest.webmanifest"),
  appleWebApp: { capable: true, title: "Lambert Admin", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false, nocache: true },
  icons: {
    icon: at("/images/brand/favicon.png"),
    shortcut: at("/images/brand/favicon.png"),
    apple: [{ url: at("/icons/apple-touch-icon-180.png"), sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1f9150" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e10" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={sora.className}>
        <ThemeProvider>
          <InstallAppProvider>
            <ViewportManager />
            <ServiceWorkerManager />
            <AuthBootstrap />
            {children}
          </InstallAppProvider>
        </ThemeProvider>
        <div id="app-datepicker-portal" />
      </body>
    </html>
  );
}
