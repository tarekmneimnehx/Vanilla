import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { minutesToTimeOfDay, parseTimeOfDay, type TimeOfDay } from '@/domain/time/clock';
import { addMonths, splitLocalDate, type LocalDate } from '@/domain/time/localDate';
import { useI18n } from '@/i18n';
import { formatLocalDate, formatMinutes, type FormatContext } from '@/i18n/format';
import { useTheme } from '../ThemeProvider';
import { Button, IconButton } from './Button';
import { CalendarGrid } from './CalendarGrid';
import { Chip } from './Chip';
import { Stepper } from './Controls';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Sheet } from './Sheet';
import { Text } from './Text';

type NativePickerModule = typeof import('@react-native-community/datetimepicker');

let nativePicker: NativePickerModule | null | undefined;
function loadNativePicker(): NativePickerModule | null {
  if (Platform.OS === 'web') return null;
  if (nativePicker === undefined) {
    try {
      nativePicker = require('@react-native-community/datetimepicker') as NativePickerModule;
    } catch {
      nativePicker = null;
    }
  }
  return nativePicker;
}

function PickerRow({ label, value, onPress, accessibilityLabel, icon = 'clock' }: { label?: string; value: string; onPress: () => void; accessibilityLabel: string; icon?: 'clock' | 'calendar' }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="smallStrong" color="secondary">
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={onPress}
        haptics="select"
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}: ${value}`}
        pressScale={0.99}
        style={{
          minHeight: 52,
          borderRadius: theme.radius.md,
          borderWidth: 1.5,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text variant="body" ltr>
          {value}
        </Text>
        <Icon name={icon} size={18} color={theme.colors.textMuted} mirror={false} />
      </Pressable>
    </View>
  );
}

export interface TimeFieldProps {
  label?: string;
  value: TimeOfDay;
  onChange: (value: TimeOfDay) => void;
  format: FormatContext;
  accessibilityLabel?: string;
}

/** Time picker: native spinner/dialog on iOS and Android, a stepper sheet on web. */
export function TimeField({ label, value, onChange, format, accessibilityLabel }: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const minutes = parseTimeOfDay(value);
  const display = formatMinutes(minutes, format);
  const native = loadNativePicker();
  const { t } = useI18n();

  const openPicker = () => {
    if (Platform.OS === 'android' && native) {
      native.DateTimePickerAndroid.open({
        mode: 'time',
        value: toDate(minutes),
        is24Hour: format.timeFormat === '24h' || (format.timeFormat === 'system' && format.deviceUses24h),
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(minutesToTimeOfDay(date.getHours() * 60 + date.getMinutes()));
        },
      });
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <PickerRow label={label} value={display} onPress={openPicker} accessibilityLabel={accessibilityLabel ?? label ?? t('schedule.exactTime')} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? t('schedule.exactTime')} scroll={false} footer={<Button label={t('common.done')} onPress={() => setOpen(false)} full />}>
        {Platform.OS === 'ios' && native ? (
          <IosTimeWheel minutes={minutes} onChange={(m) => onChange(minutesToTimeOfDay(m))} is24={format.timeFormat === '24h' || (format.timeFormat === 'system' && format.deviceUses24h)} />
        ) : (
          <TimeSteppers minutes={minutes} onChange={(m) => onChange(minutesToTimeOfDay(m))} format={format} />
        )}
      </Sheet>
    </>
  );
}

function toDate(minutes: number): Date {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

function IosTimeWheel({ minutes, onChange, is24 }: { minutes: number; onChange: (m: number) => void; is24: boolean }) {
  const native = loadNativePicker();
  const theme = useTheme();
  if (!native) return null;
  const Picker = native.default;
  return (
    <View style={{ alignItems: 'center' }}>
      <Picker
        mode="time"
        display="spinner"
        value={toDate(minutes)}
        is24Hour={is24}
        themeVariant={theme.isDark ? 'dark' : 'light'}
        onChange={(_event, date) => {
          if (date) onChange(date.getHours() * 60 + date.getMinutes());
        }}
      />
    </View>
  );
}

function TimeSteppers({ minutes, onChange, format }: { minutes: number; onChange: (m: number) => void; format: FormatContext }) {
  const theme = useTheme();
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const quick = [6 * 60, 8 * 60, 12 * 60, 18 * 60, 21 * 60];
  return (
    <View style={{ gap: theme.spacing.md }}>
      <Text variant="numeral" align="center" ltr>
        {formatMinutes(minutes, format)}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.md }}>
        <Stepper value={hour} min={0} max={23} onChange={(h) => onChange(h * 60 + minute)} accessibilityLabel="Hour" format={(v) => String(v).padStart(2, '0')} />
        <Stepper value={minute} min={0} max={55} step={5} onChange={(m) => onChange(hour * 60 + m)} accessibilityLabel="Minute" format={(v) => String(v).padStart(2, '0')} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {quick.map((q) => (
          <Chip key={q} label={formatMinutes(q, format)} selected={q === minutes} onPress={() => onChange(q)} />
        ))}
      </View>
    </View>
  );
}

export interface DateFieldProps {
  label?: string;
  value: LocalDate;
  onChange: (value: LocalDate) => void;
  language: FormatContext['language'];
  min?: LocalDate;
  accessibilityLabel?: string;
}

/** Calendar date picker; native dialog on Android, inline calendar elsewhere. */
export function DateField({ label, value, onChange, language, min, accessibilityLabel }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<LocalDate>(value);
  const theme = useTheme();
  const { t } = useI18n();
  const native = loadNativePicker();
  useEffect(() => setMonth(value), [value]);
  const display = formatLocalDate(value, 'medium', language);
  const openPicker = () => {
    if (Platform.OS === 'android' && native) {
      const { year, month: m, day } = splitLocalDate(value);
      native.DateTimePickerAndroid.open({
        mode: 'date',
        value: new Date(year, m - 1, day),
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
        },
      });
      return;
    }
    setOpen(true);
  };
  return (
    <>
      <PickerRow label={label} value={display} onPress={openPicker} accessibilityLabel={accessibilityLabel ?? label ?? t('schedule.startDate')} icon="calendar" />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? t('schedule.startDate')} scroll={false} footer={<Button label={t('common.done')} onPress={() => setOpen(false)} full />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="chevron-left" accessibilityLabel={t('history.previousMonth')} onPress={() => setMonth(addMonths(month, -1))} variant="soft" />
          <Text variant="subheading">{formatLocalDate(month, 'monthYear', language)}</Text>
          <IconButton icon="chevron-right" accessibilityLabel={t('history.nextMonth')} onPress={() => setMonth(addMonths(month, 1))} variant="soft" />
        </View>
        <CalendarGrid month={month} selected={value} onSelect={(d) => { if (!min || d >= min) onChange(d); }} language={language} minDate={min} />
        <View style={{ height: theme.spacing.xs }} />
      </Sheet>
    </>
  );
}
