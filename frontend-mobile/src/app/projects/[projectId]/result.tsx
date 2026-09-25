import { useLocalSearchParams } from 'expo-router';
import { ResultScreen } from '@/screens/ResultScreen';
export default function ResultRoute() {
  const { projectId, language } = useLocalSearchParams<{ projectId: string; language?: string }>();
  return <ResultScreen projectId={projectId} language={language} />;
}
