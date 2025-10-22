/* eslint-disable react-refresh/only-export-components */
import { RemoveSubscribe, Subscribe } from "@react-rxjs/core";
import type { SS58String } from "polkadot-api";
import {
  createContext,
  FC,
  PropsWithChildren,
  ReactElement,
  useContext,
  useEffect,
  useId,
} from "react";
import { Plugin } from "./plugins";
import { Account, setPlugins, subscription$ } from "./state";
import { EMPTY, merge } from "rxjs";

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
> = ({ id, children, plugins, getIdentity = async () => null }) => {
  useEffect(() => {
    const sub = subscription$(id).subscribe();
    return () => sub.unsubscribe();
  }, [id]);

  useEffect(() => {
    const sub = merge(plugins.map((p) => p.subscription$ ?? EMPTY)).subscribe();
    setPlugins(id, plugins);

    return () => sub.unsubscribe();
  }, [id, plugins]);

  return (
    <AccountSelectorContext
      value={{
        id,
        plugins,
        getIdentity,
        availableAccounts: {},
      }}
    >
      {children}
    </AccountSelectorContext>
  );
};
