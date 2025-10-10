import { Dialog as DialogHeadless, DialogPanel } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  noPadding?: boolean;
  flex?: boolean;
}

export function Dialog({
  open,
  onClose,
  children,
  noPadding = false,
  flex = false,
}: DialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <DialogHeadless open={open} onClose={onClose} className="relative z-50">
          <motion.div
            className="fixed inset-0 z-0 w-screen overflow-y-auto bg-white/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <div className="fixed inset-0 flex w-screen items-end justify-center p-4 min-[480px]:p-8 overflow-y-auto">
            <DialogPanel
              className={clsx(
                "border border-primary-200 bg-white rounded-md shadow-lg font-inter max-h-full overflow-y-auto",
                !noPadding && "p-6 min-[480px]:p-8",
                flex && "flex flex-col"
              )}
              as={motion.div}
              initial={{ opacity: 0, translateY: 100 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 100 }}
            >
              {children}
            </DialogPanel>
          </div>
        </DialogHeadless>
      )}
    </AnimatePresence>
  );
}
