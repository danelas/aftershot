import {NextResponse} from 'next/server';

// Whisper transcription stub. AfterShot reels are music-only (no speech), so
// there's nothing to transcribe yet — the Studio's caption button gets a clean
// "no speech" answer instead of a 404. Wire whisper-1 here (see PeekScout's
// /api/videos/captions) if reels ever carry voiceover.
export async function POST() {
  return NextResponse.json({ok: false, reason: 'no_speech', segments: []});
}
