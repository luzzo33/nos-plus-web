import { Dashboard } from '@/components/dashboard/Dashboard';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  await params;

  return <Dashboard />;
}
