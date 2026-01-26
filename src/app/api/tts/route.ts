import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';

export async function POST(req: Request) {
    try {
        const { text, voice = "en-US-AndrewNeural", rate = 0 } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Create the TTS communication instance
        // Rate format: "+0%", "-10%", etc.
        const rateStr = rate >= 0 ? `+${Math.round(rate)}%` : `${Math.round(rate)}%`;
        const communicate = new Communicate(text, { 
            voice, 
            rate: rateStr 
        });

        const audioChunks: Buffer[] = [];
        const marks: { word: string; start: number; end: number }[] = [];

        // Stream the response and separate Audio from Metadata
        for await (const chunk of communicate.stream()) {
            if (chunk.type === 'audio' && chunk.data) {
                // Collect audio bytes
                audioChunks.push(Buffer.from(chunk.data));
            } else if (chunk.type === 'WordBoundary') {
                // Collect synchronization data
                // chunk contains: { offset: number (ns), duration: number (ns), text: string }
                // Convert nanoseconds to seconds for easier frontend use
                marks.push({
                    word: chunk.text || "",
                    start: (chunk.offset ?? 0) / 10_000_000, // 100ns units to seconds
                    end: ((chunk.offset ?? 0) + (chunk.duration ?? 0)) / 10_000_000
                });
            }
        }

        // Combine all audio chunks
        const audioBuffer = Buffer.concat(audioChunks);
        const audioBase64 = audioBuffer.toString('base64');

        return NextResponse.json({ 
            audio: audioBase64,
            marks: marks // <--- The magic data you were missing
        });

    } catch (error: unknown) {
        console.error("TTS API Error:", error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
