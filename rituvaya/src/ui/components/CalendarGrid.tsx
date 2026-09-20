import React from 'react';
import { View } from 'react-native';
import { addDays, endOfMonth, startOfMonth, startOfWeek, type LocalDate } from '@/domain/time/localDate';
import type { Language } from '@/domain/types';
import { useI18n } from '@/i18n';
import { formatLocalDate, weekdayNames, weekStartsOn } from '@/i18n/format';
import { useTheme } from '../ThemeProvider';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type DayMark = 'complete' | 'partial' | 'none' | 'free';

export interface CalendarDayInfo {
  mark: DayMark;
  water?: boolean;
}

export interface CalendarGridProps {
  month: LocalDate;
  selected?: LocalDate | null;
  onSelect: (date: LocalDate) => void;
  language: Language;
  info?: (date: LocalDate) => CalendarDayInfo | null;
  today?: LocalDate;
  minDate?: LocalDate;
  maxDate?: LocalDate;
}

/** Month grid with completion marks per day. Pure views, works everywhere. */
export function CalendarGrid({ month, selected, onSelect, language, info, today, minDate, maxDate }: CalendarGridProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const weekStart = weekStartsOn(language);
  const gridStart = startOfWeek(first, weekStart);
  const names = weekdayNames(language, 'narrow');
  const weeks: LocalDate[][] = [];
  let cursor = gridStart;
  while (cursor <= last) {
    const week: LocalDate[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  const markColor = (mark: DayMark) => {
    switch (mark) {
      case 'complete':
        return theme.colors.primary;
      case 'partial':
        return theme.colors.warn;
      case 'none':
        return theme.colors.danger;
      case 'free':
        return 'transparent';
    }
  };
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row' }}>
        {Array.from({ length: 7 }, (_, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text variant="caption" color="muted">
              {names[(weekStart + i) % 7]}
            </Text>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((date) => {
            const inMonth = date >= first && date <= last;
            const disabled = (minDate !== undefined && date < minDate) || (maxDate !== undefined && date > maxDate);
            const dayInfo = inMonth && info ? info(date) : null;
            const isSelected = selected === date;
            const isToday = today === date;
            const statusLabel = dayInfo ? t(`history.legend.${dayInfo.mark}` as const) : '';
            return (
              <View key={date} style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}>
                <Pressable
                  onPress={() => onSelect(date)}
                  disabled={disabled || !inMonth}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: disabled || !inMonth }}
                  accessibilityLabel={t('a11y.calendarDay', { date: formatLocalDate(date, 'long', language), status: statusLabel })}
                  pressScale={0.9}
                  haptics="select"
                  style={{
                    width: 40,
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 14,
                    backgroundColor: isSelected ? theme.colors.primary : isToday ? theme.colors.primaryTint : 'transparent',
                    opacity: !inMonth ? 0 : disabled ? 0.3 : 1,
                  }}
                >
                  <Text variant="smallStrong" style={{ color: isSelected ? theme.colors.textOnPrimary : theme.colors.text }} ltr>
                    {String(Number(date.slice(8)))}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 3, height: 6, marginTop: 2 }}>
                    {dayInfo && dayInfo.mark !== 'free' ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isSelected ? theme.colors.textOnPrimary : markColor(dayInfo.mark) }} /> : null}
                    {dayInfo?.water ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isSelected ? theme.colors.textOnPrimary : theme.colors.water }} /> : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
