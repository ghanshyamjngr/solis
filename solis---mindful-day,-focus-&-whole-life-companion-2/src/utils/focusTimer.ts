import { Capacitor, registerPlugin } from '@capacitor/core';

export interface FocusTimerState {
  active: boolean;
  running: boolean;
  mode: 'preset' | 'open';
  durationSeconds: number;
  elapsedSeconds: number;
  intention: string;
  startedAt: number;
  completed?: boolean;
}

interface FocusTimerPlugin {
  start(options: {
    mode: 'preset' | 'open';
    durationSeconds: number;
    intention: string;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  finish(): Promise<void>;
  getState(): Promise<FocusTimerState>;
}

const NativeFocusTimer = registerPlugin<FocusTimerPlugin>('FocusTimer');
const STORAGE_KEY = 'solis_focus_timer_v1';

export const EMPTY_FOCUS_TIMER: FocusTimerState = {
  active: false,
  running: false,
  mode: 'preset',
  durationSeconds: 1500,
  elapsedSeconds: 0,
  intention: '',
  startedAt: 0,
};

export function isNativeFocusTimer(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function loadFocusTimer(): FocusTimerState {
  if (typeof window === 'undefined') return EMPTY_FOCUS_TIMER;
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return EMPTY_FOCUS_TIMER;
    const parsed = JSON.parse(value) as FocusTimerState;
    if (!parsed.active || !Number.isFinite(parsed.elapsedSeconds)) return EMPTY_FOCUS_TIMER;
    const elapsedSeconds = parsed.running
      ? parsed.elapsedSeconds + Math.max(0, Math.floor((Date.now() - parsed.startedAt) / 1000))
      : parsed.elapsedSeconds;
    return { ...parsed, elapsedSeconds };
  } catch (error) {
    console.error('Could not restore saved focus timer', error);
    return EMPTY_FOCUS_TIMER;
  }
}

export function saveFocusTimer(state: FocusTimerState): void {
  if (typeof window === 'undefined') return;
  try {
    if (!state.active) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Could not save focus timer state', error);
  }
}

export async function startNativeFocusTimer(
  state: FocusTimerState,
  soundEnabled: boolean,
  vibrationEnabled: boolean,
  quietHoursStart: string,
  quietHoursEnd: string,
): Promise<void> {
  await NativeFocusTimer.start({
    mode: state.mode,
    durationSeconds: state.durationSeconds,
    intention: state.intention,
    soundEnabled,
    vibrationEnabled,
    quietHoursStart,
    quietHoursEnd,
  });
}

export async function pauseNativeFocusTimer(): Promise<void> {
  await NativeFocusTimer.pause();
}

export async function resumeNativeFocusTimer(): Promise<void> {
  await NativeFocusTimer.resume();
}

export async function finishNativeFocusTimer(): Promise<void> {
  await NativeFocusTimer.finish();
}

export async function readNativeFocusTimer(): Promise<FocusTimerState> {
  return NativeFocusTimer.getState();
}
