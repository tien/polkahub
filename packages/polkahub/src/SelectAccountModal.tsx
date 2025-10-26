import { ModalContext } from "@polkahub/context";
import { SelectedAccountButton } from "@polkahub/select-account";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@polkahub/ui-components";
import { state, useStateObservable } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { FC, PropsWithChildren, ReactNode, useMemo, useState } from "react";

// For lazy-loading optimizations
export const SelectAccountModalTrigger = <SelectedAccountButton loading />;

const [openChange$, setOpen] = createSignal<boolean>();
export const openSelectAccount = () => setOpen(true);
const open$ = state(openChange$, false);

export const SelectAccountModal: FC<PropsWithChildren> = ({ children }) => {
  const open = useStateObservable(open$);

  // Experimenting a bit but... who says I can't do this?
  const [content, setContent] = useState<ReactNode | null>(null);

  const contextValue = useMemo(
    () => ({ setContent, closeModal: () => setOpen(false) }),
    []
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setTimeout(() => setContent(null), 500);
        }
        setOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <SelectedAccountButton />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <ModalContext value={contextValue}>
            {content ?? children}
          </ModalContext>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
