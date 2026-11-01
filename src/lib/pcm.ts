/** Decode any browser-playable audio (MP3 from /api/tts) to PCM16, 16 kHz, mono — the format Simli expects. */
export async function toPcm16k(blob: Blob): Promise<{ pcm: Uint8Array; seconds: number }> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const length = Math.ceil(decoded.duration * 16000);
    const offline = new OfflineAudioContext(1, length, 16000);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    const f32 = rendered.getChannelData(0);
    const out = new DataView(new ArrayBuffer(f32.length * 2));
    for (let i = 0; i < f32.length; i++) {
      const v = Math.max(-1, Math.min(1, f32[i]));
      out.setInt16(i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    }
    return { pcm: new Uint8Array(out.buffer), seconds: decoded.duration };
  } finally {
    void ctx.close();
  }
}

/** Split into ~6000-byte chunks (Simli's recommended size). */
export function* chunks(pcm: Uint8Array, size = 6000) {
  for (let i = 0; i < pcm.length; i += size) yield pcm.subarray(i, i + size);
}
