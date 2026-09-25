import { useLocalSearchParams } from 'expo-router';
import { VoiceScreen } from '@/screens/VoiceScreen';

export default function VoiceRoute() {
  const { projectId, language } = useLocalSearchParams<{ projectId: string; language?: string }>();
  return <VoiceScreen projectId={projectId} language={language} />;
}
