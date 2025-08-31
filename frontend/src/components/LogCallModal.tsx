// AI-assisted: see ai-assist.md
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callsApi } from '../services/api';
import { CallType, CallStatus } from '../types';
import { XCircleIcon, PhoneIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface LogCallForm {
  caller_name: string;
  caller_number: string;
  call_type: CallType;
  status: CallStatus;
  duration_seconds: number;
  is_important: boolean;
  notes?: string;
}

interface LogCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LogCallModal: React.FC<LogCallModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<LogCallForm>({
    caller_name: '',
    caller_number: '',
    call_type: CallType.INBOUND,
    status: CallStatus.ANSWERED,
    duration_seconds: 0,
    is_important: false,
    notes: '',
  });

  const queryClient = useQueryClient();

  // Create call mutation
  const createCallMutation = useMutation({
    mutationFn: (data: LogCallForm) => callsApi.createCall(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['call-stats'] });
      toast.success('Call logged successfully');
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to log call');
    },
  });

  const resetForm = () => {
    setFormData({
      caller_name: '',
      caller_number: '',
      call_type: CallType.INBOUND,
      status: CallStatus.ANSWERED,
      duration_seconds: 0,
      is_important: false,
      notes: '',
    });
  };

  const handleInputChange = (field: keyof LogCallForm, value: string | number | boolean | CallType | CallStatus) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.caller_name || !formData.caller_number) {
      toast.error('Please fill in caller name and phone number');
      return;
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(formData.caller_number.replace(/[\s\-\(\)]/g, ''))) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    createCallMutation.mutate(formData);
  };

  const formatDurationInput = (seconds: number) => {
    if (seconds === 0) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const parseDurationInput = (value: string) => {
    if (!value) return 0;
    const parts = value.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    } else {
      // If just a number, treat as seconds
      return parseInt(value) || 0;
    }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PhoneIcon className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Log New Call</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={createCallMutation.isPending}
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Caller Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <UserIcon className="inline h-4 w-4 mr-1" />
                Caller Name *
              </label>
              <input
                type="text"
                value={formData.caller_name}
                onChange={(e) => handleInputChange('caller_name', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter caller name"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <PhoneIcon className="inline h-4 w-4 mr-1" />
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.caller_number}
                onChange={(e) => handleInputChange('caller_number', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>

            {/* Call Type and Status Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call Type
                </label>
                <select
                  value={formData.call_type}
                  onChange={(e) => handleInputChange('call_type', e.target.value as CallType)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={CallType.INBOUND}>Inbound</option>
                  <option value={CallType.OUTBOUND}>Outbound</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as CallStatus)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={CallStatus.ANSWERED}>Answered</option>
                  <option value={CallStatus.MISSED}>Missed</option>
                  <option value={CallStatus.BUSY}>Busy</option>
                  <option value={CallStatus.NO_ANSWER}>No Answer</option>
                </select>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <ClockIcon className="inline h-4 w-4 mr-1" />
                Duration (optional)
              </label>
              <input
                type="text"
                value={formatDurationInput(formData.duration_seconds)}
                onChange={(e) => handleInputChange('duration_seconds', parseDurationInput(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="5:30 or 330 (for seconds)"
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: MM:SS (e.g., 5:30) or just seconds (e.g., 330)
              </p>
            </div>

            {/* Important Flag */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="important"
                checked={formData.is_important}
                onChange={(e) => handleInputChange('is_important', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="important" className="ml-2 block text-sm text-gray-900">
                Mark as important
              </label>
            </div>

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
                placeholder="Add any additional notes about the call..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                disabled={createCallMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createCallMutation.isPending}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {createCallMutation.isPending ? 'Logging...' : 'Log Call'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LogCallModal;
