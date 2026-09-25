import { useLocalSearchParams } from 'expo-router';
import { GenerateScreen } from '@/screens/GenerateScreen';

export default function GenerateRoute() {
  const { projectId, language } = useLocalSearchParams<{ projectId: string; language?: string }>();
  return <GenerateScreen projectId={projectId} language={language} />;
}
