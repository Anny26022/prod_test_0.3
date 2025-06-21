import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileTooltip from './MobileTooltip';

// Mock HeroUI Tooltip component
jest.mock('@heroui/react', () => ({
  Tooltip: ({ children, content, isOpen, onOpenChange, ...props }: any) => (
    <div data-testid="tooltip-wrapper" data-open={isOpen} {...props}>
      {children}
      {isOpen && <div data-testid="tooltip-content">{content}</div>}
    </div>
  ),
}));

describe('MobileTooltip', () => {
  beforeEach(() => {
    // Reset window size and touch capabilities
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: undefined,
    });
    
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  it('renders children correctly', () => {
    render(
      <MobileTooltip content="Test tooltip">
        <button>Test Button</button>
      </MobileTooltip>
    );

    expect(screen.getByRole('button', { name: 'Test Button' })).toBeInTheDocument();
  });

  it('shows tooltip on hover for desktop', () => {
    render(
      <MobileTooltip content="Test tooltip">
        <button>Test Button</button>
      </MobileTooltip>
    );

    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);

    expect(screen.getByTestId('tooltip-content')).toHaveTextContent('Test tooltip');
  });

  it('shows tooltip on click for mobile', () => {
    // Mock mobile environment
    Object.defineProperty(window, 'ontouchstart', {
      value: {},
      configurable: true,
    });

    render(
      <MobileTooltip content="Test tooltip">
        <button>Test Button</button>
      </MobileTooltip>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByTestId('tooltip-content')).toHaveTextContent('Test tooltip');
  });

  it('toggles tooltip on multiple clicks for mobile', () => {
    // Mock mobile environment
    Object.defineProperty(window, 'ontouchstart', {
      value: {},
      configurable: true,
    });

    render(
      <MobileTooltip content="Test tooltip">
        <button>Test Button</button>
      </MobileTooltip>
    );

    const button = screen.getByRole('button');
    
    // First click - should open
    fireEvent.click(button);
    expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    
    // Second click - should close
    fireEvent.click(button);
    expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
  });

  it('applies correct cursor style for mobile', () => {
    // Mock mobile environment
    Object.defineProperty(window, 'ontouchstart', {
      value: {},
      configurable: true,
    });

    render(
      <MobileTooltip content="Test tooltip">
        <button>Test Button</button>
      </MobileTooltip>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ cursor: 'pointer' });
  });

  it('preserves original onClick handler', () => {
    const originalOnClick = jest.fn();

    render(
      <MobileTooltip content="Test tooltip">
        <button onClick={originalOnClick}>Test Button</button>
      </MobileTooltip>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(originalOnClick).toHaveBeenCalled();
  });
});
