// AI-assisted: see ai-assist.md
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { candidatesApi, interviewsApi, callsApi, auditLogsApi } from '../services/api';
import { format } from 'date-fns';
import {
  UserGroupIcon,
  CalendarIcon,
  PhoneIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  const { data: candidateStats, isLoading: candidateStatsLoading } = useQuery({
    queryKey: ['candidate-stats'],
    queryFn: () => candidatesApi.getCandidateStats().then(res => res.data),
  });

  const { data: interviewStats, isLoading: interviewStatsLoading } = useQuery({
    queryKey: ['interview-stats'],
    queryFn: () => interviewsApi.getInterviewStats().then(res => res.data),
  });

  const { data: callStats, isLoading: callStatsLoading } = useQuery({
    queryKey: ['call-stats'],
    queryFn: () => callsApi.getCallStats().then(res => res.data),
  });

  const { data: upcomingInterviews, isLoading: upcomingLoading } = useQuery({
    queryKey: ['upcoming-interviews'],
    queryFn: () => interviewsApi.getUpcomingInterviews(7, 5).then(res => res.data),
  });

  const { data: recentAuditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['recent-audit-logs'],
    queryFn: () => auditLogsApi.getRecentLogs(10).then(res => res.data),
  });

  const stats = [
    {
      name: 'Total Candidates',
      value: candidateStats?.total_candidates || 0,
      icon: UserGroupIcon,
      color: 'bg-blue-500',
      loading: candidateStatsLoading,
    },
    {
      name: 'Total Interviews',
      value: interviewStats?.total_interviews || 0,
      icon: CalendarIcon,
      color: 'bg-green-500',
      loading: interviewStatsLoading,
    },
    {
      name: 'Total Calls',
      value: callStats?.total_calls || 0,
      icon: PhoneIcon,
      color: 'bg-purple-500',
      loading: callStatsLoading,
    },
    {
      name: 'Answer Rate',
      value: `${Math.round(callStats?.answer_rate || 0)}%`,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      loading: callStatsLoading,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome to the User Management & Admin System
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} p-3 rounded-md`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.loading ? (
                        <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                      ) : (
                        stat.value
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Interviews */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Upcoming Interviews</h3>
          </div>
          <div className="p-6">
            {upcomingLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : upcomingInterviews && upcomingInterviews.length > 0 ? (
              <div className="space-y-4">
                {upcomingInterviews.map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {interview.candidate_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {interview.interview_type} with {interview.interviewer_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {format(new Date(interview.scheduled_at), 'MMM dd')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(interview.scheduled_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No upcoming interviews</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            {auditLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : recentAuditLogs && recentAuditLogs.length > 0 ? (
              <div className="space-y-4">
                {recentAuditLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{log.actor_name}</span>{' '}
                        {log.action.replace('_', ' ')}
                        {log.target_user_name && (
                          <span> for <span className="font-medium">{log.target_user_name}</span></span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Candidate Status Breakdown */}
      {candidateStats && (
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Candidate Status Overview</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(candidateStats.by_status).map(([status, count]) => (
                <div key={status} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-500 capitalize">
                    {status.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
