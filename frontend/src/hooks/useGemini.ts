import { useSimulationStore } from '../store/simulationStore';

export function useGemini() {
  const { geminiResponses, geminiThinking } = useSimulationStore();

  const latestResponse = geminiResponses.length > 0 ? geminiResponses[geminiResponses.length - 1] : null;
  const previousResponses = geminiResponses.slice(0, -1).reverse();

  return {
    latestResponse,
    previousResponses,
    isThinking: geminiThinking,
    responseCount: geminiResponses.length,
  };
}
