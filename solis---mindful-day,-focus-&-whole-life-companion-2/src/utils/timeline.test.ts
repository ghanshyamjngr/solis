import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, sortEntriesChronologically, calculateDayBreakdown, calculateDetailedInsights } from './timeline.js';
import { ActivityEntry } from '../types';

test('formatDuration formats minutes accurately into readable h & m', () => {
  assert.equal(formatDuration(0), '0m');
  assert.equal(formatDuration(25), '25m');
  assert.equal(formatDuration(60), '1h');
  assert.equal(formatDuration(90), '1h 30m');
  assert.equal(formatDuration(125), '2h 5m');
});

test('sortEntriesChronologically sorts entries by date and time in ascending order', () => {
  const entries: ActivityEntry[] = [
    {
      id: '2',
      category: 'focus',
      title: 'Afternoon Focus',
      startTime: '14:00',
      endTime: '15:00',
      date: '2026-10-22',
      durationMinutes: 60,
      createdAt: 2,
    },
    {
      id: '1',
      category: 'sleep',
      title: 'Morning Wake',
      startTime: '07:00',
      endTime: '07:30',
      date: '2026-10-22',
      durationMinutes: 30,
      createdAt: 1,
    },
    {
      id: '3',
      category: 'meal',
      title: 'Dinner',
      startTime: '19:00',
      endTime: '19:45',
      date: '2026-10-22',
      durationMinutes: 45,
      createdAt: 3,
    },
  ];

  const sorted = sortEntriesChronologically(entries);
  assert.equal(sorted[0].id, '1');
  assert.equal(sorted[1].id, '2');
  assert.equal(sorted[2].id, '3');
});

test('calculateDayBreakdown aggregates category totals accurately', () => {
  const entries: ActivityEntry[] = [
    {
      id: '1',
      category: 'focus',
      title: 'Focus 1',
      startTime: '09:00',
      endTime: '10:00',
      date: '2026-10-22',
      durationMinutes: 60,
      createdAt: 1,
    },
    {
      id: '2',
      category: 'offline',
      title: 'Offline Walk',
      startTime: '10:00',
      endTime: '10:30',
      date: '2026-10-22',
      durationMinutes: 30,
      createdAt: 2,
    },
    {
      id: '3',
      category: 'sleep',
      title: 'Nap',
      startTime: '13:00',
      endTime: '13:45',
      date: '2026-10-22',
      durationMinutes: 45,
      createdAt: 3,
    },
  ];

  const stats = calculateDayBreakdown(entries);
  assert.equal(stats.focusMinutes, 60);
  assert.equal(stats.offlineAndNature, 30);
  assert.equal(stats.totalTrackedMinutes, 135);
});

test('calculateDetailedInsights computes focus totals, goal progress and breakdown ranking', () => {
  const entries: ActivityEntry[] = [
    {
      id: '1',
      category: 'focus',
      title: 'Deep Coding',
      startTime: '09:00',
      endTime: '10:30',
      date: '2026-10-22',
      durationMinutes: 90,
      isFocusSession: true,
      createdAt: 1,
    },
    {
      id: '2',
      category: 'focus',
      title: 'Writing',
      startTime: '14:00',
      endTime: '14:30',
      date: '2026-10-22',
      durationMinutes: 30,
      isFocusSession: true,
      createdAt: 2,
    },
    {
      id: '3',
      category: 'nature',
      title: 'Park Walk',
      startTime: '11:00',
      endTime: '11:45',
      date: '2026-10-22',
      durationMinutes: 45,
      createdAt: 3,
    },
  ];

  const insights = calculateDetailedInsights(entries, 120, 180);
  assert.equal(insights.totalFocusMinutes, 120);
  assert.equal(insights.focusGoalProgress, 100);
  assert.equal(insights.focusSessionCount, 2);
  assert.equal(insights.longestFocusSessionMinutes, 90);
  assert.equal(insights.categoryBreakdown.length, 2);
  assert.equal(insights.categoryBreakdown[0].category, 'focus');
  assert.equal(insights.categoryBreakdown[0].percentage, 73); // 120/165 * 100
  assert.ok(insights.observedFacts.length > 0);
});
