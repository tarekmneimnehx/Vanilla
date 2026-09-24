import { onWatchMessages, sendToWatch, watchSupported } from '../bridge';
import type { WatchPayload } from '../payload';

const payload: WatchPayload = {
  v: 1,
  generatedAt: 0,
  rtl: false,
  labels: { title: 'Today', openPhone: '', empty: '', allDone: '', progress: '{done} of {total}', taken: 'Taken', takenAll: '', skip: '', snooze: '', tonight: '' },
  days: [],
};

// Jest has no native watch module, which is exactly the situation on the web
// preview, Android and Expo Go: the bridge must stand down rather than throw.
describe('watch bridge without a native watch module', () => {
  it('reports no watch support instead of throwing on import', () => {
    expect(watchSupported()).toBe(false);
  });

  it('does not send, and says so', () => {
    expect(sendToWatch(payload)).toBe(false);
  });

  it('subscribes to nothing and returns a harmless unsubscribe', () => {
    const handler = jest.fn();
    const off = onWatchMessages(handler);
    expect(() => off()).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});
