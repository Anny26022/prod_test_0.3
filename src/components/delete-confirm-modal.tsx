import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Divider
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDelete: () => void;
  tradeName: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onOpenChange,
  onDelete,
  tradeName
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange} 
      size="sm"
      backdrop="blur"
      className="bg-background/95 backdrop-blur-sm"
      motionProps={{
        variants: {
          enter: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1]
            }
          },
          exit: {
            opacity: 0,
            scale: 0.98,
            y: 10,
            transition: {
              duration: 0.2,
              ease: [0.16, 1, 0.3, 1]
            }
          }
        },
        initial: { opacity: 0, scale: 0.98, y: 10 }
      }}
    >
      <ModalContent className="shadow-elegant">
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 pb-2">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-danger-500 to-danger-600 bg-clip-text text-transparent">
                Confirm Delete
              </h2>
            </ModalHeader>
            <Divider className="opacity-50" />
            <ModalBody>
              <div className="flex flex-col items-center gap-4 py-6">
                <motion.div 
                  className="w-16 h-16 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center shadow-soft-sm"
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 15 
                  }}
                >
                  <Icon icon="lucide:trash" className="text-danger-500 text-2xl" />
                </motion.div>
                <div className="text-center space-y-3">
                  <p className="text-lg leading-relaxed">
                    Are you sure you want to delete the trade for{" "}
                    <span className="font-semibold text-danger-500">{tradeName}</span>?
                  </p>
                  <p className="text-sm text-foreground-500 leading-relaxed">
                    This action cannot be undone and all associated data will be permanently removed.
                  </p>
                </div>
              </div>
            </ModalBody>
            <Divider className="opacity-50" />
            <ModalFooter className="pt-4">
              <Button 
                variant="flat" 
                onPress={onClose}
                className="hover:bg-foreground-100 transition-colors duration-200"
              >
                Cancel
              </Button>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  color="danger" 
                  onPress={onDelete}
                  className="bg-gradient-to-r from-danger-500 to-danger-600 shadow-soft-sm hover:shadow-soft-md transition-all duration-200"
                  startContent={
                    <Icon 
                      icon="lucide:trash" 
                      className="text-lg opacity-90" 
                    />
                  }
                >
                  Delete Trade
                </Button>
              </motion.div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};