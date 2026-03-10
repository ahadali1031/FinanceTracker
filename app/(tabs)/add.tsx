import { Redirect } from 'expo-router';

// This screen is never shown — the tab press is intercepted to show the action sheet.
// If somehow navigated to directly, redirect to dashboard.
export default function AddPlaceholder() {
  return <Redirect href="/" />;
}
