import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Shield,
  Smartphone,
  Cpu,
  DollarSign,
  Milestone,
  GitBranch,
  Copy,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';

export const ArchitecturePlanView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<number>(1);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  const copyTemplate = () => {
    const text = `I am building my personal life companion app.
Here is the ONE small, specific change I want to make:
- Target Feature: [e.g. Add tag selection to Focus Timer]
- Desired Behavior: [e.g. When the user stops a timer, let them pick 1-3 tags like #work, #study, #writing]
- Constraints: Keep all data stored locally on device, do not add external accounts, keep the non-shaming gentle tone.
- Files to inspect first: src/components/FocusTimer.tsx and src/types/index.ts.

Please provide only the necessary edits for this single change.`;

    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const sections = [
    { id: 1, title: '1. Product Definition', icon: BookOpen },
    { id: 2, title: '2. Scope & Feature Map', icon: Layers },
    { id: 3, title: '3. Tech & Architecture', icon: Cpu },
    { id: 4, title: '4. Privacy & Trust Plan', icon: Shield },
    { id: 5, title: '5. Platform Reality Check', icon: Smartphone },
    { id: 6, title: '6. Cost & Tool Plan', icon: DollarSign },
    { id: 7, title: '7. Phased Delivery Plan', icon: Milestone },
    { id: 8, title: '8. Exact First Milestone', icon: CheckCircle2 },
    { id: 9, title: '9. Beginner AI + Git Workflow', icon: GitBranch },
    { id: 10, title: '10. Verification Sources', icon: ExternalLink },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Blueprint Header */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full">
              Product Architecture Specification
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Multi-Device Life & Focus Companion Plan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              A comprehensive technical and product blueprint for beginners: macOS, iOS, Android, watchOS & Fire TV.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyTemplate}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedPrompt ? 'Template Copied!' : 'Copy AI Prompt Template'}
            </button>
          </div>
        </div>

        {/* Section Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-6 border-t border-slate-100 dark:border-slate-700/60 mt-6 no-scrollbar">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                activeSection === sec.id
                  ? 'bg-amber-500 text-white font-semibold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <sec.icon className="w-3.5 h-3.5" />
              {sec.title}
            </button>
          ))}
        </div>
      </div>

      {/* Section Content Area */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-10 shadow-xs space-y-6">
        {/* Section 1 */}
        {activeSection === 1 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Product Definition & Philosophy</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">The soul, purpose, and non-negotiables of the app.</p>
            </div>

            <div className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed">
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900 text-slate-800 dark:text-amber-200">
                <p className="font-medium">
                  <strong>Core Statement:</strong> Awake is a warm, privacy-first personal life companion that helps people understand the complete rhythm of their days, protect their attention, and celebrate mindful progress—without guilt, shaming, or aggressive digital surveillance.
                </p>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white pt-2">Primary User Benefit</h3>
              <p>
                Unlike standard "screen time" tools that measure only phone usage and make users feel delinquent, Awake honors the <strong>whole human day</strong>. A meaningful day consists of restful sleep, nourishing meals, outdoor movement, offline conversations, and quiet recovery—not merely hours spent in productivity software.
              </p>

              <h3 className="text-base font-bold text-slate-900 dark:text-white pt-2">Guiding Design Principles</h3>
              <ul className="space-y-2 list-disc pl-5">
                <li>
                  <strong>Never Shame or Induce Guilt:</strong> No red warning banners, no skull icons, no "You wasted 3 hours today" accusations. Progress is non-linear; wandering is human.
                </li>
                <li>
                  <strong>The Gentle Return:</strong> Attention is a practice. When a user strays from a focus goal, returning with warmth is celebrated as the real act of strengthening focus.
                </li>
                <li>
                  <strong>Offline Life is First-Class:</strong> Putting the phone in a drawer, walking in sunlight, reading a physical paper book, or taking a restorative nap receive equal honor to coding or typing.
                </li>
                <li>
                  <strong>User Agency over Algorithms:</strong> Users decide quiet hours, notification tone, goals, and which activities matter. The app never claims to know what the user feels or make medical diagnoses.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Section 2 */}
        {activeSection === 2 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Product Scope & Feature Map</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Realistic status classification for each vision module.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Module</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">What User Can Actually Do</th>
                    <th className="py-2.5 px-3">Key Technical Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Daily Timeline & Dashboard</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-medium">First Milestone</span></td>
                    <td className="py-3 px-3">See full day in chronological order, visual balance flow, time blocks, edit/delete entries.</td>
                    <td className="py-3 px-3 text-slate-500">100% On-Device Local Storage</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Focus Sessions & Timer</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-medium">First Milestone</span></td>
                    <td className="py-3 px-3">Start, pause, resume, stop; set intentions; audio bell chime; breathing ring; log duration.</td>
                    <td className="py-3 px-3 text-slate-500">Web Audio API / Native Timers</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Whole-Day Activity Logging</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-medium">First Milestone</span></td>
                    <td className="py-3 px-3">Log Sleep, Meals, Breaks, Exercise, Offline Time with quick 1-click presets or manual times.</td>
                    <td className="py-3 px-3 text-slate-500">Manual entry only for now</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Dual Themes (Minimal vs Playful)</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-medium">First Milestone</span></td>
                    <td className="py-3 px-3">Switch between calm zen editorial styling and cheerful animated celebration with custom palette.</td>
                    <td className="py-3 px-3 text-slate-500">Local CSS/Tailwind tokens</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Automatic App Usage Insights</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-medium">Platform-Restricted</span></td>
                    <td className="py-3 px-3">Automated detection of time in social/games vs study apps.</td>
                    <td className="py-3 px-3 text-slate-500">Android: UsageStatsManager. iOS: ScreenTime/FamilyControls (Strict Apple entitlement)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Home Screen Widgets</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-xs font-medium">Later Milestone</span></td>
                    <td className="py-3 px-3">Glanceable daily progress ring & 1-tap quick logging on phone home screen.</td>
                    <td className="py-3 px-3 text-slate-500">Requires native WidgetKit (Swift) and Glance / AppWidget (Kotlin)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">WatchOS & Wear OS Support</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-xs font-medium">Later Milestone</span></td>
                    <td className="py-3 px-3">Wrist timer, haptic tap on finish, 1-tap offline mode logging.</td>
                    <td className="py-3 px-3 text-slate-500">Requires native watchOS app & WatchConnectivity sync</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Financial Goals & Tracking</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">Manual Entry (Later)</span></td>
                    <td className="py-3 px-3">Tracking mindful spending vs impulse shopping. (No bank sync required initially).</td>
                    <td className="py-3 px-3 text-slate-500">Keep manual to avoid Plaid/Yodlee bank compliance costs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 3 */}
        {activeSection === 3 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Recommended Technology & Architecture</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Clear comparison and concrete recommendation for a beginner.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider">
                  Recommended Path
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-2">
                  Responsive Web App First, then Flutter for Native
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Start with a clean React + TypeScript web app in Google AI Studio to validate UI, data models, timers, and daily timeline with 0 installation friction. Once validated, wrap or port core models to <strong>Flutter</strong> to target iOS, Android, and macOS from a single codebase.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                  Native Android Only
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-2">
                  Kotlin / Jetpack Compose
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Native Android gives easiest access to <code className="font-mono text-[11px]">UsageStatsManager</code> for app tracking, but completely excludes your iPhone, Mac, and Apple Watch users unless you rewrite everything in Swift.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                  Cross-Platform Flutter
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-2">
                  Flutter (Dart)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Best unified framework for iOS, Android, macOS, and desktop. Shares 90% of business logic, state, and UI. Only system widgets and ScreenTime extensions require small native Swift/Kotlin plugins.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 space-y-2">
              <strong className="block font-semibold">How to use Google AI Studio without getting stuck:</strong>
              <p>
                Use Google AI Studio to plan features, prototype the reactive state machines (focus timer intervals, timeline sorting, daily balance algorithms), and build the complete functional Web app (like this one!). When you are ready for native mobile app stores, use AI Studio to write your Flutter or Swift modules step by step.
              </p>
            </div>
          </div>
        )}

        {/* Section 4 */}
        {activeSection === 4 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Privacy and Trust Plan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ensuring zero surveillance and authentic digital peace of mind.</p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    100% On-Device Local Storage
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    For Milestone 1, zero user data leaves the device. No accounts, no email signups, no analytics trackers, no telemetry. All focus logs, notes, and sleep entries reside strictly inside the device’s local database (IndexedDB / localStorage / SQLite).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                    Just-in-Time Deferred Permissions
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Never ask for permissions at onboarding. Notification permissions are requested only when the user explicitly enables a focus chime or quiet reminder. Usage permissions are only prompted if automated tracking is chosen.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-amber-500" />
                    Data Sovereignty (Export & Wipe)
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Users can export their complete historical timeline into an open JSON file at any time. A prominent "Erase All Data" button permanently purges local storage with a single confirmation.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    Guilt-Free Notification Etiquette
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Notifications never shame ("You failed your goal"). They observe facts gently: "You completed a 25m focus block. How about a glass of water?". Strict quiet hours prevent evening interruption.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 5 */}
        {activeSection === 5 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. Platform Reality Check & Hardware Constraints</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Honest breakdown of what operating systems permit vs strictly prohibit.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <th className="py-2 px-3">Platform</th>
                    <th className="py-2 px-3">App Tracking</th>
                    <th className="py-2 px-3">Floating Overlays</th>
                    <th className="py-2 px-3">Widgets</th>
                    <th className="py-2 px-3">Sync & Watch Path</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">Android</td>
                    <td className="py-3 px-3">
                      <span className="text-emerald-600 font-semibold">Possible</span> via <code className="font-mono text-[11px]">UsageStatsManager</code>. User must grant in system settings.
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-amber-600 font-semibold">Possible</span> with <code className="font-mono text-[11px]">SYSTEM_ALERT_WINDOW</code>, but heavily restricted by Google Play.
                    </td>
                    <td className="py-3 px-3">Standard AppWidget (Glance).</td>
                    <td className="py-3 px-3">Wear OS companion app or local Bluetooth/WiFi.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">iPhone (iOS)</td>
                    <td className="py-3 px-3">
                      <span className="text-rose-600 font-semibold">Heavily Restricted</span>. Must use Apple <code className="font-mono text-[11px]">ScreenTime / FamilyControls</code> API. Requires special Apple entitlement request.
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-rose-600 font-semibold">Forbidden</span>. iOS does not allow floating windows over third-party apps (except PiP video).
                    </td>
                    <td className="py-3 px-3">WidgetKit (SwiftUI) and Live Activities in Dynamic Island.</td>
                    <td className="py-3 px-3">WatchOS companion with WatchConnectivity or iCloud CloudKit.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">Mac (macOS)</td>
                    <td className="py-3 px-3">
                      <span className="text-emerald-600 font-semibold">Possible</span> via Accessibility API or <code className="font-mono text-[11px]">NSWorkspace</code> active app notifications.
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-emerald-600 font-semibold">Allowed</span>. Menu bar item or floating utility panel.
                    </td>
                    <td className="py-3 px-3">macOS Desktop Widgets & Menu Bar icon.</td>
                    <td className="py-3 px-3">iCloud sync / Local network peer sync.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">Apple Watch</td>
                    <td className="py-3 px-3">
                      <span className="text-slate-400">N/A (Wearable)</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-400">N/A</span>
                    </td>
                    <td className="py-3 px-3">Complications on Watch Face.</td>
                    <td className="py-3 px-3">Native watchOS app paired with iPhone.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">Fire TV OS</td>
                    <td className="py-3 px-3">
                      <span className="text-rose-600 font-semibold">Not Recommended</span> for focus companion.
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-400">N/A</span>
                    </td>
                    <td className="py-3 px-3">Leanback TV dashboard only.</td>
                    <td className="py-3 px-3">Excessive maintenance cost for low relevance to personal daily focus.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <strong>Key Realization for Beginners:</strong> Automatic screen-time tracking on iOS is one of Apple's most strictly gated APIs (<code className="font-mono">FamilyControls</code> entitlement). Starting with <em>manual logging and intentional focus sessions</em> allows you to ship a complete, beloved product immediately on both platforms without getting stuck in Apple's entitlement review queues.
              </div>
            </div>
          </div>
        )}

        {/* Section 6 */}
        {activeSection === 6 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">6. Cost and Tool Plan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Free-first toolchain and realistic public release expenditures.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-2">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 text-xs uppercase tracking-wider block">
                  100% Free Forever
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Local Development</h4>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                  <li>VS Code or Cursor editor</li>
                  <li>GitHub (public or private repos)</li>
                  <li>Node.js / React / TypeScript / Vite</li>
                  <li>Flutter SDK & Android Studio</li>
                  <li>Local SQLite / IndexedDB</li>
                  <li>Web Audio API sound synthesis</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 space-y-2">
                <span className="font-bold text-sky-800 dark:text-sky-300 text-xs uppercase tracking-wider block">
                  Free Within Generous Limits
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Hosting & AI Tools</h4>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                  <li>Google AI Studio prototyping</li>
                  <li>GitHub Pages / Vercel web hosting</li>
                  <li>Cloudflare Pages free tier</li>
                  <li>Firebase Firestore free tier (if future cloud sync added)</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2">
                <span className="font-bold text-amber-800 dark:text-amber-300 text-xs uppercase tracking-wider block">
                  Paid for Public App Store Release
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">App Stores & Hardware</h4>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                  <li>Apple Developer Program: <strong>$99 / year</strong> (Mandatory for iOS, macOS, watchOS TestFlight/App Store)</li>
                  <li>Google Play Console: <strong>$25 one-time</strong> fee</li>
                  <li>Physical Mac hardware (required for building iOS / watchOS apps)</li>
                  <li>Bank API services (Plaid): ~$0.30/account/mo (Keep out of early versions)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Section 7 */}
        {activeSection === 7 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">7. Phased Delivery Roadmap</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Achievable step-by-step milestones to prevent beginner overwhelm.</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  M1
                </span>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Milestone 1: The Mindful Core (Current Active App)
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>User Capability:</strong> Focus timer with breathing ring & bell, chronological daily timeline, manual activity logging (Sleep, Meals, Movement, Offline), holistic day balance metrics, minimal & playful themes, 100% on-device storage with JSON export.
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                    Technical Risk: Minimal. Verified working right now!
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  M2
                </span>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Milestone 2: Mobile App Packaging & Notifications
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>User Capability:</strong> Install on iOS & Android as PWA / Flutter mobile wrapper. Local device notification chimes on timer completion, custom quiet hours, home screen icon.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Demonstration needed: Local background notifications firing on Android & iOS without server backend.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  M3
                </span>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Milestone 3: Home-Screen Glanceable Widgets
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>User Capability:</strong> iOS WidgetKit & Android Glance home screen widgets showing daily focus vs offline balance and quick 1-tap start.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Demonstration needed: Widget timeline provider updating upon local data change.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  M4
                </span>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Milestone 4: Android App-Usage Permissions & WatchOS Companion
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>User Capability:</strong> Android users can optionally enable Usage Access to automatically aggregate time in social/gaming vs study. Apple Watch wrist timer.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Demonstration needed: Android <code className="font-mono text-[10px]">UsageStatsManager</code> background sync without battery drain.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  M5
                </span>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Milestone 5: End-to-End Encrypted Multi-Device Sync
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>User Capability:</strong> Timeline seamlessly syncs across iPhone, Mac, Android, and Web using zero-knowledge client-side encryption.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Demonstration needed: Conflict-free timeline resolution when editing offline on two devices.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 8 */}
        {activeSection === 8 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">8. Exact First Milestone: The Built App</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">What is delivered right now versus explicitly deferred.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Included in First Milestone (Built & Tested)
                </span>
                <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                  <li><strong>Focus Timer:</strong> Start, pause, resume, stop, preset durations (15m, 25m, 45m, 60m, 90m, open count-up), gentle Web Audio chimes, ambient breathing ring, and post-session reflection.</li>
                  <li><strong>Daily Timeline:</strong> Chronological visual timeline of all activities and focus blocks, with visual day flow bar and category filters.</li>
                  <li><strong>Manual Activity Logging:</strong> Sleep, Meals, Breaks, Exercise, Offline Time, Reading, Nature, Social, with 1-click templates.</li>
                  <li><strong>Holistic Balance Summary:</strong> Visual progress without guilt; honoring rest and offline life equally.</li>
                  <li><strong>Theme Customization:</strong> Clean Minimal vs Playful Animated mode, plus 5 warm accent palettes (Amber, Sage, Ocean, Lavender, Coral) and Dark/Light mode.</li>
                  <li><strong>Privacy Sovereignty:</strong> 100% on-device local storage, 1-click JSON backup export, backup import, and complete data wipe.</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Explicitly Out of Scope for Milestone 1
                </span>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                  <li>Automatic background app-usage interception (requires native platform permissions and special Apple review).</li>
                  <li>Cloud user authentication and mandatory server accounts.</li>
                  <li>Bank account linking or paid finance APIs.</li>
                  <li>Home screen widget compilation (requires native Xcode and Android Studio compilation).</li>
                  <li>Wearable watch standalone app compilation.</li>
                  <li>Fire TV OS application.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Section 9 */}
        {activeSection === 9 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">9. Beginner Workflow with AI and GitHub</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">The safe, iterative golden path to avoid breaking your code.</p>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <ol className="space-y-3 list-decimal pl-5 leading-relaxed">
                <li>
                  <strong>Step 1: Save Clean Baseline in Git.</strong> Every time your app works, commit:
                  <code className="block bg-slate-100 dark:bg-slate-900 p-2 rounded-lg font-mono text-xs my-1">git add . && git commit -m "Working focus timer and daily timeline"</code>
                </li>
                <li>
                  <strong>Step 2: Request ONE Small Change at a Time.</strong> Never ask the AI to "rewrite the whole app" or add 5 features at once. Ask for a single button, single modal, or single calculation.
                </li>
                <li>
                  <strong>Step 3: Review Diffs Before Accepting.</strong> Check which files changed. If the AI made an error, use <code className="font-mono text-xs">git checkout .</code> to restore your working baseline in 2 seconds!
                </li>
                <li>
                  <strong>Step 4: Keep Secrets Out of Git.</strong> Never commit API keys, passwords, or personal credentials.
                </li>
              </ol>

              {/* Reusable AI Prompt Box */}
              <div className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-2xl space-y-2 mt-4 font-mono text-xs relative">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-semibold text-[11px] uppercase tracking-wider text-amber-400">Reusable AI Prompt Template</span>
                  <button
                    onClick={copyTemplate}
                    className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPrompt ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed text-slate-300 pt-1 font-mono text-[11px]">
{`I am building my personal life companion app.
Here is the ONE small, specific change I want to make:
- Target Feature: [e.g. Add tag selection to Focus Timer]
- Desired Behavior: [e.g. When the user stops a timer, let them pick 1-3 tags like #work, #study, #writing]
- Constraints: Keep all data stored locally on device, do not add external accounts, keep the non-shaming gentle tone.
- Files to inspect first: src/components/FocusTimer.tsx and src/types/index.ts.

Please provide only the necessary edits for this single change.`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Section 10 */}
        {activeSection === 10 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">10. Official Verification Sources & Single Next Action</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Authoritative links and immediate recommended next step.</p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="https://developer.apple.com/documentation/screentime"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-500 block transition-colors group"
                >
                  <strong className="text-slate-900 dark:text-white flex items-center justify-between">
                    Apple ScreenTime Frameworks
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500" />
                  </strong>
                  <p className="text-[11px] text-slate-500 mt-1">Official Apple docs on FamilyControls & ManagedSettings restrictions.</p>
                </a>

                <a
                  href="https://developer.android.com/reference/android/app/usage/UsageStatsManager"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 block transition-colors group"
                >
                  <strong className="text-slate-900 dark:text-white flex items-center justify-between">
                    Android UsageStatsManager
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500" />
                  </strong>
                  <p className="text-[11px] text-slate-500 mt-1">Android Developer docs for querying app usage statistics.</p>
                </a>

                <a
                  href="https://docs.flutter.dev/"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 block transition-colors group"
                >
                  <strong className="text-slate-900 dark:text-white flex items-center justify-between">
                    Flutter Multi-Platform
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500" />
                  </strong>
                  <p className="text-[11px] text-slate-500 mt-1">Unified UI framework for iOS, Android, macOS, and Web.</p>
                </a>

                <a
                  href="https://developer.apple.com/support/compare-memberships/"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 block transition-colors group"
                >
                  <strong className="text-slate-900 dark:text-white flex items-center justify-between">
                    Apple Developer Program Pricing
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500" />
                  </strong>
                  <p className="text-[11px] text-slate-500 mt-1">Verification of the $99/year individual developer membership.</p>
                </a>
              </div>

              {/* The Single Best Next Action */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white space-y-2 mt-6 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full inline-block">
                  Your Single Best Next Action
                </span>
                <h3 className="text-lg font-bold">
                  Test your daily flow right here in the running Milestone 1 app!
                </h3>
                <p className="text-xs sm:text-sm text-white/95 leading-relaxed">
                  Click the <strong>"Daily Timeline"</strong> or <strong>"Focus Timer"</strong> tab above. Run a 1-minute test focus session with the breathing ring, log your sleep or an outdoor walk, and experience how calm and supportive it feels without surveillance. When you are ready, use the 1-click JSON Export in <strong>"Privacy & Storage"</strong> to save your data!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
