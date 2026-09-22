import { useCallback } from 'react';
import { useRouter } from 'expo-router';

/**
 * A back action that always leads somewhere.
 *
 * `router.back()` is silently a no-op when the screen is the first in the stack,
 * which is exactly what a notification action or a deep link produces — the header
 * arrow then does nothing and the user is stranded on the screen. Falling back to
 * the index route lands them wherever the app belongs, since `/` redirects to the
 * tabs or to onboarding depending on how far they have got.
 */
export function useGoBack(): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);
}
