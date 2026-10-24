import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Card, { CardTitle, CardContent } from '../components/ui/Card';

describe('Design System UI Components', () => {
  it('renders Button with primary styling and handles click', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Plan Trip</Button>);
    
    const button = screen.getByRole('button', { name: /plan trip/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders Button in loading state with spinner and disabled state', () => {
    render(<Button isLoading>Submit</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders Input with accessible label and error state', () => {
    render(
      <Input
        label="Destination"
        id="dest-input"
        error="Destination is required"
      />
    );
    expect(screen.getByLabelText(/destination/i)).toBeInTheDocument();
    expect(screen.getByText(/destination is required/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders Badge with correct variant and text', () => {
    render(<Badge variant="forest" withDot>Confirmed</Badge>);
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
  });

  it('renders Card with title and content', () => {
    render(
      <Card>
        <CardTitle>Amalfi Coast</CardTitle>
        <CardContent>Summer Getaway</CardContent>
      </Card>
    );
    expect(screen.getByText('Amalfi Coast')).toBeInTheDocument();
    expect(screen.getByText('Summer Getaway')).toBeInTheDocument();
  });
});
