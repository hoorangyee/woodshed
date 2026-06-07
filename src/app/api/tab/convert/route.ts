import { NextResponse } from "next/server";
import OpenAI from "openai";
import { currentUser } from "@/lib/auth/current-user";
import { sanitizeTab } from "@/lib/tab/ai-import";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const SYSTEM = `You are an expert at reading guitar TAB (tablature) from an image and transcribing it to JSON. Accuracy matters more than speed. Transcribe ONLY what is clearly written — never invent notes; when unsure, omit.

WHAT TAB LOOKS LIKE
- 6 horizontal lines = the 6 strings. A number on a line means "press that fret on that string". Dashes (-) are only spacing; lines may be solid or dashed.
- The TOP line is the highest-pitched string (thin high e); the BOTTOM line is the lowest (thick low E). String labels (e B G D A E, top→bottom) are often printed at the far left.

READING PROCEDURE — follow in order
1. Find the 6 string lines. If labels are printed, use them. Map each line to a "string" index:
   0 = lowest/thickest string (low E, BOTTOM line), 1 = A, 2 = D, 3 = G, 4 = B, 5 = highest/thinnest (high e, TOP line).
   (So the bottom line → 0 and the top line → 5. Double-check which line each number sits on.)
2. Scan LEFT to RIGHT. Create one note for every fret number.
3. Read multi-digit numbers as ONE value: "12" is twelve, "14" is fourteen (frets are 0–24).
4. Numbers stacked vertically at the same horizontal spot are a chord → give them the SAME x.

EACH NOTE = { string, fret, artic, x }
- string: 0–5 from step 1.
- fret: the number, 0–24.
- x: horizontal position, 0 (far left) to 1000 (far right), proportional to where the number sits. This is the ONLY timing signal: evenly spaced numbers ≈ even x steps; a noticeably wide horizontal gap ≈ a big x jump (a pause/rest); notes at the same instant share x. Estimate x carefully.
- artic: the playing technique on that note, mapped to exactly ONE code:
    "h"  = hammer-on  (letter h between numbers, or a slur/arc up to a higher fret)
    "p"  = pull-off   (letter p, or a slur/arc down to a lower fret)
    "/"  = slide up   ("/", "s", or a diagonal line rising into the next number)
    "\\" = slide down ("\\", or a diagonal line falling into the next number)
    "b"  = full bend  ("b", "full", or an upward arrow ↗ of a whole step)
    "b½" = partial bend ("½", "1/2", "1/4", "b½", quarter/half bend)
    "~"  = vibrato    ("~", "~~~", "v", or a wavy line over the number)
    ""   = no technique
  A slide / hammer / pull / bend symbol belongs to the note it STARTS from (the left/origin number). Map any technique we don't list (tap, harmonic, release, etc.) to "".

tuning: the 6 open-string notes, low→high. Use printed labels if shown; otherwise ["E","A","D","G","B","e"].

IGNORE: bar lines (|), dashes, repeat signs, rhythm slashes/stems, fingering circles, "PM"/palm-mute brackets, chord names, lyrics, and anything that is not a fret number.

If the image is not tablature or has no readable numbers, return an empty notes array and standard tuning.

FORMAT EXAMPLE (illustrates indexing, articulation and x — your real input is an image)
TAB reading left→right: fret 5 on the D string, then fret 7 on the G string with a bend, then fret 7 on the D string →
{"tuning":["E","A","D","G","B","e"],"notes":[
  {"string":2,"fret":5,"artic":"","x":120},
  {"string":3,"fret":7,"artic":"b","x":480},
  {"string":2,"fret":7,"artic":"","x":820}
]}`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tuning", "notes"],
  properties: {
    tuning: { type: "array", items: { type: "string" } },
    notes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["string", "fret", "artic", "x"],
        properties: {
          string: { type: "integer" },
          fret: { type: "integer" },
          artic: { type: "string", enum: ["", "h", "p", "/", "\\", "b", "b½", "~"] },
          x: { type: "integer" },
        },
      },
    },
  },
} as const;

export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Conversion is not configured." }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "No image." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image too large (max 5MB)." }, { status: 400 });
  if (!IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }

  const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  // GPT-5 / o-series reasoning models: use max_completion_tokens (not max_tokens) + lighter reasoning.
  const isReasoning = /^(gpt-5|o\d)/i.test(model);
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model,
      max_completion_tokens: 8000,
      ...(isReasoning ? { reasoning_effort: "minimal" as const } : {}),
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe this guitar TAB image. Read left→right, put each number on the correct string (bottom line = 0/low E, top line = 5/high e), read multi-digit frets as one number, capture articulations, and estimate each note's x (0–1000) for timing.",
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "guitar_tab", strict: true, schema: SCHEMA },
      },
    });
    const content = completion.choices[0]?.message?.content?.trim() || "{}";
    return NextResponse.json(sanitizeTab(JSON.parse(content)));
  } catch (e) {
    console.error("tab convert failed:", e);
    const detail = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json(
      { error: "Conversion failed. Try a clearer image.", detail },
      { status: 502 },
    );
  }
}
