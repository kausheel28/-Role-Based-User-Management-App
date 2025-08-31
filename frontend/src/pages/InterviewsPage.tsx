// AI-assisted: see ai-assist.md
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interviewsApi } from '../services/api';
import { InterviewStatus } from '../types';
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import ScheduleInterviewModal from '../components/ScheduleInterviewModal';
import EditInterviewModal from '../components/EditInterviewModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const InterviewsPage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<InterviewStatus | 'all'>('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch interviews
  const { data: interviews, isLoading } = useQuery({
    queryKey: ['interviews'],
    queryFn: () => interviewsApi.getInterviews().then(res => res.data),
  });

  // Delete interview mutation
  const deleteInterviewMutation = useMutation({
    mutationFn: (id: number) => interviewsApi.deleteInterview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast.success('Interview deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete interview');
    },
  });

  const handleDeleteInterview = (interview: any) => {
    setSelectedInterview(interview);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (selectedInterview) {
      deleteInterviewMutation.mutate(selectedInterview.id);
      setShowDeleteModal(false);
      setSelectedInterview(null);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedInterview(null);
  };

  const handleEditInterview = (interview: any) => {
    setSelectedInterview(interview);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedInterview(null);
  };

  const getStatusColor = (status: InterviewStatus) => {
    const colors = {
      [InterviewStatus.SCHEDULED]: 'bg-blue-100 text-blue-800',
      [InterviewStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
      [InterviewStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [InterviewStatus.CANCELLED]: 'bg-red-100 text-red-800',
      [InterviewStatus.NO_SHOW]: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: InterviewStatus) => {
    switch (status) {
      case InterviewStatus.SCHEDULED:
        return <CalendarIcon className="h-4 w-4" />;
      case InterviewStatus.IN_PROGRESS:
        return <ClockIcon className="h-4 w-4" />;
      case InterviewStatus.COMPLETED:
        return <CheckCircleIcon className="h-4 w-4" />;
      case InterviewStatus.CANCELLED:
      case InterviewStatus.NO_SHOW:
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return <ClipboardDocumentListIcon className="h-4 w-4" />;
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredInterviews = interviews?.filter(interview => 
    selectedStatus === 'all' || interview.status === selectedStatus
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage and track interview sessions
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Schedule Interview
          </button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              selectedStatus === 'all'
                ? 'bg-primary-100 text-primary-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({interviews?.length || 0})
          </button>
          {Object.values(InterviewStatus).map((status) => {
            const count = interviews?.filter(i => i.status === status).length || 0;
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-2 rounded-md text-sm font-medium capitalize ${
                  selectedStatus === status
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.replace('_', ' ')} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Interviews Grid */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {!filteredInterviews || filteredInterviews.length === 0 ? (
          <div className="p-6 text-center">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No interviews found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedStatus === 'all' 
                ? 'Get started by scheduling a new interview.' 
                : `No interviews with status "${selectedStatus}".`}
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowScheduleModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Schedule Interview
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredInterviews.map((interview) => (
              <li key={interview.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            Interview with {interview.candidate_name || 'Unknown Candidate'}
                          </p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                            {getStatusIcon(interview.status)}
                            <span className="ml-1 capitalize">{interview.status.replace('_', ' ')}</span>
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <CalendarIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
                          <span>{formatDateTime(interview.scheduled_at)}</span>
                          {interview.duration_minutes && (
                            <>
                              <span className="mx-2">•</span>
                              <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
                              <span>{interview.duration_minutes} minutes</span>
                            </>
                          )}
                        </div>
                        {interview.interview_type && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                              {interview.interview_type}
                            </span>
                          </div>
                        )}
                        {interview.notes && (
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {interview.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditInterview(interview)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit interview"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteInterview(interview)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete interview"
                        disabled={deleteInterviewMutation.isPending}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick Stats */}
      {interviews && interviews.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Interviews</dt>
                    <dd className="text-lg font-medium text-gray-900">{interviews.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Scheduled</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {interviews.filter(i => i.status === InterviewStatus.SCHEDULED).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {interviews.filter(i => i.status === InterviewStatus.COMPLETED).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Cancelled</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {interviews.filter(i => i.status === InterviewStatus.CANCELLED).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal 
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
      />

      {/* Edit Interview Modal */}
      <EditInterviewModal 
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        interview={selectedInterview}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal 
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Interview"
        message={`Are you sure you want to delete the interview with ${selectedInterview?.candidate_name || 'this candidate'}? This action cannot be undone.`}
        confirmText="Delete Interview"
        isLoading={deleteInterviewMutation.isPending}
      />
    </div>
  );
};

export default InterviewsPage;
