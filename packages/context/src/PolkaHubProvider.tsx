import { Plugin } from "@polkahub/plugin";
import { RemoveSubscribe, Subscribe } from "@react-rxjs/core";
import type { SS58String } from "polkadot-api";
import { FC, PropsWithChildren, useEffect, useId } from "react";
import { EMPTY, merge } from "rxjs";
import { Identity, PolkaHubContext } from "./context";
import {
  addInstance,
  removeInstance,
  setPlugins,
  subscription$,
} from "./state";

type ProviderProps = PropsWithChildren<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: Plugin<any>[];
  getIdentity?: (address: SS58String) => Promise<Identity | null>;
}>;
export const PolkaHubProvider: FC<ProviderProps> = ({
  children,
  plugins,
  getIdentity = async () => null,
  ...rest
}) => {
  const id = useId();

  // TODO look performance implications of this double-render, if stuff unmounts and remounts or if it's properly reused
  return (
    <Subscribe
      source$={subscription$(id)}
      fallback={
        <PolkaHubContext
          value={{
            getIdentity,
            id,
            plugins,
            availableAccounts: {},
          }}
        >
          <RemoveSubscribe>{children}</RemoveSubscribe>
        </PolkaHubContext>
      }
    >
      <InternalPolkaHubProvider
        id={id}
        plugins={plugins}
        getIdentity={getIdentity}
        {...rest}
      >
        <RemoveSubscribe>{children}</RemoveSubscribe>
      </InternalPolkaHubProvider>
    </Subscribe>
  );
};

const InternalPolkaHubProvider: FC<
  ProviderProps & {
    id: string;
  }
> = ({ id, children, plugins, getIdentity = async () => null }) => {
  useEffect(() => {
    addInstance(id);
    const sub = subscription$(id).subscribe();
    return () => {
      removeInstance(id);
      sub.unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    const sub = merge(plugins.map((p) => p.subscription$ ?? EMPTY)).subscribe();
    setPlugins(id, plugins);

    return () => sub.unsubscribe();
  }, [id, plugins]);

  return (
    <PolkaHubContext
      value={{
        id,
        plugins,
        getIdentity,
        availableAccounts: {},
      }}
    >
      {children}
    </PolkaHubContext>
  );
};
