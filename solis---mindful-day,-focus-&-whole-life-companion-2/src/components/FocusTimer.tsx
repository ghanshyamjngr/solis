import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Sparkles, RotateCcw, Volume2, VolumeX, CheckCircle2, HeartHandshake, Tag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ActivityCategory, ActivityEntry, UserPreferences } from '../types';
import { playGentleBell, playCompletionChime } from '../utils/audio';
import { getTodayDateString } from '../utils/timeline';
import {
  EMPTY_FOCUS_TIMER,
  finishNativeFocusTimer,
  isNativeFocusTimer,
  loadFocusTimer,
  pauseNativeFocusTimer,
  readNativeFocusTimer,
  resumeNativeFocusTimer,
  saveFocusTimer,
  startNativeFocusTimer,
} from '../utils/focusTimer';
import { requestReminderPermission, updateWidgetData } from '../utils/taskReminders';

interface FocusTimerProps {
  preferences: UserPreferences;
  onSaveSession: (entry: ActivityEntry) => void;
  onViewTimeline: () => void;
}

const INTENTION_SUGGESTIONS = [
  'Deep Work & Writing',
  'Code & Architecture',
  'Focused Reading',
  'Creative Sketching',
  'Learning & Study',
  'Language Practice',
  'Problem Solving',
  'Mindful Decluttering',
];

export const FocusTimer: React.FC<FocusTimerProps> = ({
  preferences,
  onSaveSession,
  onViewTimeline,
}) => {
  const isPlayful = preferences.themeStyle === 'playful-animated';

  // Timer states
  const [mode, setMode] = useState<'preset' | 'open'>(() => loadFocusTimer().mode);
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number>(25);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const saved = loadFocusTimer();
    return Math.max(0, saved.durationSeconds - saved.elapsedSeconds);
  });
  const [isRunning, setIsRunning] = useState<boolean>(() => loadFocusTimer().running);
  const [isPaused, setIsPaused] = useState<boolean>(() => {
    const saved = loadFocusTimer();
    return saved.active && !saved.running;
  });
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => loadFocusTimer().elapsedSeconds);
  const [sessionStartTime, setSessionStartTime] = useState<string>('');
  const [timerError, setTimerError] = useState('');

  // Intention & metadata
  const [intention, setIntention] = useState<string>('Deep Work & Writing');
  const [category, setCategory] = useState<ActivityCategory>('focus');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [moodAfter, setMoodAfter] = useState<'fulfilled' | 'steady' | 'refreshed' | 'tired' | 'proud' | 'neutral'>('steady');

  // Summary completion modal
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [completedDurationMinutes, setCompletedDurationMinutes] = useState<number>(0);

  const completionHandled = useRef(false);
  const initialTimerState = useRef(loadFocusTimer());

  // Synchronize initial duration when preset changes (if not running)
  useEffect(() => {
    if (!isRunning && !isPaused && mode === 'preset') {
      setRemainingSeconds(selectedDurationMinutes * 60);
      setElapsedSeconds(0);
    }
  }, [selectedDurationMinutes, mode, isRunning, isPaused]);

  useEffect(() => {
    const saved = initialTimerState.current;
    if (saved.active) {
      setMode(saved.mode);
      setSelectedDurationMinutes(Math.max(1, Math.round(saved.durationSeconds / 60)));
      setIntention(saved.intention || 'Deep Work & Writing');
      setSessionStartTime(new Date(saved.startedAt || Date.now()).toTimeString().slice(0, 5));
    }
    if (isNativeFocusTimer()) {
      void readNativeFocusTimer().then((nativeState) => {
        if (nativeState.active) {
          saveFocusTimer(nativeState);
          setMode(nativeState.mode);
          setSelectedDurationMinutes(Math.max(1, Math.round(nativeState.durationSeconds / 60)));
          setIntention(nativeState.intention || 'Deep Work & Writing');
          setElapsedSeconds(nativeState.elapsedSeconds);
          setRemainingSeconds(Math.max(0, nativeState.durationSeconds - nativeState.elapsedSeconds));
          setIsRunning(nativeState.running);
          setIsPaused(!nativeState.running);
          setSessionStartTime(new Date(nativeState.startedAt || Date.now()).toTimeString().slice(0, 5));
        } else if (nativeState.completed) {
          saveFocusTimer(EMPTY_FOCUS_TIMER);
          completionHandled.current = true;
          setRemainingSeconds(0);
          setCompletedDurationMinutes(Math.max(1, Math.round(nativeState.durationSeconds / 60)));
          setShowCompletionModal(true);
          setIsRunning(false);
          setIsPaused(false);
        }
      }).catch((error) => {
        console.error('Could not restore Android focus notification state', error);
        setTimerError('Could not restore the Android focus timer state.');
      });
    }
  }, []);

  useEffect(() => {
    if (!isRunning && !(isNativeFocusTimer() && isPaused)) return;
    const tick = () => {
      if (isNativeFocusTimer()) {
        void readNativeFocusTimer().then((state) => {
          if (state.active) {
            setElapsedSeconds(state.elapsedSeconds);
            setRemainingSeconds(Math.max(0, state.durationSeconds - state.elapsedSeconds));
            setIsRunning(state.running);
            setIsPaused(!state.running);
            setMode(state.mode);
            saveFocusTimer(state);
            if (state.intention) setIntention(state.intention);
            return;
          }
          const previous = loadFocusTimer();
          const completed = previous.mode === 'preset'
            && previous.elapsedSeconds >= previous.durationSeconds;
          saveFocusTimer(EMPTY_FOCUS_TIMER);
          if ((state.completed || completed) && !completionHandled.current) {
            completionHandled.current = true;
            setIsRunning(false);
            setIsPaused(false);
            setElapsedSeconds(previous.durationSeconds);
            setRemainingSeconds(0);
            handleSessionFinish(Math.max(1, Math.round(previous.durationSeconds / 60)), true);
          } else if (!completed) {
            setIsRunning(false);
            setIsPaused(false);
          }
        }).catch((error) => {
          console.error('Could not synchronize Android focus timer state', error);
          setTimerError('Could not sync the Android notification timer. Reopen Focus and try again.');
        });
        return;
      }

      const saved = loadFocusTimer();
      if (!saved.active || !saved.running) return;
      const elapsed = saved.elapsedSeconds + Math.max(0, Math.floor((Date.now() - saved.startedAt) / 1000));
      setElapsedSeconds(elapsed);
      if (saved.mode === 'preset') {
        const remaining = Math.max(0, saved.durationSeconds - elapsed);
        setRemainingSeconds(remaining);
        if (remaining === 0 && !completionHandled.current) {
          completionHandled.current = true;
          saveFocusTimer({ ...saved, running: false, elapsedSeconds: saved.durationSeconds });
          setIsRunning(false);
          setIsPaused(false);
          handleSessionFinish(Math.max(1, Math.round(saved.durationSeconds / 60)));
        }
      }
      void updateWidgetData({ focus: `Running · ${intention || 'Focus session'}`, focusAction: 'Open Solis to view timer' })
        .catch((error) => console.error('Could not refresh focus widget data', error));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, isPaused, mode, selectedDurationMinutes]);

  const handleStart = async () => {
    setTimerError('');
    completionHandled.current = false;
    const now = Date.now();
    const durationSeconds = mode === 'preset' ? selectedDurationMinutes * 60 : 24 * 60 * 60;
    const next = {
      active: true,
      running: true,
      mode,
      durationSeconds,
      elapsedSeconds: 0,
      intention: intention || 'Focus session',
      startedAt: now,
    };
    saveFocusTimer(next);
    if (isNativeFocusTimer()) {
      try {
        const granted = await requestReminderPermission();
        if (!granted) throw new Error('Allow notifications to use the ongoing focus timer notification.');
        await startNativeFocusTimer(
          next,
          preferences.soundEnabled,
          preferences.vibrationEnabled,
          preferences.quietHoursStart,
          preferences.quietHoursEnd,
        );
      } catch (error) {
        saveFocusTimer(EMPTY_FOCUS_TIMER);
        setTimerError(error instanceof Error ? error.message : 'Could not start the Android timer notification.');
        return;
      }
    }
    void updateWidgetData({ focus: `Running · ${intention || 'Focus session'}`, focusAction: 'Open Solis to view timer' })
      .catch((error) => console.error('Could not refresh focus widget data', error));
    if (!isPaused) setSessionStartTime(new Date(now).toTimeString().slice(0, 5));
    setIsRunning(true);
    setIsPaused(false);
    playGentleBell(preferences.soundEnabled);
  };

  const handlePause = async () => {
    const saved = loadFocusTimer();
    const elapsed = saved.elapsedSeconds + Math.max(0, Math.floor((Date.now() - saved.startedAt) / 1000));
    const paused = { ...saved, running: false, elapsedSeconds: elapsed };
    saveFocusTimer(paused);
    if (isNativeFocusTimer()) {
      try {
        await pauseNativeFocusTimer();
      } catch (error) {
        console.error('Could not pause Android focus timer', error);
        setTimerError('The notification timer could not be paused.');
      }
    }
    void updateWidgetData({ focus: `Paused · ${intention || 'Focus session'}`, focusAction: 'Tap to resume in Solis' })
      .catch((error) => console.error('Could not refresh focus widget data', error));
    setElapsedSeconds(elapsed);
    setRemainingSeconds(Math.max(0, saved.durationSeconds - elapsed));
    setIsRunning(false);
    setIsPaused(true);
  };

  const handleResume = async () => {
    const saved = loadFocusTimer();
    const resumed = { ...saved, running: true, startedAt: Date.now() };
    saveFocusTimer(resumed);
    if (isNativeFocusTimer()) {
      try {
        await resumeNativeFocusTimer();
      } catch (error) {
        console.error('Could not resume Android focus timer', error);
        setTimerError('The notification timer could not be resumed.');
        return;
      }
    }
    void updateWidgetData({ focus: `Running · ${intention || 'Focus session'}`, focusAction: 'Open Solis to view timer' })
      .catch((error) => console.error('Could not refresh focus widget data', error));
    setIsRunning(true);
    setIsPaused(false);
    playGentleBell(preferences.soundEnabled);
  };

  const handleStop = async () => {
    const saved = loadFocusTimer();
    const elapsed = saved.running
      ? saved.elapsedSeconds + Math.max(0, Math.floor((Date.now() - saved.startedAt) / 1000))
      : saved.elapsedSeconds;
    saveFocusTimer({ ...saved, running: false, elapsedSeconds: elapsed });
    if (isNativeFocusTimer()) {
      try {
        await finishNativeFocusTimer();
      } catch (error) {
        console.error('Could not finish Android focus timer', error);
      }
    }
    setIsRunning(false);
    setIsPaused(false);
    setElapsedSeconds(elapsed);
    const durationMins = Math.max(1, Math.round(elapsed / 60));
    handleSessionFinish(durationMins);
  };

  const handleSessionFinish = (durationMinutes: number, playAlert = true) => {
    setIsRunning(false);
    setIsPaused(false);
    setCompletedDurationMinutes(durationMinutes);
    setShowCompletionModal(true);
    if (playAlert) playCompletionChime(preferences.soundEnabled);

    if (isPlayful) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#10b981', '#38bdf8', '#a855f7'],
      });
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setRemainingSeconds(selectedDurationMinutes * 60);
    saveFocusTimer(EMPTY_FOCUS_TIMER);
    if (isNativeFocusTimer()) {
      void finishNativeFocusTimer().catch((error) => console.error('Could not clear Android focus notification', error));
    }
    void updateWidgetData({ focus: 'No focus session running', focusAction: 'Tap to start in Solis' })
      .catch((error) => console.error('Could not refresh focus widget data', error));
  };

  const handleSaveCompletedSession = () => {
    const now = new Date();
    const endTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const startTimeStr = sessionStartTime || endTimeStr;

    const newEntry: ActivityEntry = {
      id: `focus-${Date.now()}`,
      source: 'manual',
      category: category,
      title: intention || 'Mindful Focus Session',
      startTime: startTimeStr,
      endTime: endTimeStr,
      date: getTodayDateString(),
      durationMinutes: completedDurationMinutes,
      notes: sessionNotes.trim() ? sessionNotes.trim() : undefined,
      isFocusSession: true,
      moodAfter: moodAfter,
      createdAt: Date.now(),
    };

    onSaveSession(newEntry);
    setShowCompletionModal(false);
    // Reset timer
    handleReset();
    setSessionNotes('');
  };

  // Time display formatting
  const displaySeconds = mode === 'preset' ? remainingSeconds : elapsedSeconds;
  const mins = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const progressPercent = mode === 'preset'
    ? Math.min(100, Math.max(0, ((selectedDurationMinutes * 60 - remainingSeconds) / (selectedDurationMinutes * 60)) * 100))
    : 100;

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Header and Gentle Encouragement */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-medium">
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>Non-Shaming Focus Space</span>
        </div>
        {timerError && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {timerError}
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Mindful Focus Session
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Set an intention, protect your attention, and return gently whenever you notice you drifted. Every return is progress.
        </p>
      </div>

      {/* Main Timer Visual Card */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-10 shadow-sm relative overflow-hidden transition-all">
        {/* Intention Input Bar */}
        <div className="max-w-md mx-auto mb-8 space-y-3">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
            What are you dedicating this time to?
          </label>
          <div className="relative">
            <input
              type="text"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              disabled={isRunning}
              placeholder="e.g. Deep Work on Architecture Plan..."
              className="w-full text-center px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-sm sm:text-base focus:ring-2 focus:ring-amber-500/40 focus:outline-none transition-all disabled:opacity-80"
            />
          </div>

          {/* Quick Intention Pills */}
          {!isRunning && (
            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              {INTENTION_SUGGESTIONS.slice(0, 5).map((sug) => (
                <button
                  key={sug}
                  onClick={() => setIntention(sug)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                    intention === sug
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-medium'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Breathing Ring & Timer Clock */}
        <div className="relative flex flex-col items-center justify-center my-6">
          {/* Subtle animated breathing ambient ring */}
          <div
            className={`w-64 h-64 sm:w-72 sm:h-72 rounded-full flex items-center justify-center relative transition-transform duration-1000 ${
              isRunning ? 'scale-105 animate-pulse' : 'scale-100'
            }`}
          >
            {/* SVG Ring Progress */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                className="stroke-slate-100 dark:stroke-slate-700/60"
                strokeWidth="5"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                className={`transition-all duration-500 ${
                  preferences.accentColor === 'amber'
                    ? 'stroke-amber-500'
                    : preferences.accentColor === 'sage'
                    ? 'stroke-emerald-500'
                    : preferences.accentColor === 'ocean'
                    ? 'stroke-sky-500'
                    : preferences.accentColor === 'lavender'
                    ? 'stroke-purple-500'
                    : 'stroke-rose-500'
                }`}
                strokeWidth="5"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <span className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-slate-900 dark:text-white">
                {timeFormatted}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                {isRunning ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    In focus session
                  </>
                ) : isPaused ? (
                  <span className="text-amber-500 font-semibold">Paused — breathe & resume</span>
                ) : (
                  <span>Ready when you are</span>
                )}
              </span>

              {isRunning && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[170px] line-clamp-1">
                  {intention}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Preset Selector */}
        {!isRunning && !isPaused && (
          <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Presets:</span>
            {[15, 25, 45, 60, 90].map((minsVal) => (
              <button
                key={minsVal}
                onClick={() => {
                  setMode('preset');
                  setSelectedDurationMinutes(minsVal);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  mode === 'preset' && selectedDurationMinutes === minsVal
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {minsVal} min
              </button>
            ))}
            <button
              onClick={() => {
                setMode('open');
                setElapsedSeconds(0);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                mode === 'open'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Open Flow (Count Up)
            </button>
          </div>
        )}

        {/* Controls Bar: Start / Pause / Resume / Stop / Reset */}
        <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          {!isRunning && !isPaused ? (
            <button
              onClick={handleStart}
              className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-semibold text-base shadow-md transition-all hover:scale-102 active:scale-98 ${
                preferences.accentColor === 'amber'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : preferences.accentColor === 'sage'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : preferences.accentColor === 'ocean'
                  ? 'bg-sky-600 hover:bg-sky-500'
                  : preferences.accentColor === 'lavender'
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              Begin Focus
            </button>
          ) : (
            <>
              {isRunning ? (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-all"
                  aria-label="Pause session"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all"
                  aria-label="Resume session"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Resume
                </button>
              )}

              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-sm transition-all"
                aria-label="Stop and record session"
              >
                <Square className="w-4 h-4 fill-current" />
                Finish & Log
              </button>

              <button
                onClick={handleReset}
                className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Reset timer without logging"
                aria-label="Reset timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mindful Return Card */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-start gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
        <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">The Art of the Gentle Return:</span>
          Focus is not about keeping your mind perfectly still—it is about noticing when you got distracted, smiling without judging yourself, and choosing to return. Each return strengthens your attention.
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Focus Session Complete!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Recorded duration: <strong className="text-slate-700 dark:text-slate-200">{completedDurationMinutes} minutes</strong>
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Activity Name / Intention
                </label>
                <input
                  type="text"
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Reflections or Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="What did you work on? How did it feel?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  How are you feeling right now?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'fulfilled', label: 'Fulfilled' },
                    { id: 'steady', label: 'Steady' },
                    { id: 'refreshed', label: 'Refreshed' },
                    { id: 'tired', label: 'A Bit Tired' },
                    { id: 'proud', label: 'Proud' },
                    { id: 'neutral', label: 'Neutral' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMoodAfter(m.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        moodAfter === m.id
                          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
              <button
                onClick={() => setShowCompletionModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Discard
              </button>
              <button
                onClick={handleSaveCompletedSession}
                className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-sm hover:opacity-95"
              >
                Save to Daily Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
