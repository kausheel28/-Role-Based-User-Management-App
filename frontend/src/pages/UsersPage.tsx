// AI-assisted: see ai-assist.md
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../services/api';
import { UserRole, PagePermission } from '../types';
import { 
  UserGroupIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface CreateUserForm {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
  active: boolean;
}

const UsersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserForm>({
    email: '',
    full_name: '',
    password: '',
    role: UserRole.VIEWER,
    active: true,
  });
  const queryClient = useQueryClient();
  
  const itemsPerPage = 10;

  // Define available page permissions
  const pagePermissions: PagePermission[] = [
    { name: 'dashboard', label: 'Dashboard', description: 'Access to main dashboard' },
    { name: 'interviews', label: 'Interviews', description: 'Manage interviews' },
    { name: 'candidates', label: 'Candidates', description: 'Manage candidates' },
    { name: 'calls', label: 'Calls', description: 'Manage calls' },
    { name: 'settings', label: 'Settings', description: 'Access settings' },
    { name: 'user_management', label: 'User Management', description: 'Manage users (Admin only)' },
  ];

  // Fetch users with permissions
  const { data: users, isLoading } = useQuery({
    queryKey: ['users', search, currentPage],
    queryFn: () => {
      const skip = (currentPage - 1) * itemsPerPage;
      return usersApi.getUsers(skip, itemsPerPage, search || undefined).then(res => res.data);
    },
  });

  // Permission toggle mutation
  const togglePermissionMutation = useMutation({
    mutationFn: ({ userId, pageName, hasAccess }: { 
      userId: number; 
      pageName: string; 
      hasAccess: boolean; 
    }) => usersApi.updateUserPageAccess(userId, pageName, hasAccess),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Permission ${variables.hasAccess ? 'granted' : 'revoked'} successfully`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update permission');
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: CreateUserForm) => usersApi.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      setShowAddModal(false);
      setNewUser({
        email: '',
        full_name: '',
        password: '',
        role: UserRole.VIEWER,
        active: true,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    },
  });

  const handlePermissionToggle = (userId: number, pageName: string, currentAccess: boolean) => {
    togglePermissionMutation.mutate({
      userId,
      pageName,
      hasAccess: !currentAccess,
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.full_name || !newUser.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleInputChange = (field: keyof CreateUserForm, value: string | boolean | UserRole) => {
    setNewUser(prev => ({ ...prev, [field]: value }));
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const getRoleColor = (role: UserRole) => {
    const colors = {
      [UserRole.ADMIN]: 'bg-red-100 text-red-800',
      [UserRole.MANAGER]: 'bg-blue-100 text-blue-800',
      [UserRole.AGENT]: 'bg-green-100 text-green-800',
      [UserRole.VIEWER]: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const PermissionToggle: React.FC<{
    userId: number;
    pageName: string;
    hasAccess: boolean;
    disabled?: boolean;
  }> = ({ userId, pageName, hasAccess, disabled = false }) => {
    const isLoading = togglePermissionMutation.isPending;

    return (
      <button
        onClick={() => handlePermissionToggle(userId, pageName, hasAccess)}
        disabled={disabled || isLoading}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          ${hasAccess ? 'bg-primary-600' : 'bg-gray-200'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
            transition duration-200 ease-in-out
            ${hasAccess ? 'translate-x-5' : 'translate-x-0'}
          `}
        >
          {hasAccess ? (
            <CheckIcon className="h-3 w-3 text-primary-600 mt-1 ml-1" />
          ) : (
            <XMarkIcon className="h-3 w-3 text-gray-400 mt-1 ml-1" />
          )}
        </span>
      </button>
    );
  };

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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage users and their page permissions
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add User
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="max-w-md">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {pagePermissions.map((permission) => (
                  <th
                    key={permission.name}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    title={permission.description}
                  >
                    {permission.label}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <UserGroupIcon className="h-6 w-6 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {pagePermissions.map((permission) => (
                    <td key={permission.name} className="px-3 py-4 whitespace-nowrap text-center">
                      <PermissionToggle
                        userId={user.id}
                        pageName={permission.name}
                        hasAccess={(user.page_permissions || {})[permission.name] || false}
                        disabled={
                          // Disable user_management toggle for non-admin roles
                          permission.name === 'user_management' && user.role !== UserRole.ADMIN
                        }
                      />
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit user"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900"
                        title="Delete user"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!users || users.length === 0 ? (
          <div className="p-6 text-center">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search ? 'Try adjusting your search criteria.' : 'Get started by adding a new user.'}
            </p>
          </div>
        ) : null}
      </div>

      {/* Pagination */}
      {users && users.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {currentPage} (up to {itemsPerPage} users per page)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-gray-700">
              Page {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!users || users.length < itemsPerPage}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Permission Legend */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Permission Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pagePermissions.map((permission) => (
            <div key={permission.name} className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span className="text-sm text-gray-700">
                <strong>{permission.label}:</strong> {permission.description}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <strong>Note:</strong> User Management access is restricted to Admin users only. 
          Toggle switches update permissions in real-time.
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New User</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Password *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={UserRole.VIEWER}>Viewer</option>
                    <option value={UserRole.AGENT}>Agent</option>
                    <option value={UserRole.MANAGER}>Manager</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={newUser.active}
                    onChange={(e) => handleInputChange('active', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                    Active User
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
