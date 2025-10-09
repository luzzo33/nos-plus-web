'use client';

import { SimpleDashboardProvider } from '@/components/simple-dashboard/context/SimpleDashboardContext';
import { SimpleDashboardShell } from '@/components/simple-dashboard/SimpleDashboardShell';

export function SimpleDashboard() {
  return (
    <SimpleDashboardProvider>
      <SimpleDashboardShell />
    </SimpleDashboardProvider>
  );
}
