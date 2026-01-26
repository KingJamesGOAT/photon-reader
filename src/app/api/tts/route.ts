import { NextResponse } from 'next/server';
import { EdgeTTS } from 'edge-tts-universal';

interface Subtitle {
    offset: number;
    duration: number;
    text: string;
}

export async function POST(req: Request) {
    try {
        const { text, voice = "en-US-AndrewNeural", rate = 0 } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Rate format: "+0%", "-10%", etc.
        const rateStr = rate >= 0 ? `+${Math.round(rate)}%` : `${Math.round(rate)}%`;

        // Create the TTS instance with (text, voice, options)
        const tts = new EdgeTTS(text, voice, {
            rate: rateStr
        });

        // Synthesize the audio
        const result = await tts.synthesize();

        // Map subtitles to marks
        // Subtitles come as: { offset: number (ns), duration: number (ns), text: string }
        const marks = (result.subtitle || []).map((sub: Subtitle) => ({
            word: sub.text,
            start: sub.offset / 10_000_000, // Convert 100ns units to seconds
            end: (sub.offset + sub.duration) / 10_000_000
        }));

        // result.audio is a Blob, convert to Buffer/Base64
        const arrayBuffer = await result.audio.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);
        const audioBase64 = audioBuffer.toString('base64');

        return NextResponse.json({ 
            audio: audioBase64,
            marks: marks
        });

    } catch (error: unknown) {
        console.error("TTS API Error:", error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
