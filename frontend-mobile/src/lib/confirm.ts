import { Alert } from 'react-native';
export const confirmAction = (title: string, message: string) => new Promise<boolean>((resolve) => Alert.alert(title, message, [{ text: 'Hủy', style: 'cancel', onPress: () => resolve(false) }, { text: 'Tiếp tục', onPress: () => resolve(true) }], { cancelable: true, onDismiss: () => resolve(false) }));
