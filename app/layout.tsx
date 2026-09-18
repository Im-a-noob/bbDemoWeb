import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'BB - The ASCII-Art Demo for AAlib',
  description: 'Faithful web recreation of the legendary 1997 AAlib audiovisual demo BB by AA-Project, featuring authentic ASCII rendering, Scream Tracker 3 music, and all original scenes.',
  openGraph: {
    title: 'BB - The ASCII-Art Demo for AAlib',
    description: 'Faithful web recreation of the legendary 1997 AAlib audiovisual demo BB by AA-Project, featuring authentic ASCII rendering, Scream Tracker 3 music, and all original scenes.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BB - The ASCII-Art Demo for AAlib',
    description: 'Faithful web recreation of the legendary 1997 AAlib audiovisual demo BB by AA-Project, featuring authentic ASCII rendering, Scream Tracker 3 music, and all original scenes.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
