import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../Button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button text="Click Me" />);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button text="Click Me" onClick={handleClick} />);
    
    const button = screen.getByText('Click Me');
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button text="Click Me" disabled={true} />);
    const button = screen.getByText('Click Me');
    expect(button).toBeDisabled();
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button text="Click Me" onClick={handleClick} disabled={true} />);
    
    const button = screen.getByText('Click Me');
    await user.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });
});

