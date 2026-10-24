import { NewProjectScreen } from '@/screens/NewProjectScreen';

// One form instance owned by the tab navigator, retained while switching tabs.
export default function CreateNarrationTab() {
  return <NewProjectScreen withinTabs />;
}
