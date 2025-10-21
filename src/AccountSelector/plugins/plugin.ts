import type { Observable } from "rxjs";
import type { Account, SerializableAccount } from "../state";

export interface Plugin<A extends Account = Account> {
  id: string;
  serialize: (account: A) => SerializableAccount;
  deserialize: (value: SerializableAccount) => Promise<A | null> | A | null;
  eq: (a: A, b: A) => boolean;
  // group => Account
  accounts$: Observable<Record<string, A[]>>;
}
