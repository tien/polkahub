/* eslint-disable react-refresh/only-export-components */
import {
  RemoveSubscribe,
  Subscribe,
  useStateObservable,
} from "@react-rxjs/core";
import { SS58String } from "polkadot-api";
import {
  createContext,
  FC,
  PropsWithChildren,
  ReactElement,
  useContext,
  useEffect,
  useId,
} from "react";
import { firstValueFrom, withLatestFrom } from "rxjs";
import { Plugin } from "./plugin";
import {
  Account,
  plugins$,
  selectedAccount$,
  SerializableAccount,
  setAccount,
  setPlugins,
  subscription$,
} from "./state";

export const ModalContext = createContext<{
  setContent: (element: ReactElement | null) => void;
} | null>(null);

export interface Identity {
  value: string;
  verified: boolean;
  subId?: string;
}

export interface AccountSelectorContext {
  id: string;
  plugins: Plugin[];
  getIdentity: (address: SS58String) => Promise<Identity | null>;
  selectedAccount: Account | null;
  availableAccounts: Record<string, Account[]>;
}
export const AccountSelectorContext =
  createContext<AccountSelectorContext | null>(null);

export const useAccountSelectorContext = () => {
  const ctx = useContext(AccountSelectorContext);
  if (!ctx) {
    throw new Error("Missing AccountSelectorContext");
  }
  return ctx;
};

type ProviderProps = PropsWithChildren<{
  plugins: Plugin[];
  getIdentity?: (address: SS58String) => Promise<Identity | null>;
  persist?: {
    save: (value: string | null) => void;
    load: () => Promise<string> | string | null;
  };
}>;
export const AccountSelectorProvider: FC<ProviderProps> = ({
  children,
  plugins,
  getIdentity = async () => null,
  ...rest
}) => {
  const id = useId();

  // TODO look performance implications
  return (
    <Subscribe
      source$={subscription$(id)}
      fallback={
        <AccountSelectorContext
          value={{
            getIdentity,
            id,
            plugins,
            availableAccounts: {},
            selectedAccount: null,
          }}
        >
          <RemoveSubscribe>{children}</RemoveSubscribe>
        </AccountSelectorContext>
      }
    >
      <InnerAccountSelectorProvider
        id={id}
        plugins={plugins}
        getIdentity={getIdentity}
        {...rest}
      >
        <RemoveSubscribe>{children}</RemoveSubscribe>
      </InnerAccountSelectorProvider>
    </Subscribe>
  );
};

const InnerAccountSelectorProvider: FC<
  ProviderProps & {
    id: string;
  }
> = ({ id, children, plugins, persist, getIdentity = async () => null }) => {
  const selectedAccount = useStateObservable(selectedAccount$(id));

  useEffect(() => {
    const sub = subscription$(id).subscribe();
    return () => sub.unsubscribe();
  }, [id]);

  useEffect(() => {
    setPlugins(id, plugins);
  }, [id, plugins]);

  useEffect(() => {
    if (!persist) {
      setAccount(id, null);
      return;
    }

    let stopped = false;
    const sa = (account: Account | null) => {
      if (stopped) return;
      setAccount(id, account);
    };
    async function run() {
      try {
        const persisted: SerializableAccount | null = JSON.parse(
          (await persist!.load()) ?? "null"
        );
        if (!persisted) {
          return sa(null);
        }

        const plugins = await firstValueFrom(plugins$(id));
        const plugin = plugins.find((p) => p.id === persisted.provider);
        if (!plugin) {
          return sa(null);
        }

        sa(await plugin.deserialize(persisted));
      } catch (ex) {
        console.error(ex);
        sa(null);
      }
    }
    run();

    const sub = selectedAccount$(id)
      .pipe(withLatestFrom(plugins$(id)))
      .subscribe(([account, plugins]) => {
        if (!persist) return;

        if (!account) {
          persist.save(null);
          return;
        }

        const plugin = plugins.find((p) => p.id === account.provider);
        if (!plugin) return;

        persist.save(JSON.stringify(plugin.serialize(account)));
      });

    return () => {
      stopped = true;
      sub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <AccountSelectorContext
      value={{
        id,
        plugins,
        getIdentity,
        selectedAccount,
        availableAccounts: {},
      }}
    >
      {children}
    </AccountSelectorContext>
  );
};
