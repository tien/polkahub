import { ComponentProps, ComponentType, forwardRef } from "react";
import { PolkadotIdenticon } from "../PolkadotIdenticon";
import { useSelectedAccount } from "./plugins";
import { getPublicKey, sliceMiddleAddr } from "./util";

export const Trigger = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> & {
    components?: Partial<{
      Button: ComponentType<
        ComponentProps<"button"> & {
          state: "disconnected" | "loading" | "connected";
        }
      >;
    }>;
  }
>(({ components, ...props }, ref) => {
  const [selectedAccount] = useSelectedAccount();
  const { Button } = {
    Button: DefaultButton,
    ...components,
  };

  if (!selectedAccount)
    return (
      <Button ref={ref} state="disconnected" {...props}>
        Connect
      </Button>
    );

  return (
    <Button ref={ref} state="connected" {...props}>
      <PolkadotIdenticon
        publicKey={getPublicKey(selectedAccount.address)}
        className="size-6"
      />
      {selectedAccount.name ? (
        <div>{selectedAccount.name}</div>
      ) : (
        <div className="text-sm text-foreground/60">
          {sliceMiddleAddr(selectedAccount.address)}
        </div>
      )}
    </Button>
  );
});

const DefaultButton = forwardRef<HTMLButtonElement, ComponentProps<"button">>(
  (props, ref) => <button ref={ref} {...props} />
);
