import { ProfileKnockView } from "@/components/ProfileKnockView";

// Root of the PWA: a short welcome mark + one directive line, then
// straight into the knock flow. No app explainer — just what to do.
export default function RootPage() {
  return <ProfileKnockView showWelcome />;
}
