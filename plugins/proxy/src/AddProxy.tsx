import {
  AddressIdentity,
  useAvailableAccounts,
  useModalContext,
  usePlugin,
  usePolkaHubContext,
} from "@polkahub/context";
import { Account, AccountAddress, defaultSerialize } from "@polkahub/plugin";
import { AccountPicker, AddressInput, Button } from "@polkahub/ui-components";
import { AccountId } from "polkadot-api";
import { toHex } from "polkadot-api/utils";
import { useEffect, useMemo, useState, type FC } from "react";
import { ProxyProvider, proxyProviderId } from "./provider";

const proxyTypeText = {
  Any: "Any",
  AssetManager: "Asset Manager",
  AssetOwner: "Asset Owner",
  Assets: "Assets",
  Auction: "Auction",
  CancelProxy: "Cancel Proxy",
  Collator: "Collator",
  Governance: "Governance",
  NominationPools: "Nomination Pools",
  NonTransfer: "Non-Transfer",
  ParaRegistration: "Para Registration",
  Staking: "Staking",
};
type ProxyType = keyof typeof proxyTypeText;

export type ProxyEntry = {
  delegate: AccountAddress;
  proxy_type: {
    type: ProxyType;
  };
  delay: number;
};

export type GetDelegates = (
  address: AccountAddress
) => Promise<Array<ProxyEntry> | null>;

export type AddProxyProps = {
  maxAddrLength?: number;
  getDelegates?: GetDelegates;
  blockLength?: number;
};

export const AddProxy: FC<AddProxyProps> = ({
  maxAddrLength = 12,
  getDelegates,
  blockLength,
}) => {
  const { popContent } = useModalContext();
  const proxyProvider = usePlugin<ProxyProvider>(proxyProviderId);
  const { polkaHub } = usePolkaHubContext();

  const [proxyAddress, setProxyAddress] = useState<AccountAddress | null>(null);
  const [selectedAccount, setSelectedAccount] =
    useState<AccountWithProxy | null>(null);

  return (
    <form
      className="space-y-2"
      onSubmit={(evt) => {
        evt.preventDefault();
        if (!proxyAddress || !selectedAccount) return null;

        const plugins = polkaHub.plugins$.getValue();
        const parentProvider = plugins.find(
          (p) => p.id === selectedAccount.provider
        );
        if (!parentProvider)
          throw new Error(
            `Parent provider ${selectedAccount.provider} not found`
          );

        const serializeFn = parentProvider.serialize ?? defaultSerialize;
        proxyProvider?.addProxy({
          real: proxyAddress,
          parentSigner: serializeFn(selectedAccount),
        });

        popContent();
      }}
    >
      <label className="block">
        <div>Insert Proxy Address</div>
        <AddressInput
          renderAddress={(account: Account | string) => (
            <AddressIdentity
              addr={typeof account === "string" ? account : account.address}
              maxAddrLength={maxAddrLength}
              copyable={false}
            />
          )}
          value={proxyAddress}
          onChange={setProxyAddress}
          className="max-w-auto"
          disableClear
        />
      </label>
      {proxyAddress ? (
        <label className="block">
          <div>Select your signer</div>
          <ProxySignerPicker
            maxAddrLength={maxAddrLength}
            value={selectedAccount}
            onChange={setSelectedAccount}
            proxy={proxyAddress}
            getDelegates={getDelegates}
          />
        </label>
      ) : null}
      {selectedAccount?.delegate ? (
        <div>
          <h3>Permissions</h3>
          <ul className="flex flex-wrap gap-2">
            {selectedAccount.delegate.map((entry, i) => (
              <li key={i} className="border rounded px-2 py-1">
                {proxyTypeText[entry.proxy_type.type]}
                {entry.delay
                  ? ` (${getDelayLength(entry.delay, blockLength)})`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={!proxyAddress || !selectedAccount}>Add Proxy</Button>
      </div>
    </form>
  );
};

const getDelayLength = (blocks: number, blockLength?: number) => {
  if (!blockLength) return `delay ${blocks}`;

  const seconds = (blocks * blockLength) / 1000;
  if (seconds < 120) {
    return `${Math.round(seconds)}s delay`;
  }
  const minutes = Math.round(seconds / 60);
  const min = minutes % 60;
  const hours = Math.floor(minutes / 60);
  const hr = hours % 24;
  const days = Math.floor(hours / 24);

  const time = `${hr}:${min.toString().padStart(2, "0")} delay`;
  if (!days) {
    return time;
  }
  return `${days}d ${time}`;
};

const useAsync = <T,>(fn: () => Promise<T>, deps: unknown[]) => {
  const [value, setValue] = useState<
    | {
        type: "loading" | "error";
        value?: never;
      }
    | {
        type: "result";
        value: T;
      }
  >({
    type: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    setValue({ type: "loading" });
    fn().then(
      (value) => {
        if (cancelled) return;
        setValue({ type: "result", value });
      },
      (ex) => {
        if (cancelled) return;
        console.error(ex);
        setValue({ type: "error" });
      }
    );

    return () => {
      cancelled = true;
    };
  }, deps);

  return value;
};

type AccountWithProxy = Account & {
  delegate?: ProxyEntry[];
};

const ProxySignerPicker: FC<{
  value: AccountWithProxy | null;
  onChange: (value: AccountWithProxy | null) => void;
  proxy: AccountAddress;
  maxAddrLength: number;
  getDelegates?: GetDelegates;
}> = ({
  value,
  onChange,
  maxAddrLength,
  proxy,
  getDelegates = async () => null,
}) => {
  const availableAccounts = useAvailableAccounts();
  const delegatesResult = useAsync(() => getDelegates(proxy), [proxy]);
  const availableSigners = useMemo(
    () =>
      Object.entries(availableAccounts)
        .map(([name, accounts]) => ({
          name,
          accounts: accounts.filter((acc) => !!acc.signer),
        }))
        .filter(({ accounts }) => accounts.length > 0),
    [availableAccounts]
  );

  const selectableSigners = useMemo(() => {
    if (delegatesResult.type === "loading") return null;
    if (delegatesResult.value == null) return availableSigners;

    const delegates = delegatesResult.value.reduce(
      (acc: Record<string, ProxyEntry[]>, delegate) => {
        const commonAddr = addrToCommon(delegate.delegate);
        acc[commonAddr] ??= [];
        acc[commonAddr].push(delegate);
        return acc;
      },
      {}
    );

    return availableSigners
      .map(({ name, accounts }) => ({
        name,
        accounts: accounts
          .map((account): AccountWithProxy | null => {
            const delegate = delegates[addrToCommon(account.address)];
            if (!delegate) return null;
            return {
              ...account,
              delegate,
            };
          })
          .filter((v) => v != null),
      }))
      .filter(({ accounts }) => accounts.length > 0);
  }, [delegatesResult, availableSigners]);

  if (selectableSigners == null) return <div>Loading…</div>;

  return (
    <AccountPicker
      value={value}
      onChange={onChange}
      groups={selectableSigners}
      className="max-w-auto"
      disableClear
      renderAddress={(account) => (
        <AddressIdentity
          addr={account.address}
          name={account?.name}
          maxAddrLength={maxAddrLength}
          copyable={false}
        />
      )}
    />
  );
};

const [ss58ToBin] = AccountId();
const addrToCommon = (addr: AccountAddress) =>
  addr.startsWith("0x") ? "0x" : toHex(ss58ToBin(addr));
