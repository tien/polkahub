import { state } from "@react-rxjs/core";
import { combineKeys, createKeyedSignal } from "@react-rxjs/utils";
import type { PolkadotSigner, SS58String } from "polkadot-api";
import {
  concat,
  endWith,
  filter,
  map,
  merge,
  NEVER,
  switchMap,
  takeUntil,
} from "rxjs";
import type { Plugin } from "./plugins";

export interface Account {
  provider: string;
  address: SS58String;
  signer?: PolkadotSigner;
  name?: string;
}
export interface SerializableAccount<T = unknown> {
  provider: string;
  address: SS58String;
  name?: string;
  extra?: T;
}

export const [accountChange$, setAccount] = createKeyedSignal<
  string,
  Account | null
>();
export const selectedAccount$ = state((id: string) =>
  accountChange$(id).pipe(
    switchMap((account) => {
      if (!account) return [null];

      return plugins$(id).pipe(
        map((plugins) => plugins.find((p) => p.id === account.provider)),
        switchMap((plugin) => {
          if (!plugin) return [null];

          return deselectWhenRemoved$(account, plugin);
        })
      );
    })
  )
);

export const [pluginsChange$, setPlugins] = createKeyedSignal<
  string,
  Plugin[]
>();
export const plugins$ = state((id: string) => pluginsChange$(id));

export const availableAccounts$ = state((id: string) =>
  combineKeys(plugins$(id), (plugin) => plugin.accounts$).pipe(
    map((pluginMap) =>
      Object.fromEntries(
        Array.from(pluginMap.entries()).map(([plugin, accounts]) => [
          plugin.id,
          accounts,
        ])
      )
    )
  )
);

export const subscription$ = state((id: string) =>
  merge(selectedAccount$(id), availableAccounts$(id))
);

const deselectWhenRemoved$ = (value: Account, plugin: Plugin) =>
  concat([value], NEVER).pipe(
    takeUntil(
      plugin.accounts$.pipe(
        filter((accounts) => accounts.every((acc) => !plugin.eq(acc, value)))
      )
    ),
    endWith(null)
  );
