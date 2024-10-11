import dynamic from 'next/dynamic';

const TranscriptionInterface = dynamic(
  () => import('@/components/transcription_interface'),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <TranscriptionInterface userId="some-user-id" />
    </main>
  );
}
