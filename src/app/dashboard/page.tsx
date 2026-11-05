import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ElectricianView from '@/components/dashboard/ElectricianView';
import ManagerView from '@/components/dashboard/ManagerView';
import ReceptionistView from '@/components/dashboard/ReceptionistView';
import { getUserContext } from '@/lib/server-auth';

export default async function DashboardPage() {
  const user = await getUserContext();
  if (!user) redirect('/auth/signin');

  return (
    <DashboardLayout>
      {user.role === 'manager' && <ManagerView hotelId={user.hotelId} />}
      {user.role === 'receptionist' && <ReceptionistView hotelId={user.hotelId} />}
      {user.role === 'electrician' && <ElectricianView hotelId={user.hotelId} />}
    </DashboardLayout>
  );
}
