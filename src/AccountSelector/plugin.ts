import { Observable } from "rxjs";
import { Account, SerializableAccount } from "./state";

export interface Plugin<A extends Account = Account> {
  id: string;
  serialize: (account: A) => SerializableAccount;
  deserialize: (value: SerializableAccount) => Promise<A | null> | A | null;
  eq: (a: A, b: A) => boolean;
  accounts$: Observable<A[]>;
}
