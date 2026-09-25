import { useLocalSearchParams } from 'expo-router';
import { TranscriptScreen } from '@/screens/TranscriptScreen';

export default function TranscriptRoute() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  return <TranscriptScreen projectId={projectId} />;
}
