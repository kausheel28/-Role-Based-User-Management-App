// AI-assisted: see ai-assist.md
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { User, UserRole } from '../types';
import { AuthProvider as RealAuthProvider, useAuth as useRealAuth } from '../contexts/AuthContext';

// Create a mock AuthProvider for testing
const MockAuthProvider: React.FC<{ 
  children: React.ReactNode;
  value: {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    permissions: Record<string, boolean>;
    login: jest.Mock;
    logout: jest.Mock;
    refreshUser: jest.Mock;
  };
}> = ({ children, value }) => {
  // Create a mock context
  const MockAuthContext = React.createContext(value);
  
  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
};

// Custom render function with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Auth context options
  user?: User | null;
  isAuthenticated?: boolean;
  isLoading?: boolean;
  permissions?: Record<string, boolean>;
  
  // Router options
  initialEntries?: string[];
  useMemoryRouter?: boolean;
  
  // Query client options
  queryClient?: QueryClient;
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    user = null,
    isAuthenticated = false,
    isLoading = false,
    permissions = {},
    initialEntries = ['/'],
    useMemoryRouter = false,
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  // Mock AuthContext value
  const mockAuthValue = {
    user,
    isAuthenticated,
    isLoading,
    permissions,
    login: jest.fn(),
    logout: jest.fn(),
    refreshUser: jest.fn(),
  };

  const RouterComponent = useMemoryRouter ? MemoryRouter : BrowserRouter;
  const routerProps = useMemoryRouter ? { initialEntries } : {};

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <RouterComponent {...routerProps}>
        <MockAuthProvider value={mockAuthValue}>
          {children}
        </MockAuthProvider>
      </RouterComponent>
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    mockAuthValue,
    queryClient,
  };
};

// Preset render functions for common scenarios
export const renderAsAdmin = (ui: React.ReactElement, options: CustomRenderOptions = {}) =>
  customRender(ui, {
    user: {
      id: 1,
      email: 'admin@example.com',
      full_name: 'Admin User',
      role: UserRole.ADMIN,
      active: true,
      created_at: '2023-01-01T00:00:00Z',
    },
    isAuthenticated: true,
    permissions: {
      dashboard: true,
      candidates: true,
      interviews: true,
      calls: true,
      settings: true,
      user_management: true,
    },
    ...options,
  });

export const renderAsManager = (ui: React.ReactElement, options: CustomRenderOptions = {}) =>
  customRender(ui, {
    user: {
      id: 2,
      email: 'manager@example.com',
      full_name: 'Manager User',
      role: UserRole.MANAGER,
      active: true,
      created_at: '2023-01-01T00:00:00Z',
    },
    isAuthenticated: true,
    permissions: {
      dashboard: true,
      candidates: true,
      interviews: true,
      calls: true,
      settings: true,
      user_management: false,
    },
    ...options,
  });

export const renderAsAgent = (ui: React.ReactElement, options: CustomRenderOptions = {}) =>
  customRender(ui, {
    user: {
      id: 3,
      email: 'agent@example.com',
      full_name: 'Agent User',
      role: UserRole.AGENT,
      active: true,
      created_at: '2023-01-01T00:00:00Z',
    },
    isAuthenticated: true,
    permissions: {
      dashboard: true,
      candidates: false,
      interviews: true,
      calls: true,
      settings: true,
      user_management: false,
    },
    ...options,
  });

export const renderAsViewer = (ui: React.ReactElement, options: CustomRenderOptions = {}) =>
  customRender(ui, {
    user: {
      id: 4,
      email: 'viewer@example.com',
      full_name: 'Viewer User',
      role: UserRole.VIEWER,
      active: true,
      created_at: '2023-01-01T00:00:00Z',
    },
    isAuthenticated: true,
    permissions: {
      dashboard: true,
      candidates: false,
      interviews: false,
      calls: false,
      settings: true,
      user_management: false,
    },
    ...options,
  });

export const renderUnauthenticated = (ui: React.ReactElement, options: CustomRenderOptions = {}) =>
  customRender(ui, {
    user: null,
    isAuthenticated: false,
    permissions: {},
    ...options,
  });

export const renderLoading = (ui: React.ReactElement, options: CustomRenderOptions = {}) =>
  customRender(ui, {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    permissions: {},
    ...options,
  });

// Mock data factories
export const createMockCandidate = (overrides = {}) => ({
  id: 1,
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  position: 'Software Engineer',
  experience_years: 5,
  status: 'active',
  resume_url: 'https://example.com/resume.pdf',
  notes: 'Great candidate',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockInterview = (overrides = {}) => ({
  id: 1,
  candidate_id: 1,
  candidate_name: 'John Doe',
  interviewer_name: 'Jane Smith',
  scheduled_at: '2023-12-01T10:00:00Z',
  duration_minutes: 60,
  status: 'scheduled',
  interview_type: 'technical',
  notes: 'Technical interview',
  score: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockCall = (overrides = {}) => ({
  id: 1,
  caller_name: 'John Doe',
  caller_number: '+1234567890',
  call_type: 'inbound',
  status: 'answered',
  duration_seconds: 300,
  is_important: false,
  notes: 'Follow-up call',
  created_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'agent',
  active: true,
  page_permissions: {
    dashboard: true,
    candidates: false,
    interviews: true,
    calls: true,
    settings: true,
    user_management: false,
  },
  ...overrides,
});

// API mock helpers
export const mockApiSuccess = (data: any) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
});

export const mockApiError = (message = 'API Error', status = 400) => {
  const error = new Error(message) as any;
  error.response = {
    data: { detail: message },
    status,
    statusText: 'Bad Request',
    headers: {},
    config: {},
  };
  return error;
};

// Test utilities for async operations
export const flushPromises = () => new Promise(setImmediate);

export const advanceTimersAndFlushPromises = async (ms: number) => {
  jest.advanceTimersByTime(ms);
  await flushPromises();
};

// Form testing utilities
export const fillForm = async (fields: Record<string, string>, userEvent: any) => {
  for (const [field, value] of Object.entries(fields)) {
    const input = screen.getByLabelText(new RegExp(field, 'i'));
    if (input.tagName === 'SELECT') {
      await userEvent.selectOptions(input, value);
    } else {
      await userEvent.clear(input);
      await userEvent.type(input, value);
    }
  }
};

export const submitForm = async (buttonText: string | RegExp, userEvent: any) => {
  const submitButton = screen.getByRole('button', { name: buttonText });
  await userEvent.click(submitButton);
};

// Re-export everything from testing-library/react for convenience
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// Import screen for the helpers above
import { screen } from '@testing-library/react';
