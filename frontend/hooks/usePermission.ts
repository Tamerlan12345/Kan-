import { useUser } from '@/lib/hooks/useUser';

const ROLE_HIERARCHY = {
  observer: 0,
  junior: 1,
  middle: 2,
  senior: 3,
  team_lead: 4,
  admin: 5
};

export const usePermission = () => {
  const { userProfile, loading } = useUser();
  const userRole = userProfile?.role || 'observer';
  const userLevel = ROLE_HIERARCHY[userRole];

  return {
    canDeleteTask: userLevel >= 4, // Team Lead+
    canMoveTask: userLevel >= 1,   // Junior+
    canViewAnalytics: userLevel >= 4, // Team Lead+ (Admin/Team Lead)
    canAssignUsers: userLevel >= 3, // Senior+
    role: userRole,
    loading
  };
};
