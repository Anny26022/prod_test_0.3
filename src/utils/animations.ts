import { Variants } from "framer-motion";

// Shared spring configuration for consistent feel
export const springTransition = {
  type: "spring",
  stiffness: 180,
  damping: 22,
  mass: 0.5
};

// Page transition variants
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      ...springTransition,
      staggerChildren: 0.07
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.15
    }
  }
};

// Card transition variants
export const cardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.97
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springTransition
  },
  hover: {
    y: -2,
    scale: 1.01,
    transition: springTransition
  },
  tap: {
    scale: 0.98
  }
};

// List item variants for staggered animations
export const listItemVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: springTransition
  }
};

// Metric card variants
export const metricVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.97
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springTransition
  },
  hover: {
    y: -2,
    backgroundColor: "#F8F9FA", // Light mode content2
    transition: springTransition
  }
};

// Fade in variants
export const fadeInVariants: Variants = {
  initial: {
    opacity: 0
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.2
    }
  }
};

// Scale up variants
export const scaleUpVariants: Variants = {
  initial: {
    scale: 0.95,
    opacity: 0
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: springTransition
  }
};

// Slide variants
export const slideVariants: Variants = {
  left: {
    x: "-100%",
    opacity: 0
  },
  right: {
    x: "100%",
    opacity: 0
  },
  center: {
    x: 0,
    opacity: 1,
    transition: springTransition
  }
};

// Table row variants
export const tableRowVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20
  },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.03,
      ...springTransition
    }
  }),
  hover: {
    backgroundColor: "#F8F9FA", // Light mode content2
    transition: {
      duration: 0.13
    }
  }
};

// Modal variants
export const modalVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.97,
    y: 20
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springTransition
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 10,
    transition: {
      duration: 0.15
    }
  }
}; 