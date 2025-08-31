// AI-assisted: see ai-assist.md
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidatesApi } from '../services/api';
import { Candidate, CandidateStatus } from '../types';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import CandidateModal from '../components/CandidateModal';

const CandidatesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const queryClient = useQueryClient();

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['candidates', search],
    queryFn: () => candidatesApi.getCandidates(0, 100, search || undefined).then(res => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: candidatesApi.deleteCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Candidate deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete candidate');
    },
  });

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setIsModalOpen(true);
  };

  const handleDelete = async (candidateId: number) => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      deleteMutation.mutate(candidateId);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCandidate(null);
  };

  const getStatusColor = (status: CandidateStatus) => {
    const colors = {
      [CandidateStatus.NEW]: 'bg-gray-100 text-gray-800',
      [CandidateStatus.SCREENING]: 'bg-blue-100 text-blue-800',
      [CandidateStatus.INTERVIEWING]: 'bg-yellow-100 text-yellow-800',
      [CandidateStatus.OFFER]: 'bg-purple-100 text-purple-800',
      [CandidateStatus.HIRED]: 'bg-green-100 text-green-800',
      [CandidateStatus.REJECTED]: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage candidate information and track their progress
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Candidate
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search candidates by name, email, or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Candidates Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : candidates && candidates.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {candidates.map((candidate) => (
              <li key={candidate.id}>
                <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700">
                          {candidate.full_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {candidate.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {candidate.email} • {candidate.position}
                      </div>
                      {candidate.phone && (
                        <div className="text-sm text-gray-500">{candidate.phone}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}>
                      {candidate.status.replace('_', ' ')}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(candidate)}
                        className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(candidate.id)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">No candidates found</p>
          </div>
        )}
      </div>

      {/* Candidate Modal */}
      <CandidateModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        candidate={editingCandidate}
      />
    </div>
  );
};

export default CandidatesPage;
