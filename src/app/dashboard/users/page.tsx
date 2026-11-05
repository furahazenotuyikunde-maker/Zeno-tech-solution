import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getUserContext } from '@/lib/server-auth';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const context = await getUserContext();
  if (!context) return <DashboardLayout><p className="text-rose-300">Hotel not found.</p></DashboardLayout>;
  if (context.role !== 'manager') return <DashboardLayout><p className="text-rose-300">Manager access required.</p></DashboardLayout>;
  return <UsersClient />;
}
