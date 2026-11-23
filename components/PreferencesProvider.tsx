'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  DEFAULT_PREFERENCES,
  getCountry,
  parsePreferences,
  PREFERENCES_COOKIE,
  type Preferences,
} from '@/lib/locale';
import { formatMoney, type RateTable } from '@/lib/utils/money';

type Value = {
  preferences: Preferences;
  rates: RateTable;
  setPreferences: (next: Preferences) => void;
};

const PreferencesContext = createContext<Value>({
  preferences: DEFAULT_PREFERENCES,
  rates: {},
  setPreferences: () => {},
});

function readSavedPreferences() {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${PREFERENCES_COOKIE}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

// The cookie only changes through setPreferences in this tab, which is
// tracked in state, so there is nothing to subscribe to.
const subscribeToCookie = () => () => {};

/**
 * Preferences are read from the cookie in the browser rather than on the
 * server, so pages stay identical for every visitor and can be served
 * statically. Visitors with saved preferences switch over right after load.
 */
export function PreferencesProvider({
  children,
  rates,
}: {
  children: ReactNode;
  rates: RateTable;
}) {
  const saved = useSyncExternalStore(subscribeToCookie, readSavedPreferences, () => null);
  const [chosen, setPreferences] = useState<Preferences | null>(null);
  const preferences = useMemo(
    () => chosen ?? (saved ? parsePreferences(saved) : DEFAULT_PREFERENCES),
    [chosen, saved],
  );

  const value = useMemo(
    () => ({ preferences, rates, setPreferences }),
    [preferences, rates],
  );
  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}

/** Formatter bound to the viewer's currency preference. */
export function useMoney() {
  const { preferences, rates } = usePreferences();
  const locale = getCountry(preferences.country).locale;
  return useCallback(
    (amount: number | undefined, storeCurrency: string) =>
      formatMoney(amount, storeCurrency, preferences, rates, locale),
    [preferences, rates, locale],
  );
}
