import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { fromMl, progressRatio } from '@/domain/hydration/units';
import { useI18n } from '@/i18n';
import { formatVolume } from '@/i18n/format';
import { useSnapshot, useStore } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { ProgressBar } from '@/ui/components/Controls';
import { HydrationGlass } from '@/ui/components/HydrationGlass';
import { Icon } from '@/ui/components/Icon';
import { Pressable } from '@/ui/components/Pressable';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';
import { haptic } from '@/ui/haptics';

export interface HydrationCardProps {
  totalMl: number;
  goalMl: number;
}

/** Today's water card: goal, progress and quick add, with a link to the full hydration screen. */
export function HydrationCard({ totalMl, goalMl }: HydrationCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const store = useStore();
  const toast = useToast();
  const { t, language } = useI18n();
  const snapshot = useSnapshot();
  const unit = snapshot.settings.volumeUnit;
  const ratio = progressRatio(totalMl, goalMl);
  const reached = goalMl > 0 && totalMl >= goalMl;

  const add = async (ml: number) => {
    const entry = await store.addWater(ml);
    haptic.tap();
    toast.show({ message: t('hydration.added', { amount: formatVolume(ml, unit, language) }), icon: 'droplet', tone: 'water', actionLabel: t('common.undo'), onAction: () => store.removeWater(entry.id) });
  };

  if (goalMl <= 0) {
    return (
      <Card tone="water" style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="droplet" size={18} color={theme.colors.waterDeep} mirror={false} />
          <Text variant="subheading">{t('today.waterCard.title')}</Text>
        </View>
        <Text variant="small" color="secondary">
          {t('today.waterCard.noGoal')}
        </Text>
        <Button label={t('today.waterCard.setGoal')} variant="water" size="sm" onPress={() => router.push('/hydration')} />
      </Card>
    );
  }

  return (
    <Card style={{ gap: theme.spacing.md }}>
      <Pressable onPress={() => router.push('/hydration')} accessibilityRole="button" accessibilityLabel={t('today.waterCard.open')} pressScale={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <HydrationGlass ratio={ratio} width={56} height={72} accessibilityLabel={t('a11y.waterGlass', { amount: formatVolume(totalMl, unit, language), goal: formatVolume(goalMl, unit, language) })} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="subheading">{t('today.waterCard.title')}</Text>
            <Icon name="chevron-right" size={18} color={theme.colors.textMuted} />
          </View>
          <Text variant="heading" ltr>
            {formatVolume(totalMl, unit, language)}
          </Text>
          <Text variant="small" color={reached ? 'water' : 'secondary'}>
            {reached ? t('today.waterCard.reached') : t('today.waterCard.remaining', { amount: formatVolume(Math.max(0, goalMl - totalMl), unit, language) })} · {t('today.waterCard.goal', { goal: formatVolume(goalMl, unit, language) })}
          </Text>
          <ProgressBar ratio={ratio} tone="water" height={6} />
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {snapshot.settings.hydration.quickAddsMl.slice(0, 3).map((ml) => (
          <Chip key={ml} label={`${fromMl(ml, unit)} ${t(unit === 'ml' ? 'hydration.unitShort.ml' : 'hydration.unitShort.floz')}`} icon="plus" tone="water" onPress={() => void add(ml)} accessibilityLabel={`${t('common.add')} ${formatVolume(ml, unit, language)}`} />
        ))}
        <Chip label={t('common.more')} icon="more-horizontal" tone="water" onPress={() => router.push('/hydration')} />
      </View>
    </Card>
  );
}
