import { NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export async function POST(req: Request) {
    try {
        const { text, rate = 0, pitch = 0, voice = "en-US-AndrewNeural" } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const tts = new MsEdgeTTS();
        
        // Connect to the service
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        // Calculate rate string (e.g. "+50%")
        const rateStr = rate >= 0 ? `+${Math.round(rate)}%` : `${Math.round(rate)}%`;
        const pitchStr = pitch >= 0 ? `+${Math.round(pitch)}Hz` : `${Math.round(pitch)}Hz`;
        
        // We need to capture both audio and metadata (timestamps)
        // msedge-tts provides a way to get streams.
        // We will collect the stream into a buffer and parse metadata events if available in the stream or use a method that returns them.
        // The standard 'toStream' method for this library simply writes the audio.
        // HOWEVER, we need strict alignment. 
        // NOTE: The `msedge-tts` library documentation suggests it primarily outputs audio. 
        // We need to check if it supports SSML with 'word boundaries' or if we need a different approach.
        // Actually, Edge TTS WebSocket protocol DOES modify metadata.
        // Let's rely on standard generation for now and see if we can get pure audio.
        // IF we cannot get exact timestamps easily via this wrapper, we might have to infer or use `edge-tts-universal` which might expose them 
        // But for now, let's just get the AUDIO running which is high quality.
        // WAIT: The user request specifically mentioned "Alignment" and "Word Boundary".
        // Use a known method: The WebSocket returns JSON metadata with audio chunks.
        // Let's stick to generating the high-quality audio first.
        // If exact timestamps are missing from this specific wrapper, we will rely on duration/word estimation 
        // OR better: switch to `edge-tts-universal` if that search result was more promising for metadata?
        // Let's implement the basic audio fetch first.

        const readable = tts.toStream(text, {
            rate: rateStr,
            pitch: pitchStr
        });

        const chunks: Uint8Array[] = [];
        // @ts-ignore - Readable streams are async iterable in modern Node, but TS might complain depending on types
        for await (const chunk of readable) {
            chunks.push(chunk);
        }

        const audioBuffer = Buffer.concat(chunks);
        const audioBase64 = audioBuffer.toString('base64');
        
        // Mock alignment for now if library doesn't expose it easily (100% linear distribution)
        // In a real "Karaoke" implementation, we'd parse the SSML result.
        // IMPORTANT: For the "Karaoke Pattern" to work perfectly, we NEED timestamps.
        // If this library doesn't give them, we might be stuck with "Estimate".
        // But Edge TTS DOES output them.
        // We'll return just the audio for now to prove the pipe works.

        return NextResponse.json({ 
            audio: audioBase64,
            alignment: null // Todo: Implement true metadata parsing
        });

    } catch (error: any) {
        console.error("TTS API Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
