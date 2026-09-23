import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { searchCatalog } from '@/domain/catalog/seed';
import type { CatalogEntry } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useTheme } from '@/ui/ThemeProvider';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Badge } from '@/ui/components/Controls';
import { Field } from '@/ui/components/Field';
import { Divider, ListRow } from '@/ui/components/ListRow';
import { Text } from '@/ui/components/Text';

export interface CatalogSearchProps {
  onPick: (entry: CatalogEntry) => void;
  onManual: (query: string) => void;
}

/** Search the small generic catalog, or continue with a manual entry using the typed name. */
export function CatalogSearch({ onPick, onManual }: CatalogSearchProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCatalog(query, 8), [query]);
  return (
    <View style={{ gap: theme.spacing.md }}>
      <Field placeholder={t('item.catalogPlaceholder')} value={query} onChangeText={setQuery} autoFocus autoCorrect={false} accessibilityLabel={t('item.catalogSearch')} ltr returnKeyType="search" onSubmitEditing={() => (results[0] ? onPick(results[0]) : onManual(query))} />
      <Text variant="small" color="muted">
        {t('item.catalogHint')}
      </Text>
      {results.length > 0 ? (
        <Card padding={theme.spacing.sm} style={{ gap: 0 }}>
          {results.map((entry, index) => (
            <View key={entry.id}>
              {index > 0 ? <Divider /> : null}
              <ListRow
                title={entry.name}
                titleLtr
                subtitle={entry.forms.map((f) => t(`item.forms.${f}` as const)).join(' · ')}
                trailing={<Badge label={t(entry.kind === 'medication' ? 'common.medication' : 'common.supplement')} tone={entry.kind === 'medication' ? 'medication' : 'primary'} />}
                chevron
                onPress={() => onPick(entry)}
                accessibilityLabel={t('item.useEntry', { name: entry.name })}
                style={{ paddingHorizontal: theme.spacing.xs }}
              />
            </View>
          ))}
        </Card>
      ) : null}
      <Button label={query.trim() ? `${t('item.manualEntry')}: “${query.trim()}”` : t('item.manualEntry')} variant="secondary" icon="edit-3" onPress={() => onManual(query)} full />
    </View>
  );
}
