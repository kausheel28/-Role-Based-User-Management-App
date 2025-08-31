// AI-assisted: see ai-assist.md
import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

// Suppress console errors/warnings during tests unless explicitly needed
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
  jest.clearAllMocks();
});

// Global test utilities
export const mockAuthContext = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  permissions: {},
  login: jest.fn(),
  logout: jest.fn(),
  refreshUser: jest.fn(),
};

export const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'admin',
  active: true,
  ...overrides,
});

export const createMockPermissions = (overrides = {}) => ({
  dashboard: true,
  candidates: true,
  interviews: true,
  calls: true,
  settings: true,
  user_management: true,
  ...overrides,
});

// Helper for async testing
export const waitForLoadingToFinish = () => 
  waitFor(() => {
    expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
  });

export const waitForElementToBeRemoved = (element: HTMLElement) =>
  waitFor(() => {
    expect(element).not.toBeInTheDocument();
  });

// Import waitFor for the helpers above
import { waitFor, screen } from '@testing-library/react';
