import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { teamService } from '../services/teamService';

const TeamContext = createContext(null);

/** Team roster shared by the assignee dropdowns, filters and the Team page. */
export function TeamProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(
    () =>
      teamService
        .members()
        .then((m) => {
          setMembers(m);
          setError(false);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ members, loading, error, refresh }), [members, loading, error, refresh]);
  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('useTeam must be used inside <TeamProvider>');
  return ctx;
}
