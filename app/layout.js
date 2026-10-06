import { Plus_Jakarta_Sans, Vazirmatn } from "next/font/google";
import "./globals.css";
import { getSession } from "@/src/lib/supabase/server";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { getLang, messagesFor } from "@/src/i18n/server";
import { translate } from "@/src/i18n/dict";
import { isRTL } from "@/src/lib/format";
import { AuthProvider, I18nProvider, ToastProvider } from "@/src/components/providers";
import { CartProvider } from "@/src/components/cart";
import Header from "@/src/components/header";
import Footer from "@/src/components/footer";

const latin = Plus_Jakarta_Sans({ variable: "--font-latin", subsets: ["latin"], display: "swap" });
// Vazirmatn covers Arabic and Kurdish (Sorani) letters.
const arabic = Vazirmatn({ variable: "--font-arabic", subsets: ["arabic"], display: "swap" });

export async function generateMetadata() {
  const lang = await getLang();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: { default: translate(lang, "brand.name"), template: `%s · ${translate(lang, "brand.name")}` },
    description: translate(lang, "brand.tagline"),
  };
}

export const viewport = { themeColor: "#fbf8f3", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }) {
  const [lang, session] = await Promise.all([getLang(), getSession()]);
  const t = (key) => translate(lang, key);

  return (
    <html lang={lang === "ku" ? "ckb" : lang} dir={isRTL(lang) ? "rtl" : "ltr"}>
      <body className={`${latin.variable} ${arabic.variable} flex min-h-dvh flex-col antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          {t("nav.skip")}
        </a>
        <I18nProvider lang={lang} messages={messagesFor(lang)}>
          <ToastProvider>
            <AuthProvider initialUser={session.user} initialProfile={session.profile}>
              <CartProvider>
                <Header />
                <main id="main" className="flex-1">
                  {isSupabaseConfigured ? (
                    children
                  ) : (
                    <div className="container-page py-20">
                      <div className="card mx-auto max-w-lg p-8 text-center">
                        <h1 className="text-xl font-bold">{t("error.setupTitle")}</h1>
                        <p className="mt-2 text-sm text-ink-600">{t("error.setupBody")}</p>
                      </div>
                    </div>
                  )}
                </main>
                <Footer />
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
