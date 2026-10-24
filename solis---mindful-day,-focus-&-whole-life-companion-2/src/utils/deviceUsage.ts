import { Capacitor, registerPlugin } from '@capacitor/core';
import { DailyDeviceUsage } from '../types';

interface DeviceUsagePlugin {
  checkAccess(): Promise<{ available: boolean; permissionGranted: boolean }>;
  openAccessSettings(): Promise<{ openedSettings: boolean }>;
  queryDailyUsage(options: { date: string }): Promise<{
    permissionGranted: boolean;
    date: string;
    syncedAt?: number;
    measurementVersion?: number;
    apps?: DailyDeviceUsage['apps'];
    screen?: DailyDeviceUsage['screen'];
  }>;
}

const DeviceUsage = registerPlugin<DeviceUsagePlugin>('DeviceUsage');

export function isAndroidApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function checkDeviceUsageAccess(): Promise<boolean> {
  const result = await DeviceUsage.checkAccess();
  return result.permissionGranted;
}

export async function openDeviceUsageSettings(): Promise<void> {
  await DeviceUsage.openAccessSettings();
}

export async function readDailyDeviceUsage(date: string): Promise<DailyDeviceUsage | null> {
  const result = await DeviceUsage.queryDailyUsage({ date });
  if (!result.permissionGranted || !result.syncedAt || !result.screen
    || result.measurementVersion !== 2) return null;
  return {
    date: result.date,
    syncedAt: result.syncedAt,
    measurementVersion: result.measurementVersion,
    apps: result.apps ?? [],
    screen: result.screen,
  };
}
