'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InstallationDiagram } from '@/components/hardware/InstallationDiagram';

export default function InstallationGuidePage() {
  return (
    <DashboardLayout>
      <div className="pb-2">
        <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 dark:text-white tracking-tight">
          Door Controller Installation & ESP32 Firmware
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Interactive engineering blueprint, 3-panel wiring architecture, pinout schematic, and production C++ code for hotel locks.
        </p>
      </div>

      <InstallationDiagram />
    </DashboardLayout>
  );
}
