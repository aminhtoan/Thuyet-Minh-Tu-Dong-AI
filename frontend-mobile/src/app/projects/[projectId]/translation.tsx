import { useLocalSearchParams } from 'expo-router';
import { TranslationScreen } from '@/screens/TranslationScreen';

export default function TranslationRoute() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  return <TranslationScreen projectId={projectId} />;
}
