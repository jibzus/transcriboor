import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TranscriptionInterface from "@/components/transcription_interface";

export default async function ProtectedPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Welcome, {user.email}</h1>
      <TranscriptionInterface userId={user.id} />
    </div>
  );
}
