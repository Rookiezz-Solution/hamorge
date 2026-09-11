import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Shop' ,
  description: 'Browse the HAM ORGE T-shirt collection. Premium quality tees built for comfort and style.',
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
