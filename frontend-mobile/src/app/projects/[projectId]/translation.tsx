import { useLocalSearchParams } from 'expo-router';
import { TranslationScreen } from '@/screens/TranslationScreen';

export default function TranslationRoute() {
  const { projectId, language } = useLocalSearchParams<{ projectId: string; language?: string }>();
  return <TranslationScreen projectId={projectId} language={language} />;
}
