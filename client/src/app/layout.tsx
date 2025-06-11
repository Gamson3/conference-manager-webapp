import type { Metadata } from "next";
import { Source_Sans_3 as FontSans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "@/components/ui/sonner";

const fontSans = FontSans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ['200', '300', '400', '500', '600', '800', '900'],
});

export const metadata: Metadata = {
  title: "Conference Master",
  description: "Your Gateway to Seamless Conference Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fontSans.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>

        <Toaster 
          position="top-right"
          richColors
          closeButton
          duration={2000}
          expand={true}
          visibleToasts={5}
        />
        
      </body>
    </html>
  );
}
