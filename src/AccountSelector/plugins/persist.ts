import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { map } from "rxjs";

export interface PersistenceProvider {
  save: (value: string | null) => void;
  load: () => string | null;
}

export const localStorageProvider = (key: string): PersistenceProvider => ({
  save: (value: string | null) => {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  },
  load: () => localStorage.getItem(key),
});

export interface Serializer<T = unknown> {
  stringify: (value: T) => string;
  parse: (value: string) => T;
}
export const persistedState = <T>(
  provider: PersistenceProvider,
  defaultValue: T,
  serializer: Serializer<T> = JSON
) => {
  const [valueChange$, setValue] = createSignal<T>();
  valueChange$.subscribe((v) => provider.save(serializer.stringify(v)));

  const state$ = state(
    () => valueChange$.pipe(map((v) => (v === null ? defaultValue : v))),
    () => {
      const initialValueStr = provider.load();
      try {
        return initialValueStr != null
          ? (JSON.parse(initialValueStr) as T) ?? defaultValue
          : defaultValue;
      } catch (ex) {
        console.error(ex);
        return defaultValue;
      }
    }
  )();

  return [state$, setValue] as const;
};
