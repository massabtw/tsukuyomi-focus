import type { Metadata } from 'next';
import { Cinzel, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Tsukuyomi Focus',
  description:
    'Temporizador de deep work e gestão de missões com estética Uchiha, evolução do Sharingan, Amaterasu, Susanoo e Izanagi.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetbrainsMono.variable} ${cinzel.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-[#09090B] font-sans text-[#FAFAFA] selection:bg-[#DC2626]/35 selection:text-white">
        {children}
      </body>
    </html>
  );
}
