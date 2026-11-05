import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getUserContext } from '@/lib/server-auth';
import AccessLogsClient from './AccessLogsClient';

export default async function AccessLogsPage() {
  const context = await getUserContext();
  if (!context) return <DashboardLayout><p className="text-rose-300">Hotel not found.</p></DashboardLayout>;
  return <AccessLogsClient hotelId={context.hotelId} />;
}
