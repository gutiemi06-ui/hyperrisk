import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HyperRiskDashboard } from '@/components/hyperrisk-dashboard';

describe('HyperRisk demo workflow', () => {
  it('starts in an explicitly labelled seeded, read-only mode', () => {
    render(<HyperRiskDashboard />);
    expect(screen.getByText('Seeded demonstration')).toBeInTheDocument();
    expect(screen.getByText('No trading permissions')).toBeInTheDocument();
    expect(screen.getAllByText('$49,842.18')).toHaveLength(2);
  });

  it('rejects malformed wallet addresses without making a request', () => {
    render(<HyperRiskDashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    expect(screen.getByText('Wallet unavailable')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Public wallet address' }),
    ).toHaveAttribute('aria-invalid', 'true');
  });

  it('navigates to stress testing and recalculates an interactive scenario', () => {
    render(<HyperRiskDashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'Stress test' }));
    expect(screen.getByText('Interactive market shock')).toBeInTheDocument();
    const slider = screen.getByRole('slider', { name: 'BTC price shock' });
    fireEvent.change(slider, { target: { value: '-25' } });
    expect(slider).toHaveValue('-25');
    expect(
      screen.getByText('How this scenario is calculated'),
    ).toBeInTheDocument();
  });

  it('plays the deterministic replay fixture', () => {
    render(<HyperRiskDashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    expect(screen.getByText('synthetic-btc-l2-2026-08-31')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play replay' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });
});
