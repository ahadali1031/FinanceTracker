import { useColorScheme as useRNColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  const scheme = useRNColorScheme();
  if (scheme === 'light' || scheme === 'dark') return scheme;
  return 'dark';
}
