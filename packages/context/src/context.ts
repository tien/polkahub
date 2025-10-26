import { Account, Plugin } from "@polkahub/plugin";
import type { SS58String } from "polkadot-api";
import { createContext, ReactElement, useContext } from "react";

export const ModalContext = createContext<{
  setContent: (element: ReactElement | null) => void;
} | null>(null);

export interface Identity {
  value: string;
  verified: boolean;
  subId?: string;
}

export interface PolkaHubContext {
  id: string;
  plugins: Plugin[];
  getIdentity: (address: SS58String) => Promise<Identity | null>;
  availableAccounts: Record<string, Account[]>;
}
export const PolkaHubContext = createContext<PolkaHubContext | null>(null);

export const usePolkaHubContext = () => {
  const ctx = useContext(PolkaHubContext);
  if (!ctx) {
    throw new Error("Missing PolkaHubContext");
  }
  return ctx;
};
