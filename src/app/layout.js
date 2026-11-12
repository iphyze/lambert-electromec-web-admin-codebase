import { Sora } from "next/font/google";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import AuthBootstrap from "@/components/auth/AuthBootstrap";
import ThemeProvider from "@/components/theme/ThemeProvider";

const sora = Sora({ subsets: ["latin"], display: "swap", variable: "--font-sora" });

export const metadata = {
  title: { default: "Lambert Admin", template: "%s | Lambert Admin" },
  description: "Secure administration portal for Lambert Electromec.",
  robots: { index: false, follow: false, nocache: true },
  icons: {
    icon: "/images/brand/favicon.png",
    shortcut: "/images/brand/favicon.png",
    apple: "/images/brand/favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={sora.className}>
        <ThemeProvider>
          <AuthBootstrap />
          {children}
        </ThemeProvider>
        <div id="app-datepicker-portal" />
      </body>
    </html>
  );
}
