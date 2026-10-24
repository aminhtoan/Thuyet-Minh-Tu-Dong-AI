import { Redirect } from 'expo-router';

// Preserve all existing /projects/new links without rendering a second form.
export default function NewProjectCompatibilityRoute() {
  return <Redirect href="/(tabs)/create" />;
}
