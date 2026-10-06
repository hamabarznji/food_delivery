import { Plus_Jakarta_Sans, Vazirmatn } from "next/font/google";
import "./globals.css";

const latin = Plus_Jakarta_Sans({ variable: "--font-latin", subsets: ["latin"], display: "swap" });
const arabic = Vazirmatn({ variable: "--font-arabic", subsets: ["arabic"], display: "swap" });

export const metadata = {
  title: "Pasha Restaurant | مطعم باشا | چێشتخانەی پاشا",
  description: "Pasha Restaurant online menu and direct ordering",
};

export const viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ckb" dir="rtl">
      <body className={`${latin.variable} ${arabic.variable} min-h-screen antialiased bg-[#FAF8F5]`}>
        {children}
      </body>
    </html>
  );
}
