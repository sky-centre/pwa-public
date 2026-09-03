"use client";

import { useParams } from "next/navigation";
import { ProfileKnockView } from "@/components/ProfileKnockView";

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  return <ProfileKnockView username={username} />;
}
