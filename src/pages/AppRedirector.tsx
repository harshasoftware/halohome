import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/hooks/useAuth-context';

const USER_PROJECT_ID_KEY = 'familyTreeCurrentProjectId';

const AppRedirector = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return; // Wait until auth status is resolved
    }

    if (user) {
      // Logged-in user: redirect to their last known project or a new temp one.
      // `useTreeData` will handle loading the correct project from the backend.
      let projectId = localStorage.getItem(USER_PROJECT_ID_KEY);
      if (!projectId) {
        // This is a temp ID to satisfy the route. It won't be saved and
        // the `useTreeData` hook will load/create a proper project for the user.
        projectId = uuidv4();
      }
      navigate(`/project/${projectId}`);
    } else {
      // Guest user: redirect to a persistent guest page.
      navigate('/guest');
    }
  }, [user, loading, navigate]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      Preparing your family workspace...
    </div>
  );
};

export default AppRedirector; 