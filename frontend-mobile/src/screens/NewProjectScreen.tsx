import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileScreen } from '@/components/layout/MobileScreen';

export function NewProjectScreen() {
  return <View style={styles.container}><MobileHeader title="AI Narrator" /><MobileScreen title="Create New Project" description="Start by uploading a video or audio file."><Card><EmptyState title="Media upload is coming next" description="Upload functionality will be implemented in S5." action={<Button size="sm" variant="secondary" onPress={() => router.replace('/projects')}>Back to Projects</Button>} /></Card></MobileScreen></View>;
}

const styles = StyleSheet.create({ container: { flex: 1 } });
