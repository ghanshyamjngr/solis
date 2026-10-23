import React, { useState } from 'react';
import {
  Moon,
  Utensils,
  Coffee,
  Activity as ExerciseIcon,
  Compass,
  BookOpen,
  Trees,
  Heart,
  CircleDot,
  PlusCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ActivityCategory, ActivityEntry, UserPreferences } from '../types';
import { getTodayDateString } from '../utils/timeline';

interface ActivityLoggerProps {
  selectedDate: string;
  preferences: UserPreferences;
  onSaveEntry: (entry: ActivityEntry) => void;
  onViewTimeline: () => void;
}

interface CategoryOption {
  id: ActivityCategory;
  label: string;
  desc: string;
  icon: React.ReactNode;
  defaultTitle: string;
  defaultDuration: number;
}

export const ActivityLogger: React.FC<ActivityLoggerProps> = ({
  selectedDate,
  preferences,
  onSaveEntry,
  onViewTimeline,
}) => {
  const isPlayful = preferences.themeStyle === 'playful-animated';

  const categories: CategoryOption[] = [
    {
      id: 'sleep',
      label: 'Sleep & Rest',
      desc: 'Night sleep, morning wake or afternoon rest',
      icon: <Moon className="w-5 h-5 text-purple-500" />,
      defaultTitle: 'Restorative Sleep',
      defaultDuration: 480, // 8h
    },
    {
      id: 'offline',
      label: 'Offline Time',
      desc: 'Screen-free moments, phone away, offline hobbies',
      icon: <Compass className="w-5 h-5 text-emerald-500" />,
      defaultTitle: 'Screen-Free Offline Time',
      defaultDuration: 60,
    },
    {
      id: 'nature',
      label: 'Nature & Outside',
      desc: 'Walks, sunlight, fresh air, park visits',
      icon: <Trees className="w-5 h-5 text-teal-500" />,
      defaultTitle: 'Outdoor Walk & Sunlight',
      defaultDuration: 30,
    },
    {
      id: 'break',
      label: 'Mindful Break',
      desc: 'Breathing pause, stretching, resetting mind',
      icon: <Coffee className="w-5 h-5 text-sky-500" />,
      defaultTitle: 'Mindful Breathing & Reset',
      defaultDuration: 15,
    },
    {
      id: 'meal',
      label: 'Meal & Nourish',
      desc: 'Breakfast, lunch, dinner, mindful tea',
      icon: <Utensils className="w-5 h-5 text-orange-500" />,
      defaultTitle: 'Nourishing Lunch',
      defaultDuration: 35,
    },
    {
      id: 'exercise',
      label: 'Movement & Exercise',
      desc: 'Workout, yoga, running, body stretching',
      icon: <ExerciseIcon className="w-5 h-5 text-amber-500" />,
      defaultTitle: 'Energizing Movement Session',
      defaultDuration: 45,
    },
    {
      id: 'reading',
      label: 'Reading & Study',
      desc: 'Physical book reading, article, paper writing',
      icon: <BookOpen className="w-5 h-5 text-cyan-500" />,
      defaultTitle: 'Quiet Book Reading',
      defaultDuration: 40,
    },
    {
      id: 'social',
      label: 'Loved Ones & Social',
      desc: 'Conversation, family meal, connecting with friends',
      icon: <Heart className="w-5 h-5 text-rose-500" />,
      defaultTitle: 'Meaningful Conversation',
      defaultDuration: 45,
    },
    {
      id: 'other',
      label: 'Other Life Activity',
      desc: 'Commute, chores, errands, creative time',
      icon: <CircleDot className="w-5 h-5 text-slate-500" />,
      defaultTitle: 'Personal Life Routine',
      defaultDuration: 30,
    },
  ];

  // Form states
  const [category, setCategory] = useState<ActivityCategory>('offline');
  const [title, setTitle] = useState<string>('Screen-Free Offline Time');
  const [logDate, setLogDate] = useState<string>(selectedDate || getTodayDateString());
  const [startTime, setStartTime] = useState<string>('12:00');
  const [endTime, setEndTime] = useState<string>('13:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [timeMode, setTimeMode] = useState<'duration' | 'startEnd'>('duration');
  const [notes, setNotes] = useState<string>('');
  const [moodAfter, setMoodAfter] = useState<'fulfilled' | 'steady' | 'refreshed' | 'tired' | 'proud' | 'neutral'>('refreshed');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // When category changes, suggest title and duration
  const handleSelectCategory = (cat: CategoryOption) => {
    setCategory(cat.id);
    setTitle(cat.defaultTitle);
    setDurationMinutes(cat.defaultDuration);
  };

  // Quick 1-click template logger
  const handleQuickTemplate = (catId: ActivityCategory, t: string, mins: number, noteText: string) => {
    const now = new Date();
    const endH = now.getHours().toString().padStart(2, '0');
    const endM = now.getMinutes().toString().padStart(2, '0');
    const endTimeStr = `${endH}:${endM}`;

    // compute start time approx
    const startDate = new Date(now.getTime() - mins * 60000);
    const startH = startDate.getHours().toString().padStart(2, '0');
    const startM = startDate.getMinutes().toString().padStart(2, '0');
    const startTimeStr = `${startH}:${startM}`;

    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      category: catId,
      title: t,
      startTime: startTimeStr,
      endTime: endTimeStr,
      date: selectedDate,
      durationMinutes: mins,
      notes: noteText,
      moodAfter: 'refreshed',
      createdAt: Date.now(),
    };

    onSaveEntry(newEntry);
    setSavedSuccess(true);
    if (isPlayful) {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
    }
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let computedDuration = durationMinutes;
    let sTime = startTime;
    let eTime = endTime;

    if (timeMode === 'startEnd') {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff <= 0) diff += 24 * 60; // overnight e.g. sleep
      computedDuration = diff;
    } else {
      // from duration, compute end time based on start time
      const [sh, sm] = startTime.split(':').map(Number);
      const totalMins = sh * 60 + sm + durationMinutes;
      const eh = Math.floor(totalMins / 60) % 24;
      const em = totalMins % 60;
      eTime = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
    }

    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      category,
      title: title.trim() || 'Logged Activity',
      startTime: sTime,
      endTime: eTime,
      date: logDate,
      durationMinutes: Math.max(1, computedDuration),
      notes: notes.trim() ? notes.trim() : undefined,
      moodAfter,
      createdAt: Date.now(),
    };

    onSaveEntry(newEntry);
    setSavedSuccess(true);
    if (isPlayful) {
      confetti({ particleCount: 35, spread: 50 });
    }
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Title & Introduction */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Log Whole-Day Living
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Life is more than staring at screens. Log your sleep, delicious meals, outdoor walks, and offline restoration with zero guilt.
        </p>
      </div>

      {/* Quick 1-Click Logging Shortcuts */}
      <div className="bg-gradient-to-r from-amber-50/50 via-emerald-50/40 to-sky-50/40 dark:from-slate-800/80 dark:to-slate-800/40 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-3">
          ⚡ 1-Click Quick Logs (Instant)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickTemplate('sleep', 'Restorative 8h Sleep', 480, 'Full night rest')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-600 text-left transition-all"
          >
            <Moon className="w-4 h-4 text-purple-500 shrink-0" />
            <div className="text-xs">
              <strong className="block text-slate-800 dark:text-slate-200">8h Sleep</strong>
              <span className="text-[10px] text-slate-400">Night Rest</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickTemplate('offline', '1h Phone in Drawer Offline Time', 60, 'Screen-free disconnect')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-600 text-left transition-all"
          >
            <Compass className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="text-xs">
              <strong className="block text-slate-800 dark:text-slate-200">1h Offline</strong>
              <span className="text-[10px] text-slate-400">Disconnected</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickTemplate('nature', '30m Outdoor Sun Walk', 30, 'Sunlight & fresh air')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 hover:border-teal-300 dark:hover:border-teal-600 text-left transition-all"
          >
            <Trees className="w-4 h-4 text-teal-500 shrink-0" />
            <div className="text-xs">
              <strong className="block text-slate-800 dark:text-slate-200">30m Walk</strong>
              <span className="text-[10px] text-slate-400">Fresh Air</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickTemplate('break', '15m Breathing Pause & Tea', 15, 'Resetting mind')}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-600 text-left transition-all"
          >
            <Coffee className="w-4 h-4 text-sky-500 shrink-0" />
            <div className="text-xs">
              <strong className="block text-slate-800 dark:text-slate-200">15m Pause</strong>
              <span className="text-[10px] text-slate-400">Mindful reset</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Manual Logging Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-sm space-y-6"
      >
        {/* Category Picker */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
            Select Activity Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => handleSelectCategory(cat)}
                className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                  category === cat.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="shrink-0 mt-0.5">{cat.icon}</div>
                <div>
                  <span className="text-xs font-semibold block leading-tight">{cat.label}</span>
                  <span className="text-[10px] opacity-75 line-clamp-1 block mt-0.5">{cat.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Activity Name / Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Deep sleep, Park jog, Lunch with mom..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
          />
        </div>

        {/* Date and Time Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Date
            </label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Time Tracking Mode
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTimeMode('duration')}
                  className={`px-2 py-0.5 rounded ${timeMode === 'duration' ? 'bg-slate-200 dark:bg-slate-700 font-bold' : 'text-slate-400'}`}
                >
                  By Duration
                </button>
                <button
                  type="button"
                  onClick={() => setTimeMode('startEnd')}
                  className={`px-2 py-0.5 rounded ${timeMode === 'startEnd' ? 'bg-slate-200 dark:bg-slate-700 font-bold' : 'text-slate-400'}`}
                >
                  Start & End
                </button>
              </div>
            </div>

            {timeMode === 'duration' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-24 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono font-bold"
                  />
                  <span className="text-xs text-slate-500">minutes ({Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m)</span>
                </div>
                {/* Duration Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[15, 30, 45, 60, 90, 120, 480].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all ${
                        durationMinutes === mins
                          ? 'bg-amber-100 dark:bg-amber-900/60 border-amber-300 text-amber-900 dark:text-amber-200 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Start Time</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">End Time</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Reflections / Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Felt very energized after the walk, put phone in another room..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                Saved to your on-device timeline!
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 self-end">
            <button
              type="button"
              onClick={onViewTimeline}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              View Timeline
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-sm hover:opacity-95 transition-opacity"
            >
              <PlusCircle className="w-4 h-4" />
              Save Activity
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
