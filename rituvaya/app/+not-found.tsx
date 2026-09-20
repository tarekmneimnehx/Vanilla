import { Redirect } from 'expo-router';

/** Unknown paths (bad deep links, or a hosted preview served under a sub-path) go home. */
export default function NotFound() {
  return <Redirect href="/" />;
}
