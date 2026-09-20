import type { Item, RoutineGroup, Schedule, TimeSlot, Recurrence, Anchors, Dated } from '../types';

export function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    kind: 'supplement',
    displayName: 'Vitamin D3',
    genericName: 'Vitamin D3',
    brand: null,
    ingredients: [],
    strengthValue: 1000,
    strengthUnit: 'IU',
    servingSize: 1,
    servingUnit: 'capsule',
    doseAmount: 1,
    doseUnit: 'capsule',
    form: 'capsule',
    customFormLabel: null,
    purpose: null,
    notes: null,
    catalogId: 'vitamin-d3',
    status: 'active',
    isDemo: false,
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 0,
    archivedAt: null,
    ...overrides,
  };
}

export function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 'sched-1',
    itemId: 'item-1',
    recurrence: { type: 'daily' } as Recurrence,
    slots: [{ kind: 'exact', time: '08:00' }] as TimeSlot[],
    startDate: '2026-01-01',
    endDate: null,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    reminders: null,
    createdAt: 0,
    ...overrides,
  };
}

export function makeGroup(overrides: Partial<RoutineGroup> = {}): RoutineGroup {
  return {
    id: 'group-morning',
    name: 'Morning',
    timeHistory: [{ effectiveFrom: '2026-01-01', value: { kind: 'anchor', anchor: 'breakfast', offsetMinutes: 0 } }],
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 0,
    archivedAt: null,
    ...overrides,
  };
}

export const ANCHORS: Anchors = { wake: '07:00', breakfast: '08:00', lunch: '13:00', dinner: '19:00', bedtime: '23:00' };

export function anchorHistory(value: Anchors = ANCHORS, from = '2026-01-01'): Dated<Anchors>[] {
  return [{ effectiveFrom: from, value }];
}
