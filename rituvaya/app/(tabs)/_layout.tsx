import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useSnapshot } from '@/state/context';
import { TabBar } from '@/ui/components/TabBar';

export default function TabsLayout() {
  const snapshot = useSnapshot();
  if (!snapshot.settings.onboarding.completed) return <Redirect href="/onboarding" />;
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="routine" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
