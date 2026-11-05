'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ReceptionDesk } from '@/components/enrollment/ReceptionDesk';

export default function GuestsEnrollmentPage() {
  return (
    <DashboardLayout>
      <div className="pb-2">
        <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 dark:text-white tracking-tight">
          Guest Registration & Card Enrollment
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Issue Mifare Classic 1K RFID cards to arriving guests using the desk-mounted RC522 reader.
        </p>
      </div>

      <ReceptionDesk />
    </DashboardLayout>
  );
}
