import {
  getMultisigSigner,
  MultisigSignerOptions,
} from "@polkadot-api/meta-signers";
import {
  AccountId,
  FixedSizeBinary,
  getMultisigAccountId,
  getSs58AddressInfo,
} from "@polkadot-api/substrate-bindings";
import { Binary, PolkadotSigner, SS58String } from "polkadot-api";
import { BehaviorSubject, combineLatest, switchMap } from "rxjs";
import { Account } from "../state";
import { getPublicKey } from "../util";
import {
  localStorageProvider,
  persistedState,
  PersistenceProvider,
} from "./persist";
import { Plugin, SerializableAccount } from "./plugin";

export interface MultisigInfo {
  threshold: number;
  signatories: SS58String[];
  // If not set, it will be a read-only account.
  // But with the advantage that it will still figure out the resulting address
  parentSigner?: SerializableAccount;
}

export interface MultisigAccount extends Account {
  provider: "multisig";
  info: MultisigInfo;
}

export interface MultisigPlugin extends Plugin<MultisigAccount> {
  id: "multisig";
  setMultisigs: (multisigs: MultisigInfo[]) => void;
}

export const multisigPlugin = (
  getMultisigInfo: (
    multisig: SS58String,
    callHash: FixedSizeBinary<32>
  ) => Promise<
    | {
        when: {
          height: number;
          index: number;
        };
        approvals: Array<SS58String>;
      }
    | undefined
  >,
  txPaymentInfo: (
    uxt: Binary,
    len: number
  ) => Promise<{
    weight: {
      ref_time: bigint;
      proof_size: bigint;
    };
  }>,
  opts?: Partial<
    {
      persist: PersistenceProvider;
    } & MultisigSignerOptions<SS58String>
  >
): MultisigPlugin => {
  const { persist } = {
    persist: localStorageProvider("multisigs"),
    ...opts,
  };

  const [persistedAccounts$, setPersistedAccounts] = persistedState(
    persist,
    [] as MultisigInfo[]
  );
  const plugins$ = new BehaviorSubject<Plugin[]>([]);

  const getAccount = (
    info: MultisigInfo,
    parentSigner: PolkadotSigner | undefined
  ): MultisigAccount => ({
    provider: "multisig",
    address: getMultisigAddress(info),
    signer: parentSigner
      ? getMultisigSigner(
          info,
          getMultisigInfo,
          txPaymentInfo,
          parentSigner,
          opts?.method
            ? {
                method: opts.method,
              }
            : undefined
        )
      : undefined,
    info,
  });

  const multisigInfoToAccount = async (info: MultisigInfo) => {
    if (!info.parentSigner) return getAccount(info, undefined);

    const plugins = plugins$.getValue();
    const plugin = plugins.find((p) => info.parentSigner?.provider === p.id);
    if (!plugin) return getAccount(info, undefined);
    const parentSigner = await plugin.deserialize(info.parentSigner);
    return getAccount(info, parentSigner?.signer);
  };

  const accounts$ = combineLatest([persistedAccounts$, plugins$]).pipe(
    switchMap(async ([accounts]) => ({
      multisig: await Promise.all(accounts.map(multisigInfoToAccount)),
    }))
  );

  return {
    id: "multisig",
    deserialize: (account) => {
      const extra = account.extra as MultisigInfo;
      return multisigInfoToAccount(extra);
    },
    serialize: ({ address, info, provider }) => ({
      address,
      provider,
      extra: info,
    }),
    eq: (a, b) =>
      a.address === b.address &&
      a.info.parentSigner?.address === b.info.parentSigner?.address,
    accounts$,
    receivePlugins: (plugins) => plugins$.next(plugins),
    subscription$: accounts$,
    setMultisigs: setPersistedAccounts,
  };
};

const getMultisigAddress = (info: MultisigInfo) => {
  const accountId = getMultisigAccountId({
    threshold: info.threshold,
    signatories: info.signatories.map(getPublicKey),
  });
  const addrInfo = getSs58AddressInfo(info.signatories[0]);
  if (!addrInfo.isValid) {
    throw new Error("Unreachable");
  }
  return AccountId(addrInfo.ss58Format).dec(accountId);
};
