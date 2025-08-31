// AI-assisted: see ai-assist.md
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

// Mock the AuthProvider to avoid API calls in tests
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    permissions: {},
    login: jest.fn(),
    logout: jest.fn(),
    refreshUser: jest.fn(),
  }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

test('renders login page when not authenticated', () => {
  renderWithProviders(<App />);
  expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
});

test('shows demo accounts information', () => {
  renderWithProviders(<App />);
  expect(screen.getByText('Demo Accounts:')).toBeInTheDocument();
  expect(screen.getByText(/admin@example.com/)).toBeInTheDocument();
});
