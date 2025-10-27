import {
  AddressBalance,
  AddressIdentity,
  ModalContext,
  usePlugin,
} from "@polkahub/context";
import { useSetSelectedAccount } from "@polkahub/select-account";
import { Button, SourceButton } from "@polkahub/ui-components";
import { useStateObservable } from "@react-rxjs/core";
import { Camera, ChevronLeft, Trash2 } from "lucide-react";
import { getSs58AddressInfo } from "polkadot-api";
import { ReactNode, useCallback, useContext, useEffect, type FC } from "react";
import vaultImg from "./assets/vault.webp";
import { PolkadotVaultProvider, polkadotVaultProviderId } from "./provider";
import { QrCamera } from "./QrCamera";

export const ManageVault: FC = () => {
  const { setContent } = useContext(ModalContext)!;

  return (
    <SourceButton
      label="Vault"
      onClick={() => setContent(<VaultAccounts setContent={setContent} />)}
    >
      <img src={vaultImg} alt="Vault" className="h-10 rounded" />
    </SourceButton>
  );
};

const VaultAccounts: FC<{
  setContent: (element: ReactNode) => void;
}> = ({ setContent }) => {
  const polkadotVaultProvider = usePlugin<PolkadotVaultProvider>(
    polkadotVaultProviderId
  )!;
  const vaultAccounts = useStateObservable(polkadotVaultProvider.accounts$);
  const selectAccount = useSetSelectedAccount();

  useEffect(() => {
    if (vaultAccounts.length === 0) {
      setContent(
        <ScanAccount
          onScanned={() =>
            setContent(<VaultAccounts setContent={setContent} />)
          }
          onClose={() => setContent(null)}
        />
      );
    }
  }, [vaultAccounts, setContent]);

  return (
    <div className="space-y-4">
      {vaultAccounts.length ? (
        <div>
          <h3 className="font-medium text-muted-foreground">Added addresses</h3>
          <ul className="space-y-2">
            {vaultAccounts.map((acc) => (
              <li
                key={`${acc.address}-${acc.genesis}`}
                className="flex gap-2 items-center"
              >
                <Button
                  variant="outline"
                  className="text-destructive"
                  type="button"
                  onClick={() => polkadotVaultProvider.removeAccount(acc)}
                >
                  <Trash2 />
                </Button>
                <AddressIdentity addr={acc.address} />
                <div className="grow" />
                <AddressBalance addr={acc.address} />
                {selectAccount && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      selectAccount(acc);
                    }}
                  >
                    Select
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => setContent(null)}
          variant="secondary"
          type="button"
        >
          <ChevronLeft />
          Back
        </Button>
        <Button
          type="button"
          onClick={() =>
            setContent(
              <ScanAccount
                onScanned={() =>
                  setContent(<VaultAccounts setContent={setContent} />)
                }
                onClose={() =>
                  setContent(<VaultAccounts setContent={setContent} />)
                }
              />
            )
          }
        >
          <Camera />
          Scan new account
        </Button>
      </div>
    </div>
  );
};

const ScanAccount: FC<{ onScanned: () => void; onClose: () => void }> = ({
  onScanned,
  onClose,
}) => {
  const polkadotVaultProvider = usePlugin<PolkadotVaultProvider>(
    polkadotVaultProviderId
  )!;

  return (
    <div className="space-y-2">
      <p>Scan your account QR from the vault app</p>
      <QrCamera
        onRead={useCallback(
          (res) => {
            // Expected format: `substrate:${Addr}:${genesis}`
            const split = res.split(":");
            if (
              split[0] !== "substrate" ||
              split.length != 3 ||
              !split[2].startsWith("0x")
            ) {
              throw new Error("Invalid QR");
            }
            const [, address, genesis] = split;
            const account = getSs58AddressInfo(address);
            if (!account.isValid) {
              throw new Error("Invalid QR");
            }

            polkadotVaultProvider.addAccount({
              address,
              genesis,
            });
            onScanned();
          },
          [onScanned, polkadotVaultProvider]
        )}
      />
      <Button onClick={onClose} variant="secondary" type="button">
        <ChevronLeft />
        Back
      </Button>
    </div>
  );
};
