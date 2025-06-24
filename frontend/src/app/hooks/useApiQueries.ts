import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import type { CanvasElement } from './useElementData';

// Query Keys
export const queryKeys = {
  workspaces: ['workspaces'] as const,
  workspace: (id: string) => ['workspace', id] as const,
  workspaceProjects: (id: string) => ['workspace', id, 'projects'] as const,
  project: (id: string) => ['project', id] as const,
  projectElements: (id: string) => ['project', id, 'elements'] as const,
  pendingInvites: ['pendingInvites'] as const,
} as const;

// Workspaces Query
export const useWorkspacesQuery = () => {
  return useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: async () => {
      const data = await fetchApi('/api/workspaces');
      if (data.workspaces && Array.isArray(data.workspaces)) {
        return data.workspaces.map((workspace: any) => ({
          id: workspace.id,
          name: workspace.name,
          members: workspace.members?.map((member: any) => ({
            id: member.user.id,
            name: member.user.name,
            email: member.user.email,
            avatar: member.user.avatarUrl || '/api/placeholder/40/40',
          })) || [],
          memberCount: workspace._count?.members || workspace.members?.length || 1,
          boards: [],
        }));
      }
      return [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Workspace Projects Query
export const useWorkspaceProjectsQuery = (workspaceId: string) => {
  return useQuery({
    queryKey: queryKeys.workspaceProjects(workspaceId),
    queryFn: async () => {
      const data = await fetchApi(`/api/workspaces/${workspaceId}/projects`);
      if (data.success && data.projects) {
        return data.projects.map((project: any) => ({
          id: project.id,
          name: project.name,
          createdAt: new Date(project.createdAt).toISOString().split('T')[0],
          lastModified: formatLastModified(project.updatedAt),
        }));
      }
      return [];
    },
    enabled: !!workspaceId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Project Query
export const useProjectQuery = (projectId: string) => {
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: async () => {
      const data = await fetchApi(`/api/projects/${projectId}`);
      if (data.success && data.project) {
        return {
          ...data.project,
          workspace: data.project.workspace ? {
            ...data.project.workspace,
            members: data.project.workspace.members?.map((member: any) => ({
              id: member.user.id,
              name: member.user.name,
              email: member.user.email,
              avatar: member.user.avatarUrl || '/api/placeholder/32/32',
              isActive: member.user.isActive,
              lastLogin: member.user.lastLogin,
              activeSessions: member.user.sessions || [],
            })) || []
          } : null
        };
      }
      throw new Error(data.error || 'Failed to fetch project');
    },
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Project Elements Query
export const useProjectElementsQuery = (projectId: string) => {
  return useQuery({
    queryKey: queryKeys.projectElements(projectId),
    queryFn: async () => {
      const data = await fetchApi(`/api/projects/${projectId}/elements`);
      if (data.success) {
        return data.elements.map((element: any) => ({
          ...element,
          positionX: typeof element.positionX === 'string' 
            ? parseFloat(element.positionX) 
            : Number(element.positionX),
          positionY: typeof element.positionY === 'string'
            ? parseFloat(element.positionY)
            : Number(element.positionY),
          width: typeof element.width === 'string'
            ? parseFloat(element.width)
            : Number(element.width),
          height: typeof element.height === 'string'
            ? parseFloat(element.height)
            : Number(element.height),
        }));
      }
      throw new Error(data.error || 'Failed to fetch elements');
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 🔧 FIX: Increased to 5 minutes to prevent aggressive refetching that interferes with voting
    refetchOnWindowFocus: false, // 🔧 FIX: Prevent refetch on window focus that can interfere with interaction
  });
};

// Pending Invites Query
export const usePendingInvitesQuery = () => {
  return useQuery({
    queryKey: queryKeys.pendingInvites,
    queryFn: async () => {
      const data = await fetchApi('/api/workspaces/invites');
      return data.invites || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Mutations
export const useCreateWorkspaceMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ teamName, inviteEmails }: { teamName: string; inviteEmails: string[] }) => {
      return fetchApi('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: teamName, inviteEmails }),
      });
    },
    onSuccess: () => {
      // Invalidate and refetch workspaces
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
};

export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ workspaceId, name, template }: { 
      workspaceId: string; 
      name: string; 
      template: string; 
    }) => {
      return fetchApi(`/api/workspaces/${workspaceId}/projects`, {
        method: 'POST',
        body: JSON.stringify({ name, template }),
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate workspace projects
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.workspaceProjects(variables.workspaceId) 
      });
    },
  });
};

export const useUpdateElementMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ elementId, updates }: { 
      elementId: string; 
      updates: Partial<CanvasElement>; 
    }) => {
      return fetchApi(`/api/projects/${projectId}/elements/${elementId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      // Invalidate project elements
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projectElements(projectId) 
      });
    },
  });
};

export const useCreateElementMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (elementData: Partial<CanvasElement>) => {
      return fetchApi(`/api/projects/${projectId}/elements`, {
        method: 'POST',
        body: JSON.stringify(elementData),
      });
    },
    onSuccess: () => {
      // Invalidate project elements
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projectElements(projectId) 
      });
    },
  });
};

export const useDeleteElementMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (elementId: string) => {
      return fetchApi(`/api/projects/${projectId}/elements/${elementId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalidate project elements
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projectElements(projectId) 
      });
    },
  });
};

// Helper function
const formatLastModified = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
}; 