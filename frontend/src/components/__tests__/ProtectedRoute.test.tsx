// AI-assisted: see ai-assist.md
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from '../ProtectedRoute';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the API service to avoid real API calls
jest.mock('../../services/api', () => ({
  authApi: {
    getMe: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  },
  usersApi: {
    getMyPermissions: jest.fn(),
  },
  setAccessToken: jest.fn(),
  clearAccessToken: jest.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        cacheTime: 0,
      },
    },
  });

// Test component to render inside protected route
const TestComponent = () => <div>Protected Content</div>;

// Helper to render with all necessary providers
const renderWithProviders = (
  ui: React.ReactElement,
  {
    isAuthenticated = false,
    isLoading = false,
    permissions = {},
    initialEntries = ['/'],
  }: {
    isAuthenticated?: boolean;
    isLoading?: boolean;
    permissions?: Record<string, boolean>;
    initialEntries?: string[];
  } = {}
) => {
  const testQueryClient = createTestQueryClient();
  
  // Mock AuthContext values
  const mockAuthValue = {
    user: isAuthenticated ? { id: 1, email: 'test@example.com', full_name: 'Test User', role: 'admin', active: true } : null,
    isAuthenticated,
    isLoading,
    permissions,
    login: jest.fn(),
    logout: jest.fn(),
    refreshUser: jest.fn(),
  };

  return render(
    <QueryClientProvider client={testQueryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider value={mockAuthValue}>
          {ui}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading spinner when authentication is loading', () => {
      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>,
        { isLoading: true }
      );

      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Authentication Guard', () => {
    it('redirects to login when user is not authenticated', () => {
      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>,
        { isAuthenticated: false, isLoading: false }
      );

      // Should not render protected content
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      
      // Should redirect to login (we can't easily test navigation in this setup,
      // but the component should not render the children)
    });

    it('renders children when user is authenticated', () => {
      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>,
        { isAuthenticated: true, isLoading: false }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Page Permission Guard', () => {
    it('renders children when user has required page permission', () => {
      renderWithProviders(
        <ProtectedRoute requiredPage="candidates">
          <TestComponent />
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          isLoading: false,
          permissions: { candidates: true, dashboard: true }
        }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('redirects to unauthorized when user lacks required page permission', () => {
      renderWithProviders(
        <ProtectedRoute requiredPage="candidates">
          <TestComponent />
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          isLoading: false,
          permissions: { dashboard: true, calls: false }
        }
      );

      // Should not render protected content
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('redirects to unauthorized when user has explicit false permission', () => {
      renderWithProviders(
        <ProtectedRoute requiredPage="calls">
          <TestComponent />
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          isLoading: false,
          permissions: { dashboard: true, calls: false, candidates: true }
        }
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('redirects to unauthorized when permission is missing', () => {
      renderWithProviders(
        <ProtectedRoute requiredPage="user_management">
          <TestComponent />
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          isLoading: false,
          permissions: { dashboard: true, calls: true }
        }
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('No Page Requirement', () => {
    it('renders children when authenticated and no page requirement', () => {
      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          isLoading: false,
          permissions: {}
        }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Complex Permission Scenarios', () => {
    it('handles admin user with all permissions', () => {
      const adminPermissions = {
        dashboard: true,
        candidates: true,
        interviews: true,
        calls: true,
        settings: true,
        user_management: true,
      };

      renderWithProviders(
        <ProtectedRoute requiredPage="user_management">
          <TestComponent />
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          isLoading: false,
          permissions: adminPermissions
        }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('handles viewer with minimal permissions', () => {
      const viewerPermissions = {
        dashboard: true,
        settings: true,
      };

      // Should work for dashboard
      const { rerender } = renderWithProviders(
        <ProtectedRoute requiredPage="dashboard">
          <TestComponent />
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          isLoading: false,
          permissions: viewerPermissions
        }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // Should fail for candidates
      rerender(
        <ProtectedRoute requiredPage="candidates">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('handles permission overrides correctly', () => {
      // Viewer with candidates override
      const overriddenPermissions = {
        dashboard: true,
        settings: true,
        candidates: true, // Override: viewer normally can't access candidates
      };

      renderWithProviders(
        <ProtectedRoute requiredPage="candidates">
          <TestComponent />
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          isLoading: false,
          permissions: overriddenPermissions
        }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty permissions object', () => {
      renderWithProviders(
        <ProtectedRoute requiredPage="dashboard">
          <TestComponent />
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          isLoading: false,
          permissions: {}
        }
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('handles null permissions', () => {
      renderWithProviders(
        <ProtectedRoute requiredPage="dashboard">
          <TestComponent />
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          isLoading: false,
          permissions: null as any
        }
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('handles undefined required page', () => {
      renderWithProviders(
        <ProtectedRoute requiredPage={undefined}>
          <TestComponent />
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          isLoading: false,
          permissions: { dashboard: true }
        }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});
