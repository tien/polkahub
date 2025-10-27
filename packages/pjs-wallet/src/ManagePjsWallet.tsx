import { usePolkaHubContext } from "@polkahub/context";
import { SourceButton } from "@polkahub/ui-components";
import { state, useStateObservable } from "@react-rxjs/core";
import { CircleQuestionMark } from "lucide-react";
import { type FC } from "react";
import { filter, switchMap } from "rxjs";
import { pjsWalletPlugin$, PjsWalletProvider } from "./provider";
import nova from "./assets/nova.webp";
import pjs from "./assets/pjs.webp";
import subwallet from "./assets/subwallet.webp";
import talisman from "./assets/talisman.webp";

const knownExtensions: Record<string, { name: string; logo: string }> = {
  "polkadot-js": {
    name: "Polkadot JS",
    logo: pjs,
  },
  "nova-wallet": {
    name: "Nova Wallet",
    logo: nova,
  },
  talisman: {
    name: "Talisman",
    logo: talisman,
  },
  "subwallet-js": {
    name: "Subwallet",
    logo: subwallet,
  },
};

const availableExtensions$ = state(
  (id: string) =>
    pjsWalletPlugin$(id).pipe(
      filter((plugin) => plugin != null),
      switchMap((plugin) => plugin.availableExtensions$)
    ),
  []
);

export const ManagePjsWallets: FC = () => {
  const { id } = usePolkaHubContext();
  const availableExtensions = useStateObservable(availableExtensions$(id)).sort(
    (a, b) => (b in knownExtensions ? 1 : 0) - (a in knownExtensions ? 1 : 0)
  );

  if (!availableExtensions) return null;

  return (
    <div>
      <h3>Manage Extensions</h3>
      <ul className="flex gap-2 flex-wrap items-center justify-center">
        {availableExtensions.map((id) => (
          <li key={id}>
            <ExtensionButton id={id} />
          </li>
        ))}
      </ul>
    </div>
  );
};

const connectedExtensions$ = state(
  (id: string) =>
    pjsWalletPlugin$(id).pipe(
      filter((plugin) => plugin != null),
      switchMap((plugin) => plugin.connectedExtensions$)
    ),
  []
);

const ExtensionButton: FC<{
  id: string;
}> = ({ id }) => {
  const ctx = usePolkaHubContext();
  const knownExtension = knownExtensions[id];
  const connectedExtensions = useStateObservable(connectedExtensions$(ctx.id));
  const isSelected = connectedExtensions.includes(id);

  const setConnectedExtensions = (extensions: string[]) => {
    const plugin = ctx.plugins.find((p) => p.id === "pjs-wallet") as
      | PjsWalletProvider
      | undefined;
    if (!plugin) {
      throw new Error("PjsWallet provider not found");
    }
    plugin.setConnectedExtensions(extensions);
  };

  return (
    <SourceButton
      isSelected={isSelected}
      label={knownExtension?.name ?? id}
      onClick={() =>
        setConnectedExtensions(
          isSelected
            ? connectedExtensions.filter((v) => v !== id)
            : [...connectedExtensions, id]
        )
      }
    >
      {knownExtension ? (
        <img
          src={knownExtension.logo}
          alt={knownExtension.name}
          className="h-10 rounded"
        />
      ) : (
        <div>
          <CircleQuestionMark
            className="size-10 text-muted-foreground"
            strokeWidth={1}
          />
        </div>
      )}
    </SourceButton>
  );
};
