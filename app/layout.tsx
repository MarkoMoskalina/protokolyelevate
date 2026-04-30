import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { RouteProvider } from "@/providers/route-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "Protokoly | ElevateCars",
    description: "Digitálne odovzdávacie a preberacie protokoly vozidiel",
};

export const viewport: Viewport = {
    colorScheme: "light",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="sk" className={`${inter.variable} scroll-smooth`} suppressHydrationWarning>
            <body className="bg-primary antialiased">
                <RouteProvider>
                    <ThemeProvider>
                        {children}
                        <Toaster position="top-center" richColors closeButton />
                    </ThemeProvider>
                </RouteProvider>
            </body>
        </html>
    );
}
