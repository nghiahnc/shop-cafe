import Frame from '@/components/boutique/Frame';
import type { Metadata } from "next";
import { shop } from "@/lib/config";
import "./globals.css";
import "./store.css";
import "./demo.css";

import './boutique.css';

export const metadata: Metadata = {
  title: `${shop.name} · Cà phê cho mỗi ngày`,
  description: `Đặt cà phê, matcha và bánh ngọt tại ${shop.name}.`,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body className={`theme-${shop.theme}`}><Frame>{children}</Frame></body></html>;
}
