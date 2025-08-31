// AI-assisted: see ai-assist.md
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callsApi } from '../services/api';
import { CallStatus, CallType } from '../types';
import { 
  PhoneIcon, 
  ClockIcon, 
  UserIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LogCallModal from '../components/LogCallModal';
import EditCallModal from '../components/EditCallModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const CallsPage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<CallStatus | 'all'>('all');
  const [selectedType, setSelectedType] = useState<CallType | 'all'>('all');
  const [showImportantOnly, setShowImportantOnly] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch calls
  const { data: calls, isLoading } = useQuery({
    queryKey: ['calls', selectedStatus, selectedType, showImportantOnly],
    queryFn: () => callsApi.getCalls(
      0, 
      100, 
      undefined, 
      selectedType === 'all' ? undefined : selectedType,
      selectedStatus === 'all' ? undefined : selectedStatus,
      showImportantOnly || undefined
    ).then(res => res.data),
  });

  // Fetch call stats
  const { data: stats } = useQuery({
    queryKey: ['call-stats'],
    queryFn: () => callsApi.getCallStats().then(res => res.data),
  });

  // Delete call mutation
  const deleteCallMutation = useMutation({
    mutationFn: (id: number) => callsApi.deleteCall(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['call-stats'] });
      toast.success('Call deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete call');
    },
  });

  const handleDeleteCall = (call: any) => {
    setSelectedCall(call);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (selectedCall) {
      deleteCallMutation.mutate(selectedCall.id);
      setShowDeleteModal(false);
      setSelectedCall(null);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedCall(null);
  };

  const handleEditCall = (call: any) => {
    setSelectedCall(call);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedCall(null);
  };

  const getStatusColor = (status: CallStatus) => {
    const colors = {
      [CallStatus.ANSWERED]: 'bg-green-100 text-green-800',
      [CallStatus.MISSED]: 'bg-red-100 text-red-800',
      [CallStatus.BUSY]: 'bg-yellow-100 text-yellow-800',
      [CallStatus.NO_ANSWER]: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: CallStatus) => {
    switch (status) {
      case CallStatus.ANSWERED:
        return <CheckCircleIcon className="h-4 w-4" />;
      case CallStatus.MISSED:
        return <XCircleIcon className="h-4 w-4" />;
      case CallStatus.BUSY:
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <PhoneIcon className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: CallType) => {
    const colors = {
      [CallType.INBOUND]: 'text-blue-600',
      [CallType.OUTBOUND]: 'text-green-600',
    };
    return colors[type] || 'text-gray-600';
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Filter calls based on selected filters
  const filteredCalls = calls?.filter(call => {
    if (selectedStatus !== 'all' && call.status !== selectedStatus) return false;
    if (selectedType !== 'all' && call.call_type !== selectedType) return false;
    if (showImportantOnly && !call.is_important) return false;
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track and manage all your calls
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Log New Call
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PhoneIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Calls</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total_calls}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Answered</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.answered_calls}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Missed</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.missed_calls}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Answer Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.answer_rate.toFixed(1)}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as CallStatus | 'all')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value={CallStatus.ANSWERED}>Answered</option>
                <option value={CallStatus.MISSED}>Missed</option>
                <option value={CallStatus.BUSY}>Busy</option>
                <option value={CallStatus.NO_ANSWER}>No Answer</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as CallType | 'all')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Types</option>
                <option value={CallType.INBOUND}>Inbound</option>
                <option value={CallType.OUTBOUND}>Outbound</option>
              </select>
            </div>

            {/* Important Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="important"
                  checked={showImportantOnly}
                  onChange={(e) => setShowImportantOnly(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="important" className="ml-2 block text-sm text-gray-900">
                  Important only
                </label>
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-end">
              <span className="text-sm text-gray-500">
                {filteredCalls.length} of {calls?.length || 0} calls
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Calls List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredCalls.length === 0 ? (
          <div className="p-6 text-center">
            <PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No calls found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {calls?.length === 0 
                ? 'Get started by logging your first call.' 
                : 'Try adjusting your filters to see more results.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredCalls.map((call) => (
              <li key={call.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        call.call_type === CallType.INBOUND ? 'bg-blue-100' : 
                        call.call_type === CallType.OUTBOUND ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <PhoneIcon className={`h-5 w-5 ${getTypeColor(call.call_type)}`} />
                      </div>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {call.caller_name || 'Unknown Contact'}
                        </p>
                        {call.is_important && (
                          <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" title="Important" />
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                          {getStatusIcon(call.status)}
                          <span className="ml-1 capitalize">{call.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <UserIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
                          <span className="capitalize">{call.call_type.replace('_', ' ')}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
                          <span>{formatDateTime(call.created_at)}</span>
                        </div>
                        
                        {call.duration_seconds && (
                          <div className="flex items-center">
                            <span>Duration: {formatDuration(call.duration_seconds)}</span>
                          </div>
                        )}
                      </div>
                      
                      {call.notes && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {call.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditCall(call)}
                      className="text-primary-600 hover:text-primary-900"
                      title="Edit call"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCall(call)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete call"
                      disabled={deleteCallMutation.isPending}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Log New Call Modal */}
      <LogCallModal 
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
      />

      {/* Edit Call Modal */}
      <EditCallModal 
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        call={selectedCall}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal 
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Call"
        message={`Are you sure you want to delete the call with ${selectedCall?.caller_name || 'this caller'}? This action cannot be undone.`}
        confirmText="Delete Call"
        isLoading={deleteCallMutation.isPending}
      />
    </div>
  );
};

export default CallsPage;
