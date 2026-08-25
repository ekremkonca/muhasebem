import './globals.css';

export const metadata = {
  title: 'Tur Bütçem',
  description: 'Tur gelirleri, masrafları, bahşiş ve komisyon takibi'
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
