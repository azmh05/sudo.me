import { ProfileManager } from "@/components/profile/ProfileManager";
import { PageHeader } from "@/components/ui";
import { getProfile } from "@/lib/profile";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { info, entries, photos } = await getProfile();
  return (
    <>
      <PageHeader title="Profile" description="Your details, education, experience, skills and achievements." />
      <ProfileManager info={info} entries={entries} photos={photos} />
    </>
  );
}
