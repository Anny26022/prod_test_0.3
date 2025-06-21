import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface WelcomeMessageModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
}

export const WelcomeMessageModal: React.FC<WelcomeMessageModalProps> = ({ isOpen, onOpenChange, userName }) => {
  const firstName = userName.split(' ')[0];

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="sm"
      isDismissable={false}
      hideCloseButton={true}
      classNames={{
        base: "max-w-[90vw] sm:max-w-sm",
        wrapper: "items-center justify-center p-4",
        backdrop: "bg-black/60"
      }}
      motionProps={{
        variants: {
          enter: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1]
            }
          },
          exit: {
            opacity: 0,
            scale: 0.95,
            y: 20,
            transition: {
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1]
            }
          }
        },
        initial: { opacity: 0, scale: 0.95, y: 20 }
      }}
    >
      <ModalContent className="bg-background/95 backdrop-blur-xl border border-divider/50 shadow-2xl">
        <ModalHeader className="flex items-center gap-3 px-6 py-4 border-b border-divider/50 bg-gradient-to-r from-success/5 via-primary/5 to-secondary/5">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.div
              className="p-2 rounded-xl bg-gradient-to-br from-success/20 to-primary/20 border border-success/30"
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeInOut"
              }}
            >
              <Icon icon="lucide:party-popper" className="text-success text-xl" />
            </motion.div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-success to-primary bg-clip-text text-transparent">
                Welcome, {firstName || 'Trader'}!
              </span>
              <p className="text-xs text-default-500 mt-0.5">You're all set to trade!</p>
            </div>
          </motion.div>
        </ModalHeader>
        <ModalBody className="px-4 py-3 space-y-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <p className="text-sm text-default-700 dark:text-default-300">
              Get ready to feel <span className="font-semibold text-success">something truly good</span> about your trading journey!
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <p className="text-xs text-default-500">
              Your True Portfolio System is ready to empower your trades.
            </p>
          </motion.div>
        </ModalBody>
        <ModalFooter className="border-t border-divider/50 px-4 py-3 bg-gradient-to-r from-background/50 to-content1/30">
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
          >
            <Button
              color="success"
              onPress={() => onOpenChange(false)}
              startContent={<Icon icon="lucide:rocket" className="w-4 h-4" />}
              className="w-full bg-gradient-to-r from-success to-primary hover:from-success/90 hover:to-primary/90 transition-all duration-300"
              size="md"
              variant="shadow"
              radius="full"
            >
              <motion.span
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                Let's Go!
              </motion.span>
            </Button>
          </motion.div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 