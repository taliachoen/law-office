import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

// shadcn מצפה למשתנה --font-sans, ולכן Heebo (גופן עברי) מוגדר תחת השם הזה.
const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ניהול משרד עורכי דין – דגם",
  description: "דגם עובד עם נתוני דמה בלבד",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} font-sans`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
