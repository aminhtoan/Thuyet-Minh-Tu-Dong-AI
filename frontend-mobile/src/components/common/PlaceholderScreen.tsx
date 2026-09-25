import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

type NavigationLink = {
  href: Href;
  label: string;
};

type PlaceholderScreenProps = {
  title: string;
  links?: readonly NavigationLink[];
};

export function PlaceholderScreen({ title, links = [] }: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{title} screen will be implemented in a later sprint.</Text>
      {links.map((link) => (
        <Link key={link.label} href={link.href} style={styles.link}>
          {link.label}
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f6f8fb',
  },
  title: {
    color: '#155eef',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    marginTop: 12,
    marginBottom: 20,
    color: '#526079',
    fontSize: 16,
    textAlign: 'center',
  },
  link: {
    marginTop: 10,
    color: '#155eef',
    fontSize: 16,
  },
});
