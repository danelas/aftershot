// Soundtrack library for the Studio. Tracks are the same Pixabay-licensed
// files the render worker uses (public/music, credits in CREDITS.md) — free
// for commercial use, no attribution, safe for customers to repost publicly.

export type StudioTrack = {
  id: string;
  label: string;
  /** One-word mood, shown under the label. */
  mood: string;
  /** Public path, served from /public. */
  src: string;
};

export const STUDIO_TRACKS: StudioTrack[] = [
  { id: "uplift", label: "Uplift", mood: "Warm · feel-good", src: "/music/uplift.mp3" },
  { id: "energy", label: "Energy", mood: "Punchy · hype", src: "/music/energy.mp3" },
  { id: "pop", label: "Pop", mood: "Happy · catchy", src: "/music/pop.mp3" },
  { id: "hiphop", label: "Hip-Hop", mood: "Urban · confident", src: "/music/hiphop.mp3" },
  { id: "sport", label: "Sport", mood: "Driving · workout", src: "/music/sport.mp3" },
  { id: "epic", label: "Epic", mood: "Dramatic · bold", src: "/music/epic.mp3" },
];

// The music the render should mix in. `src` is a public path or an uploaded
// file's object URL; `volume` is 0..1; `muteOriginal` drops the clip's own
// audio so the track plays alone (good for silent clips).
export type StudioMusic = {
  src: string;
  label: string;
  volume: number;
  muteOriginal: boolean;
};

export const MUSIC_VOLUME_DEFAULT = 0.65;
