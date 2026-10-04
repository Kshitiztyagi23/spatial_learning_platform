import { useNavigate } from 'react-router-dom';
import { useSessionContext, useSessionDispatch } from './SessionContext';
import { getNextStage } from '../api/sessions';
import { STAGE_ROUTES, Stage } from './stages';

export function useNextStage() {
  const navigate = useNavigate();
  const { sessionId } = useSessionContext();
  const setSession = useSessionDispatch();

  const proceed = async () => {
    if (!sessionId) return;
    try {
      const next = await getNextStage(sessionId);
      setSession({ currentStage: next.stage_name });
      const route = STAGE_ROUTES[next.stage_name as Stage];
      if (route) {
        navigate(route);
      } else {
        console.error(`Unknown route for stage: ${next.stage_name}`);
      }
    } catch (err) {
      console.error('Error fetching next stage:', err);
    }
  };

  return { proceed };
}
