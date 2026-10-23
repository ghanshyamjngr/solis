import React, { useState } from 'react';
import { DollarSign, Target, Plus, ShieldCheck, TrendingUp, Sparkles, CheckCircle2, PiggyBank, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FinancialEntry, SavingsGoal, UserPreferences } from '../types';
import { getTodayDateString } from '../utils/timeline';

interface FinancialGoalsViewProps {
  savingsGoal: SavingsGoal;
  financialEntries: FinancialEntry[];
  preferences: UserPreferences;
  onUpdateSavingsGoal: (goal: SavingsGoal) => void;
  onAddFinancialEntry: (entry: FinancialEntry) => void;
}

export const FinancialGoalsView: React.FC<FinancialGoalsViewProps> = ({
  savingsGoal,
  financialEntries,
  preferences,
  onUpdateSavingsGoal,
  onAddFinancialEntry,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [amount, setAmount] = useState<number>(20);
  const [note, setNote] = useState<string>('Home-cooked meal instead of ordering delivery');
  const [type, setType] = useState<'saved' | 'spent_mindfully' | 'impulse_avoided'>('saved');
  const [goalAmount, setGoalAmount] = useState<number>(savingsGoal.targetAmount);
  const [goalTitle, setGoalTitle] = useState<string>(savingsGoal.title);
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);

  const isPlayful = preferences.themeStyle === 'playful-animated';
  const progressPercent = Math.min(100, Math.round((savingsGoal.currentAmount / savingsGoal.targetAmount) * 100));

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: FinancialEntry = {
      id: `fin-${Date.now()}`,
      date: getTodayDateString(),
      amountSaved: amount,
      note,
      type,
      createdAt: Date.now(),
    };

    onAddFinancialEntry(newEntry);
    onUpdateSavingsGoal({
      ...savingsGoal,
      currentAmount: savingsGoal.currentAmount + amount,
    });

    setShowAddModal(false);
    if (isPlayful) {
      confetti({ particleCount: 40, spread: 60 });
    }
  };

  const handleSaveGoal = () => {
    onUpdateSavingsGoal({
      ...savingsGoal,
      title: goalTitle,
      targetAmount: goalAmount,
    });
    setIsEditingGoal(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <PiggyBank className="w-6 h-6 text-emerald-500" />
          Mindful Financial Goals
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Notice how your daily choices connect to your aspirations. Completely private, on-device, and free of bank credentials.
        </p>
      </div>

      {/* Main Savings Target Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {savingsGoal.title}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Target Category: <strong className="text-slate-700 dark:text-slate-300">{savingsGoal.category}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingGoal(!isEditingGoal)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              {isEditingGoal ? 'Cancel' : 'Edit Goal'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Mindful Choice
            </button>
          </div>
        </div>

        {/* Goal Edit Form */}
        {isEditingGoal && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Update Savings Target</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Target Name</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Target Amount ($)</label>
                <input
                  type="number"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
            <button
              onClick={handleSaveGoal}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
            >
              Save Goal
            </button>
          </div>
        )}

        {/* Visual Progress Bar & Numbers */}
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                ${savingsGoal.currentAmount}
              </span>
              <span className="text-sm text-slate-400 ml-2">
                saved of ${savingsGoal.targetAmount}
              </span>
            </div>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {progressPercent}% Complete
            </span>
          </div>

          <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>Remaining: ${(savingsGoal.targetAmount - savingsGoal.currentAmount).toFixed(0)}</span>
            <span>Target date: {savingsGoal.targetDate || 'Ongoing'}</span>
          </div>
        </div>

        {/* Quick Mindful Choice Shortcuts */}
        <div className="pt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
            ⚡ Quick 1-Click Savings Loggers
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={() => {
                const entry: FinancialEntry = {
                  id: `fin-${Date.now()}`,
                  date: getTodayDateString(),
                  amountSaved: 15,
                  note: 'Home-cooked dinner instead of takeout',
                  type: 'saved',
                  createdAt: Date.now(),
                };
                onAddFinancialEntry(entry);
                onUpdateSavingsGoal({ ...savingsGoal, currentAmount: savingsGoal.currentAmount + 15 });
              }}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-400 text-left transition-all"
            >
              <strong className="text-xs text-slate-800 dark:text-slate-200 block">+ $15 Cooked at Home</strong>
              <span className="text-[10px] text-slate-400">Avoided delivery fee</span>
            </button>

            <button
              onClick={() => {
                const entry: FinancialEntry = {
                  id: `fin-${Date.now()}`,
                  date: getTodayDateString(),
                  amountSaved: 40,
                  note: 'Closed shopping tab & avoided impulse purchase',
                  type: 'impulse_avoided',
                  createdAt: Date.now(),
                };
                onAddFinancialEntry(entry);
                onUpdateSavingsGoal({ ...savingsGoal, currentAmount: savingsGoal.currentAmount + 40 });
              }}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-400 text-left transition-all"
            >
              <strong className="text-xs text-slate-800 dark:text-slate-200 block">+ $40 Resisted Impulse Cart</strong>
              <span className="text-[10px] text-slate-400">Delayed gratification</span>
            </button>

            <button
              onClick={() => {
                const entry: FinancialEntry = {
                  id: `fin-${Date.now()}`,
                  date: getTodayDateString(),
                  amountSaved: 6,
                  note: 'Made pour-over coffee at home',
                  type: 'saved',
                  createdAt: Date.now(),
                };
                onAddFinancialEntry(entry);
                onUpdateSavingsGoal({ ...savingsGoal, currentAmount: savingsGoal.currentAmount + 6 });
              }}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-400 text-left transition-all"
            >
              <strong className="text-xs text-slate-800 dark:text-slate-200 block">+ $6 Brewed Coffee at Home</strong>
              <span className="text-[10px] text-slate-400">Mindful morning ritual</span>
            </button>
          </div>
        </div>
      </div>

      {/* History of Mindful Financial Choices */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Mindful Choices</h3>

        {financialEntries.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No financial choices logged yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {financialEntries.slice(0, 8).map((f) => (
              <div key={f.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <strong className="text-slate-800 dark:text-slate-200 block">{f.note}</strong>
                  <span className="text-[10px] text-slate-400 font-mono">{f.date}</span>
                </div>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  +${f.amountSaved}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for adding custom financial entry */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleAddEntry}
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-xl space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Log Mindful Saving or Choice</h3>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Amount ($)</label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">What did you choose or avoid?</label>
              <input
                type="text"
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Cooked pasta at home instead of dining out"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              >
                <option value="saved">Directly Saved into Fund</option>
                <option value="impulse_avoided">Impulse Purchase Avoided</option>
                <option value="spent_mindfully">Mindful Essential Expense</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
