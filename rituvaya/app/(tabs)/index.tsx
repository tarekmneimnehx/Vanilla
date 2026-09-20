import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import type { OccurrenceView } from '@/domain/logging/status';
import { nextDose, overdueViews } from '@/domain/services/queries';
import { goalOn, totalFor } from '@/domain/services/hydrationService';
import { wallClock } from '@/domain/time/clock';
import { useI18n } from '@/i18n';
import { formatItemDose } from '@/i18n/dose';
import { formatLocalDate, formatMinutes, formatTime } from '@/i18n/format';
import { useDay, useFormatContext, useIndexes, useNow, useSnapshot, useStore, useToday } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button, IconButton } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { SectionHeader } from '@/ui/components/Controls';
import { EmptyState } from '@/ui/components/EmptyState';
import { Icon } from '@/ui/components/Icon';
import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';
import { TAB_BAR_HEIGHT } from '@/ui/components/TabBar';
import { useReducedMotion } from '@/ui/motion';
import { DoseActionSheet } from '@/features/dose/DoseActionSheet';
import { OccurrenceRow } from '@/features/dose/OccurrenceRow';
import { useDoseActions } from '@/features/dose/useDoseActions';
import { HydrationCard } from '@/features/hydration/HydrationCard';
import { ProgressCard } from '@/features/today/ProgressCard';

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const store = useStore();
  const { t, language } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const idx = useIndexes();
  const today = useToday();
  const now = useNow();
  const day = useDay(today);
  const actions = useDoseActions();
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<OccurrenceView | null>(null);

  const hour = wallClock(now, snapshot.tz).hour;
  const greetingKey = hour < 12 ? 'greeting.morning' : hour < 17 ? 'greeting.afternoon' : hour < 22 ? 'greeting.evening' : 'greeting.night';
  const name = snapshot.settings.preferredName.trim();
  const greeting = t(greetingKey, { name: name ? `${t('greeting.nameSeparator')}${name}` : '' });

  const totalMl = totalFor(snapshot.hydration, today);
  const goalMl = goalOn(snapshot.settings, today);
  const next = useMemo(() => nextDose(day.views), [day.views]);
  const overdue = useMemo(() => overdueViews(day.views), [day.views]);
  const allDone = day.views.length > 0 && day.views.every((v) => v.isFinal);
  const hasActiveItems = snapshot.items.some((i) => i.status === 'active');
  const groupedKeys = new Set(day.groups.flatMap((g) => g.views.map((v) => v.occurrence.key)));
  const ungrouped = day.views.filter((v) => !groupedKeys.has(v.occurrence.key));

  // Chronological sections: groups and single doses interleaved by time.
  const sections = useMemo(() => {
    const list: { key: string; time: number; node: 'group' | 'single'; group?: (typeof day.groups)[number]; view?: OccurrenceView }[] = [];
    for (const group of day.groups) list.push({ key: `g-${group.group.id}`, time: group.views[0].occurrence.scheduledAt, node: 'group', group });
    for (const view of ungrouped) list.push({ key: view.occurrence.key, time: view.occurrence.scheduledAt, node: 'single', view });
    return list.sort((a, b) => a.time - b.time);
  }, [day.groups, ungrouped]);

  const selectedItem = selected ? (idx.itemsById.get(selected.occurrence.itemId) ?? null) : null;
  // Keep the sheet in sync with fresh data after an action.
  const liveSelected = selected ? (day.views.find((v) => v.occurrence.key === selected.occurrence.key) ?? null) : null;

  return (
    <Screen
      bottomInset={TAB_BAR_HEIGHT + 24}
      headerEnd={<IconButton icon="plus" accessibilityLabel={t('today.addItem')} onPress={() => router.push('/item/new')} variant="soft" />}
      scrollProps={{ contentInsetAdjustmentBehavior: 'never' }}
      testID="today"
    >
      <View style={{ gap: 2, paddingTop: theme.spacing.xs }}>
        <Text variant="display" accessibilityRole="header">
          {greeting}
        </Text>
        <Text variant="body" color="secondary">
          {formatLocalDate(today, 'full', language)}
        </Text>
      </View>

      {snapshot.tzNotice ? (
        <Card tone="warn" padding={theme.spacing.md} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
          <Icon name="globe" size={18} color={theme.colors.warn} mirror={false} />
          <Text variant="small" style={{ flex: 1 }}>
            {t('today.timezoneNotice', { tz: snapshot.tzNotice.to })}
          </Text>
          <IconButton icon="x" size={16} accessibilityLabel={t('today.dismiss')} onPress={() => store.dismissTzNotice()} style={{ width: 32, height: 32 }} />
        </Card>
      ) : null}

      <ProgressCard day={day} waterMl={totalMl} goalMl={goalMl} />

      {!hasActiveItems && day.views.length === 0 ? (
        <Card>
          <EmptyState icon="feather" title={t('today.empty')} body={t('today.emptySubtitle')} actionLabel={t('today.addItem')} onAction={() => router.push('/item/new')} compact />
        </Card>
      ) : null}

      {allDone ? (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(300)}>
          <Card tone="soft" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={24} color={theme.colors.textOnPrimary} mirror={false} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="subheading">{t('today.allDone')}</Text>
              <Text variant="small" color="secondary">
                {t('today.allDoneSubtitle')}
              </Text>
            </View>
          </Card>
        </Animated.View>
      ) : next ? (
        <Card tone="primary" style={{ gap: theme.spacing.md }} accessibilityLabel={t('today.nextDose')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="label" style={{ color: theme.colors.textOnPrimary, opacity: 0.8, textTransform: 'uppercase' }}>
              {next.siblings.length ? t('today.nextDoses') : t('today.nextDose')}
            </Text>
            <Text variant="smallStrong" style={{ color: theme.colors.textOnPrimary }}>
              {formatTime(next.view.effectiveAt, format)}
            </Text>
          </View>
          <View style={{ gap: 4 }}>
            {[next.view, ...next.siblings].slice(0, 4).map((view) => {
              const item = idx.itemsById.get(view.occurrence.itemId);
              if (!item) return null;
              return (
                <View key={view.occurrence.key} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <Text variant="heading" style={{ color: theme.colors.textOnPrimary }} ltr>
                    {item.displayName}
                  </Text>
                  <Text variant="small" style={{ color: theme.colors.textOnPrimary, opacity: 0.85 }}>
                    {formatItemDose(item, language)}
                  </Text>
                </View>
              );
            })}
            {next.siblings.length > 3 ? (
              <Text variant="small" style={{ color: theme.colors.textOnPrimary, opacity: 0.85 }}>
                +{next.siblings.length - 3}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
            {next.siblings.length === 0 ? (
              <Button
                label={t('dose.taken')}
                icon="check"
                variant="secondary"
                labelColor={theme.colors.primary}
                onPress={() => void actions.take(next.view)}
                style={{ backgroundColor: theme.colors.textOnPrimary, borderColor: theme.colors.textOnPrimary }}
                accessibilityLabel={t('a11y.markTaken', { name: idx.itemsById.get(next.view.occurrence.itemId)?.displayName ?? '' })}
              />
            ) : (
              <Button label={t('today.groupAction')} icon="check" variant="secondary" labelColor={theme.colors.primary} onPress={() => void actions.takeAll([next.view, ...next.siblings])} style={{ backgroundColor: theme.colors.textOnPrimary, borderColor: theme.colors.textOnPrimary }} />
            )}
            <Button label={t('common.more')} variant="ghost" labelColor={theme.colors.textOnPrimary} onPress={() => setSelected(next.view)} style={{ borderColor: 'rgba(255,255,255,0.35)' }} accessibilityLabel={t('dose.details')} />
          </View>
        </Card>
      ) : null}

      {overdue.length > 0 ? (
        <Card tone="warn" style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="alert-circle" size={18} color={theme.colors.warn} mirror={false} />
            <Text variant="subheading">{t('today.overdue')}</Text>
          </View>
          {overdue.map((view) => {
            const item = idx.itemsById.get(view.occurrence.itemId);
            if (!item) return null;
            return <OccurrenceRow key={view.occurrence.key} view={view} item={item} onPress={() => setSelected(view)} onTake={() => void actions.take(view)} compact />;
          })}
        </Card>
      ) : null}

      <HydrationCard totalMl={totalMl} goalMl={goalMl} />

      {sections.length > 0 ? <SectionHeader title={t('today.schedule')} /> : null}
      {sections.map((section) => {
        if (section.node === 'group' && section.group) {
          const pending = section.group.views.filter((v) => !v.isFinal);
          return (
            <Animated.View key={section.key} layout={reduced ? undefined : Layout.duration(200)}>
              <Card style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="subheading">{section.group.group.name}</Text>
                    <Text variant="small" color="secondary">
                      {formatMinutes(section.group.scheduledMinutes, format)} · {t('routine.itemCount', { count: section.group.views.length })}
                    </Text>
                  </View>
                  {pending.length > 0 ? (
                    <Button label={t('today.groupActionCount', { count: pending.length })} size="sm" variant="secondary" icon="check-circle" onPress={() => void actions.takeAll(pending)} />
                  ) : (
                    <Text variant="smallStrong" color="primary">
                      {t('today.groupAllDone')}
                    </Text>
                  )}
                </View>
                {section.group.views.map((view) => {
                  const item = idx.itemsById.get(view.occurrence.itemId);
                  if (!item) return null;
                  return <OccurrenceRow key={view.occurrence.key} view={view} item={item} onPress={() => setSelected(view)} onTake={() => void actions.take(view)} showTime={false} compact />;
                })}
              </Card>
            </Animated.View>
          );
        }
        if (section.view) {
          const item = idx.itemsById.get(section.view.occurrence.itemId);
          if (!item) return null;
          return (
            <Animated.View key={section.key} layout={reduced ? undefined : Layout.duration(200)}>
              <Card padding={theme.spacing.md}>
                <OccurrenceRow view={section.view} item={item} onPress={() => setSelected(section.view!)} onTake={() => void actions.take(section.view!)} compact />
              </Card>
            </Animated.View>
          );
        }
        return null;
      })}

      {day.extras.length > 0 ? (
        <>
          <SectionHeader title={t('today.extras')} />
          <Card padding={theme.spacing.md} style={{ gap: 4 }}>
            {day.extras.map((log) => (
              <View key={log.id} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 44 }}>
                <Icon name="check-circle" size={18} color={theme.colors.primary} mirror={false} />
                <Text variant="bodyStrong" ltr style={{ flex: 1 }}>
                  {log.itemNameSnapshot}
                </Text>
                <Text variant="small" color="secondary">
                  {formatTime(log.at, format)}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <DoseActionSheet view={liveSelected} item={selectedItem} onClose={() => setSelected(null)} />
    </Screen>
  );
}
