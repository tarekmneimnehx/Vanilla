import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

/** Calm empty state that always offers the next useful step. */
export function EmptyState({ icon, title, body, actionLabel, onAction, compact }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingVertical: compact ? theme.spacing.lg : theme.spacing.xxl, paddingHorizontal: theme.spacing.md }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <Icon name={icon} size={26} color={theme.colors.primary} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="body" color="secondary" align="center" style={{ maxWidth: 320 }}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} icon="plus" style={{ marginTop: theme.spacing.xs }} /> : null}
    </View>
  );
}
