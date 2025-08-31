// AI-assisted: see ai-assist.md
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CandidateModal from '../CandidateModal';
import { CandidateStatus } from '../../types';
import * as api from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  candidatesApi: {
    createCandidate: jest.fn(),
    updateCandidate: jest.fn(),
  },
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockCandidatesApi = api.candidatesApi as jest.Mocked<typeof api.candidatesApi>;

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
      {ui}
    </QueryClientProvider>
  );
};

const mockCandidate = {
  id: 1,
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  position: 'Software Engineer',
  experience_years: 5,
  status: CandidateStatus.ACTIVE,
  resume_url: 'https://example.com/resume.pdf',
  notes: 'Great candidate',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

describe('CandidateModal Form Validation', () => {
  const mockOnClose = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Mode Validation', () => {
    it('shows validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={null}
        />
      );

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /add candidate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument();
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Position is required')).toBeInTheDocument();
      });

      // Should not call API
      expect(mockCandidatesApi.createCandidate).not.toHaveBeenCalled();
    });

    it('shows validation error for invalid email format', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={null}
        />
      );

      // Fill in invalid email
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /add candidate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email must be a valid email')).toBeInTheDocument();
      });

      expect(mockCandidatesApi.createCandidate).not.toHaveBeenCalled();
    });

    it('shows validation error for invalid phone number', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={null}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/position/i), 'Developer');
      
      // Fill invalid phone
      await user.type(screen.getByLabelText(/phone/i), '123');

      const submitButton = screen.getByRole('button', { name: /add candidate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Phone must be a valid phone number')).toBeInTheDocument();
      });

      expect(mockCandidatesApi.createCandidate).not.toHaveBeenCalled();
    });

    it('shows validation error for negative experience years', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={null}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/position/i), 'Developer');
      
      // Fill negative experience
      const experienceInput = screen.getByLabelText(/experience years/i);
      await user.clear(experienceInput);
      await user.type(experienceInput, '-1');

      const submitButton = screen.getByRole('button', { name: /add candidate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Experience years must be at least 0')).toBeInTheDocument();
      });

      expect(mockCandidatesApi.createCandidate).not.toHaveBeenCalled();
    });

    it('shows validation error for invalid resume URL', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={null}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/position/i), 'Developer');
      
      // Fill invalid URL
      await user.type(screen.getByLabelText(/resume url/i), 'not-a-url');

      const submitButton = screen.getByRole('button', { name: /add candidate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Resume URL must be a valid URL')).toBeInTheDocument();
      });

      expect(mockCandidatesApi.createCandidate).not.toHaveBeenCalled();
    });

    it('successfully submits with valid data', async () => {
      const user = userEvent.setup();
      
      mockCandidatesApi.createCandidate.mockResolvedValueOnce({
        data: { ...mockCandidate, id: 2 }
      } as any);

      renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={null}
        />
      );

      // Fill valid data
      await user.type(screen.getByLabelText(/full name/i), 'Jane Smith');
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/position/i), 'Senior Developer');
      await user.type(screen.getByLabelText(/phone/i), '+1234567890');
      
      const experienceInput = screen.getByLabelText(/experience years/i);
      await user.clear(experienceInput);
      await user.type(experienceInput, '3');
      
      await user.type(screen.getByLabelText(/resume url/i), 'https://example.com/resume.pdf');
      await user.type(screen.getByLabelText(/notes/i), 'Excellent candidate');

      const submitButton = screen.getByRole('button', { name: /add candidate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCandidatesApi.createCandidate).toHaveBeenCalledWith({
          full_name: 'Jane Smith',
          email: 'jane@example.com',
          position: 'Senior Developer',
          phone: '+1234567890',
          experience_years: 3,
          status: CandidateStatus.ACTIVE,
          resume_url: 'https://example.com/resume.pdf',
          notes: 'Excellent candidate',
        });
      });
    });
  });

  describe('Edit Mode Validation', () => {
    it('pre-fills form with candidate data', () => {
      renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={mockCandidate}
        />
      );

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://example.com/resume.pdf')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Great candidate')).toBeInTheDocument();
    });

    it('validates changes in edit mode', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={mockCandidate}
        />
      );

      // Clear email and enter invalid one
      const emailInput = screen.getByDisplayValue('john@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /update candidate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email must be a valid email')).toBeInTheDocument();
      });

      expect(mockCandidatesApi.updateCandidate).not.toHaveBeenCalled();
    });

    it('successfully updates with valid changes', async () => {
      const user = userEvent.setup();
      
      mockCandidatesApi.updateCandidate.mockResolvedValueOnce({
        data: { ...mockCandidate, position: 'Senior Software Engineer' }
      } as any);

      renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={mockCandidate}
        />
      );

      // Update position
      const positionInput = screen.getByDisplayValue('Software Engineer');
      await user.clear(positionInput);
      await user.type(positionInput, 'Senior Software Engineer');

      const submitButton = screen.getByRole('button', { name: /update candidate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCandidatesApi.updateCandidate).toHaveBeenCalledWith(
          mockCandidate.id,
          expect.objectContaining({
            position: 'Senior Software Engineer',
          })
        );
      });
    });
  });

  describe('Form Interaction', () => {
    it('resets form when modal is closed and reopened', async () => {
      const user = userEvent.setup();
      
      const { rerender } = renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={null}
        />
      );

      // Fill some data
      await user.type(screen.getByLabelText(/full name/i), 'Test Name');

      // Close modal
      rerender(
        <CandidateModal
          isOpen={false}
          onClose={mockOnClose}
          candidate={null}
        />
      );

      // Reopen modal
      rerender(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={null}
        />
      );

      // Form should be reset
      expect(screen.getByLabelText(/full name/i)).toHaveValue('');
    });

    it('cancels form submission', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={null}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockCandidatesApi.createCandidate).not.toHaveBeenCalled();
    });

    it('handles loading state during submission', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed response
      mockCandidatesApi.createCandidate.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: mockCandidate } as any), 100))
      );

      renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={null}
        />
      );

      // Fill valid data
      await user.type(screen.getByLabelText(/full name/i), 'Jane Smith');
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/position/i), 'Developer');

      const submitButton = screen.getByRole('button', { name: /add candidate/i });
      await user.click(submitButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(mockCandidatesApi.createCandidate).toHaveBeenCalled();
      }, { timeout: 200 });
    });
  });

  describe('Status Selection', () => {
    it('allows changing candidate status', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={mockCandidate}
        />
      );

      const statusSelect = screen.getByDisplayValue('Active');
      await user.selectOptions(statusSelect, CandidateStatus.INACTIVE);

      expect(statusSelect).toHaveValue(CandidateStatus.INACTIVE);
    });

    it('includes all status options', () => {
      renderWithProviders(
        <CandidateModal
          isOpen={true}
          onClose={mockOnClose}
          candidate={null}
        />
      );

      const statusSelect = screen.getByLabelText(/status/i);
      
      // Check that all status options are available
      expect(screen.getByRole('option', { name: /active/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /inactive/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /hired/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /rejected/i })).toBeInTheDocument();
    });
  });
});
