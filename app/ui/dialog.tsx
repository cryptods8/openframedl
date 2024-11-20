import { Dialog as DialogHeadless, DialogPanel } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Dialog({ open, onClose, children }: DialogProps) {
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
          <div className="fixed inset-0 flex w-screen items-end justify-center p-4 min-[360px]:p-8">
            <DialogPanel
              className="border border-primary-200 bg-white p-6 min-[360px]:p-8 rounded-md shadow-lg font-inter"
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
