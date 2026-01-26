import { NextResponse } from 'next/server';
import { EdgeTTS } from 'node-edge-tts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

export const maxDuration = 30; // Attempt to increase Vercel timeout
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    let tempFilePath: string | null = null;
    try {
        const { text, voice = "en-US-AndrewNeural" } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // 1. Generate temp file path
        const fileName = `${randomUUID()}.mp3`;
        tempFilePath = path.join(os.tmpdir(), fileName);

        // 2. Synthesize to file (Neutrel Speed)
        const tts = new EdgeTTS({
            voice: voice
        });

        await tts.ttsPromise(text, tempFilePath);

        // 3. Read file
        if (!fs.existsSync(tempFilePath)) {
            throw new Error("Failed to generate audio file");
        }
        const audioBuffer = fs.readFileSync(tempFilePath);
        const audioBase64 = audioBuffer.toString('base64');

        // 4. Return
        return NextResponse.json({ 
            audio: audioBase64,
            marks: [] // Empty marks trigger Interpolation Mode in frontend
        });

    } catch (error: unknown) {
        console.error("TTS API Error:", error);
        
        let errorMessage = 'Internal Server Error';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else if (typeof error === 'object' && error !== null) {
            errorMessage = JSON.stringify(error);
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    } finally {
        // 5. Cleanup
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (e) {
                console.warn("Failed to delete temp file:", e);
            }
        }
    }
}
