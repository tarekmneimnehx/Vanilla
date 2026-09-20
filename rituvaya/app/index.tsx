import { Redirect } from 'expo-router';
import { useSnapshot } from '@/state/context';

export default function Index() {
  const snapshot = useSnapshot();
  return <Redirect href={snapshot.settings.onboarding.completed ? '/(tabs)' : '/onboarding'} />;
}
