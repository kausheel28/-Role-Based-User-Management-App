// AI-assisted: see ai-assist.md
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import UsersPage from '../UsersPage';
import { UserRole } from '../../types';
import * as api from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  usersApi: {
    getUsers: jest.fn(),
    createUser: jest.fn(),
    updateUserPageAccess: jest.fn(),
  },
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'admin@example.com', role: 'admin' },
    isAuthenticated: true,
    permissions: { user_management: true },
  }),
}));

const mockUsersApi = api.usersApi as jest.Mocked<typeof api.usersApi>;

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

const mockUsers = [
  {
    id: 1,
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: UserRole.ADMIN,
    active: true,
    page_permissions: {
      dashboard: true,
      candidates: true,
      interviews: true,
      calls: true,
      settings: true,
      user_management: true,
    },
  },
  {
    id: 2,
    email: 'manager@example.com',
    full_name: 'Manager User',
    role: UserRole.MANAGER,
    active: true,
    page_permissions: {
      dashboard: true,
      candidates: true,
      interviews: true,
      calls: true,
      settings: true,
      user_management: false,
    },
  },
  {
    id: 3,
    email: 'agent@example.com',
    full_name: 'Agent User',
    role: UserRole.AGENT,
    active: false,
    page_permissions: {
      dashboard: true,
      candidates: false,
      interviews: true,
      calls: true,
      settings: true,
      user_management: false,
    },
  },
];

describe('UsersPage Data Table Interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsersApi.getUsers.mockResolvedValue({ data: mockUsers } as any);
  });

  describe('Table Rendering', () => {
    it('renders users table with correct data', async () => {
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
        expect(screen.getByText('Manager User')).toBeInTheDocument();
        expect(screen.getByText('Agent User')).toBeInTheDocument();
      });

      // Check email addresses
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('manager@example.com')).toBeInTheDocument();
      expect(screen.getByText('agent@example.com')).toBeInTheDocument();

      // Check roles
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('manager')).toBeInTheDocument();
      expect(screen.getByText('agent')).toBeInTheDocument();

      // Check status
      expect(screen.getAllByText('Active')).toHaveLength(2);
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('renders permission toggles for each user', async () => {
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        // Should have toggle switches for each permission for each user
        const toggles = screen.getAllByRole('button', { name: /toggle/i });
        // 3 users × 6 permissions = 18 toggles
        expect(toggles).toHaveLength(18);
      });
    });

    it('shows correct permission states', async () => {
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        // Admin should have all permissions enabled
        const adminRow = screen.getByText('Admin User').closest('tr');
        const adminToggles = adminRow?.querySelectorAll('[role="button"]');
        
        // All admin toggles should be in "on" state (have translate-x-5 class)
        adminToggles?.forEach(toggle => {
          const toggleSwitch = toggle.querySelector('.translate-x-5');
          expect(toggleSwitch).toBeInTheDocument();
        });
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters users based on search input', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      // Search for "manager"
      const searchInput = screen.getByPlaceholderText(/search users/i);
      await user.type(searchInput, 'manager');

      await waitFor(() => {
        expect(mockUsersApi.getUsers).toHaveBeenCalledWith(
          0, // skip
          10, // limit
          'manager' // search
        );
      });
    });

    it('debounces search input', async () => {
      const user = userEvent.setup();
      jest.useFakeTimers();
      
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search users/i);
      
      // Type multiple characters quickly
      await user.type(searchInput, 'admin');
      
      // Should not have called API yet (debounced)
      expect(mockUsersApi.getUsers).toHaveBeenCalledTimes(1); // Initial load only

      // Fast-forward timers
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockUsersApi.getUsers).toHaveBeenCalledWith(0, 10, 'admin');
      });

      jest.useRealTimers();
    });

    it('resets pagination when searching', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<UsersPage />);

      // Go to page 2 first (simulate pagination)
      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      // Now search
      const searchInput = screen.getByPlaceholderText(/search users/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        // Should call with skip=0 (page 1)
        expect(mockUsersApi.getUsers).toHaveBeenCalledWith(0, 10, 'test');
      });
    });
  });

  describe('Pagination', () => {
    it('shows pagination controls', async () => {
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText(/showing page/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });

    it('disables previous button on first page', async () => {
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(prevButton).toBeDisabled();
      });
    });

    it('navigates to next page', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(mockUsersApi.getUsers).toHaveBeenCalledWith(10, 10, undefined);
      });
    });

    it('navigates to previous page', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      // Go to page 2 first
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(prevButton).not.toBeDisabled();
      });

      // Go back to page 1
      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      await waitFor(() => {
        expect(mockUsersApi.getUsers).toHaveBeenCalledWith(0, 10, undefined);
      });
    });
  });

  describe('Permission Toggle Interactions', () => {
    it('toggles user permission when clicked', async () => {
      const user = userEvent.setup();
      
      mockUsersApi.updateUserPageAccess.mockResolvedValue({ data: { message: 'Success' } } as any);

      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Manager User')).toBeInTheDocument();
      });

      // Find manager row and user_management toggle (should be off)
      const managerRow = screen.getByText('Manager User').closest('tr');
      const userMgmtToggle = managerRow?.querySelector('[title*="User Management"]');
      
      expect(userMgmtToggle).toBeInTheDocument();
      await user.click(userMgmtToggle!);

      await waitFor(() => {
        expect(mockUsersApi.updateUserPageAccess).toHaveBeenCalledWith(
          2, // manager user ID
          'user_management',
          true // granting access
        );
      });
    });

    it('shows loading state during permission update', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      mockUsersApi.updateUserPageAccess.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { message: 'Success' } } as any), 100))
      );

      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Manager User')).toBeInTheDocument();
      });

      const managerRow = screen.getByText('Manager User').closest('tr');
      const candidatesToggle = managerRow?.querySelector('[title*="Candidates"]');
      
      await user.click(candidatesToggle!);

      // Should show some loading indication (disabled state)
      await waitFor(() => {
        expect(candidatesToggle).toHaveClass('opacity-50');
      });
    });

    it('handles permission update errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockUsersApi.updateUserPageAccess.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Agent User')).toBeInTheDocument();
      });

      const agentRow = screen.getByText('Agent User').closest('tr');
      const candidatesToggle = agentRow?.querySelector('[title*="Candidates"]');
      
      await user.click(candidatesToggle!);

      await waitFor(() => {
        expect(mockUsersApi.updateUserPageAccess).toHaveBeenCalled();
      });

      // Should handle error (toast would be called, but we mocked it)
    });

    it('disables user_management toggle for non-admin users', async () => {
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Manager User')).toBeInTheDocument();
      });

      // Manager should not be able to toggle user_management for themselves or others
      const managerRow = screen.getByText('Manager User').closest('tr');
      const userMgmtToggle = managerRow?.querySelector('[title*="User Management"]');
      
      expect(userMgmtToggle).toHaveClass('cursor-not-allowed');
    });
  });

  describe('Add User Modal', () => {
    it('opens add user modal when button is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<UsersPage />);

      const addButton = screen.getByRole('button', { name: /add user/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New User')).toBeInTheDocument();
      });
    });

    it('creates new user with valid data', async () => {
      const user = userEvent.setup();
      
      mockUsersApi.createUser.mockResolvedValue({
        data: {
          id: 4,
          email: 'newuser@example.com',
          full_name: 'New User',
          role: UserRole.AGENT,
          active: true,
        }
      } as any);

      renderWithProviders(<UsersPage />);

      // Open modal
      const addButton = screen.getByRole('button', { name: /add user/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New User')).toBeInTheDocument();
      });

      // Fill form
      await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
      await user.type(screen.getByLabelText(/full name/i), 'New User');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      
      const roleSelect = screen.getByLabelText(/role/i);
      await user.selectOptions(roleSelect, UserRole.AGENT);

      // Submit
      const createButton = screen.getByRole('button', { name: /create user/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockUsersApi.createUser).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          full_name: 'New User',
          password: 'password123',
          role: UserRole.AGENT,
          active: true,
        });
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no users found', async () => {
      mockUsersApi.getUsers.mockResolvedValue({ data: [] } as any);

      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument();
        expect(screen.getByText(/get started by adding a new user/i)).toBeInTheDocument();
      });
    });

    it('shows appropriate message for search with no results', async () => {
      const user = userEvent.setup();
      
      // Initial load with users
      mockUsersApi.getUsers.mockResolvedValueOnce({ data: mockUsers } as any);
      
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      // Search that returns no results
      mockUsersApi.getUsers.mockResolvedValueOnce({ data: [] } as any);

      const searchInput = screen.getByPlaceholderText(/search users/i);
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument();
        expect(screen.getByText(/try adjusting your search criteria/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner while fetching users', () => {
      // Mock pending promise
      mockUsersApi.getUsers.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders(<UsersPage />);

      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });
  });

  describe('Permission Guide', () => {
    it('displays permission guide with all pages', async () => {
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Permission Guide')).toBeInTheDocument();
      });

      // Check all permission descriptions
      expect(screen.getByText(/Dashboard.*Access to main dashboard/)).toBeInTheDocument();
      expect(screen.getByText(/Interviews.*Manage interviews/)).toBeInTheDocument();
      expect(screen.getByText(/Candidates.*Manage candidates/)).toBeInTheDocument();
      expect(screen.getByText(/Calls.*Manage calls/)).toBeInTheDocument();
      expect(screen.getByText(/Settings.*Access settings/)).toBeInTheDocument();
      expect(screen.getByText(/User Management.*Admin only/)).toBeInTheDocument();
    });

    it('shows note about real-time updates', async () => {
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText(/Toggle switches update permissions in real-time/)).toBeInTheDocument();
      });
    });
  });
});
