// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/context/I18nContext';
import LanguageSelector from './LanguageSelector';

const { updateUserPreferences, mockUseAuth } = vi.hoisted(() => ({
  updateUserPreferences: vi.fn(async () => undefined),
  mockUseAuth: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    updateUserPreferences,
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('LanguageSelector', () => {
  beforeEach(() => {
    localStorage.clear();
    updateUserPreferences.mockClear();
    mockUseAuth.mockReturnValue({ profile: { locale: 'en' }, refreshProfile: vi.fn(async () => undefined) });
  });

  it('keeps the manually selected locale without reverting to stale profile state', async () => {
    render(
      <I18nProvider>
        <LanguageSelector />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /select language/i }));
    fireEvent.click(screen.getByRole('button', { name: /हिन्दी/i }));

    await waitFor(() => expect(updateUserPreferences).toHaveBeenCalledWith({ locale: 'hi' }));
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /select language/i });
      expect(button.textContent).toContain('हिन्दी');
    });
  });
});
