import React, { useState, useRef, useEffect } from 'react';
import { Tooltip, TooltipProps } from '@heroui/react';

interface MobileTooltipProps extends Omit<TooltipProps, 'isOpen' | 'onOpenChange'> {
  children: React.ReactElement;
  content: React.ReactNode;
  enableClickOnMobile?: boolean;
}

/**
 * Mobile-friendly tooltip that opens on click for touch devices
 * and maintains hover behavior for desktop
 */
export const MobileTooltip: React.FC<MobileTooltipProps> = ({
  children,
  content,
  enableClickOnMobile = true,
  ...tooltipProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Detect if device is mobile/touch
  useEffect(() => {
    const checkIsMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isTouchDevice || isSmallScreen);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-mobile-tooltip]')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const handleClick = (event: React.MouseEvent) => {
    if (isMobile && enableClickOnMobile) {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(!isOpen);
    }
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      clearTimeout(timeoutRef.current);
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      timeoutRef.current = setTimeout(() => setIsOpen(false), 100);
    }
  };

  // Clone the trigger element to add mobile-specific props
  const triggerElement = React.cloneElement(children, {
    onClick: (event: React.MouseEvent) => {
      // Call original onClick if it exists
      if (children.props.onClick) {
        children.props.onClick(event);
      }
      handleClick(event);
    },
    onMouseEnter: (event: React.MouseEvent) => {
      // Call original onMouseEnter if it exists
      if (children.props.onMouseEnter) {
        children.props.onMouseEnter(event);
      }
      handleMouseEnter();
    },
    onMouseLeave: (event: React.MouseEvent) => {
      // Call original onMouseLeave if it exists
      if (children.props.onMouseLeave) {
        children.props.onMouseLeave(event);
      }
      handleMouseLeave();
    },
    'data-mobile-tooltip': true,
    style: {
      ...children.props.style,
      cursor: isMobile ? 'pointer' : children.props.style?.cursor || 'help',
    },
  });

  return (
    <Tooltip
      {...tooltipProps}
      content={content}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      // For mobile, we control the tooltip manually
      // For desktop, let HeroUI handle hover behavior
      trigger={isMobile ? 'manual' : 'hover'}
      placement={tooltipProps.placement || 'top'}
      delay={isMobile ? 0 : tooltipProps.delay}
      closeDelay={isMobile ? 0 : tooltipProps.closeDelay}
    >
      {triggerElement}
    </Tooltip>
  );
};

export default MobileTooltip;
