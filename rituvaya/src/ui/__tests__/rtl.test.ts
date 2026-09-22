const mockReloadAsync = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-updates', () => ({ reloadAsync: mockReloadAsync }), { virtual: true });

import { DevSettings, I18nManager } from 'react-native';
import { applyLayoutDirection } from '../rtl';

function setIsRTL(value: boolean): void {
  Object.defineProperty(I18nManager, 'isRTL', { value, configurable: true, writable: true });
}

describe('applyLayoutDirection', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockReloadAsync.mockClear();
    setIsRTL(false);
    jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => undefined);
    jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => undefined);
    jest.spyOn(DevSettings, 'reload').mockImplementation(() => undefined);
  });

  it('does nothing when the direction already matches', async () => {
    expect(await applyLayoutDirection(false)).toBe('unchanged');
    expect(I18nManager.forceRTL).not.toHaveBeenCalled();
    expect(mockReloadAsync).not.toHaveBeenCalled();
  });

  it('forces the new direction and reloads by default', async () => {
    expect(await applyLayoutDirection(true)).toBe('reloading');
    expect(I18nManager.allowRTL).toHaveBeenCalledWith(true);
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
    expect(mockReloadAsync).toHaveBeenCalled();
  });

  // Regression: the reload restarted the bundle mid-onboarding, so choosing a
  // language dropped the user back on the language step every time.
  it('never reloads when the caller opts out', async () => {
    expect(await applyLayoutDirection(true, { reload: false })).toBe('restartNeeded');
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
    expect(mockReloadAsync).not.toHaveBeenCalled();
    expect(DevSettings.reload).not.toHaveBeenCalled();
  });

  it('opting out still applies when switching away from RTL', async () => {
    setIsRTL(true);
    expect(await applyLayoutDirection(false, { reload: false })).toBe('restartNeeded');
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(false);
    expect(mockReloadAsync).not.toHaveBeenCalled();
  });
});
