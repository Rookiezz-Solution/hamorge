import type { Metadata, Viewport } from "next";
import { Inter, Alexandria } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AddedToCartPanel from "@/components/AddedToCartPanel";
import NavigationProgress from "@/components/NavigationProgress";
import Analytics from "@/components/Analytics";
import { CartProvider } from "@/context/CartContext";
import { FavouritesProvider } from "@/context/FavouritesContext";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const alexandria = Alexandria({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-alexandria",
  display: "swap",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: { default: "HAM ORGE", template: "%s" },
  description: "Crafted with thoughtful design and honest craftsmanship. The first collection from HAM ORGE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${alexandria.variable}`}>
      <body className="min-h-full bg-[#faf7f2] antialiased">
        <Analytics />
        <NavigationProgress />
        <AuthProvider>
          <CartProvider>
            <FavouritesProvider>
              <Navbar />
              {children}
              <Footer />
              <AddedToCartPanel />
            </FavouritesProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
