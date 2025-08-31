// AI-assisted: see ai-assist.md
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { interviewsApi, candidatesApi } from '../services/api';
import { Candidate, InterviewStatus } from '../types';
import { XCircleIcon, CalendarIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface EditInterviewForm {
  candidate_id: number;
  interviewer_name: string;
  scheduled_at: string;
  duration_minutes: number;
  status: InterviewStatus;
  interview_type: string;
  notes?: string;
  score?: number;
}

interface EditInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  interview: any; // The interview to edit
}

const EditInterviewModal: React.FC<EditInterviewModalProps> = ({ isOpen, onClose, interview }) => {
  const [formData, setFormData] = useState<EditInterviewForm>({
    candidate_id: 0,
    interviewer_name: '',
    scheduled_at: '',
    duration_minutes: 60,
    status: InterviewStatus.SCHEDULED,
    interview_type: 'technical',
    notes: '',
    score: undefined,
  });

  const queryClient = useQueryClient();

  // Fetch candidates for the dropdown
  const { data: candidates } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => candidatesApi.getCandidates().then(res => res.data),
    enabled: isOpen,
  });

  // Update interview mutation
  const updateInterviewMutation = useMutation({
    mutationFn: (data: EditInterviewForm) => interviewsApi.updateInterview(interview.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast.success('Interview updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update interview');
    },
  });

  // Initialize form with interview data when modal opens
  useEffect(() => {
    if (isOpen && interview) {
      // Convert the scheduled_at to the format expected by datetime-local input
      const scheduledDate = new Date(interview.scheduled_at);
      const localDateTime = new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormData({
        candidate_id: interview.candidate_id,
        interviewer_name: interview.interviewer_name,
        scheduled_at: localDateTime,
        duration_minutes: interview.duration_minutes,
        status: interview.status,
        interview_type: interview.interview_type,
        notes: interview.notes || '',
        score: interview.score || undefined,
      });
    }
  }, [isOpen, interview]);

  const handleInputChange = (field: keyof EditInterviewForm, value: string | number | InterviewStatus | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.candidate_id || !formData.interviewer_name || !formData.scheduled_at) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Convert the date/time to ISO format
    const scheduledDate = new Date(formData.scheduled_at).toISOString();
    
    updateInterviewMutation.mutate({
      ...formData,
      scheduled_at: scheduledDate,
    });
  };

  // Get minimum date (today)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !interview) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Edit Interview</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={updateInterviewMutation.isPending}
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Candidate Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <UserIcon className="inline h-4 w-4 mr-1" />
                Candidate *
              </label>
              <select
                value={formData.candidate_id}
                onChange={(e) => handleInputChange('candidate_id', parseInt(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value={0}>Select a candidate...</option>
                {candidates?.map((candidate: Candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.full_name} - {candidate.position}
                  </option>
                ))}
              </select>
            </div>

            {/* Interviewer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interviewer Name *
              </label>
              <input
                type="text"
                value={formData.interviewer_name}
                onChange={(e) => handleInputChange('interviewer_name', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter interviewer name"
                required
              />
            </div>

            {/* Scheduled Date & Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="inline h-4 w-4 mr-1" />
                Scheduled Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => handleInputChange('scheduled_at', e.target.value)}
                min={getMinDateTime()}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* Duration, Status, and Interview Type Row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <ClockIcon className="inline h-4 w-4 mr-1" />
                  Duration
                </label>
                <select
                  value={formData.duration_minutes}
                  onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hr</option>
                  <option value={120}>2 hr</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as InterviewStatus)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={InterviewStatus.SCHEDULED}>Scheduled</option>
                  <option value={InterviewStatus.IN_PROGRESS}>In Progress</option>
                  <option value={InterviewStatus.COMPLETED}>Completed</option>
                  <option value={InterviewStatus.CANCELLED}>Cancelled</option>
                  <option value={InterviewStatus.NO_SHOW}>No Show</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.interview_type}
                  onChange={(e) => handleInputChange('interview_type', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="phone">Phone</option>
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="panel">Panel</option>
                  <option value="final">Final</option>
                  <option value="cultural">Cultural</option>
                </select>
              </div>
            </div>

            {/* Score (only show if completed) */}
            {formData.status === InterviewStatus.COMPLETED && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Score (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.score || ''}
                  onChange={(e) => handleInputChange('score', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Rate 1-10"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Add any additional notes..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                disabled={updateInterviewMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateInterviewMutation.isPending}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {updateInterviewMutation.isPending ? 'Updating...' : 'Update Interview'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditInterviewModal;
