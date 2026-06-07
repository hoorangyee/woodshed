import { NextResponse } from "next/server";
import OpenAI from "openai";
import { currentUser } from "@/lib/auth/current-user";
import { sanitizeTab } from "@/lib/tab/ai-import";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const SYSTEM = `You read an image of guitar tablature (TAB) and output JSON: a FLAT list of notes.

Strings:
- A TAB has 6 horizontal lines. The TOP line is the highest-pitched string; the BOTTOM line is the lowest.
- "string" index: 0 = lowest (low E) [bottom line], 1 = A, 2 = D, 3 = G, 4 = B, 5 = highest (high e) [top line].

For EVERY fret number in the image, output one note { string, fret, artic, x }:
- "fret" = the number written on the line (0-24).
- "x" = the note's HORIZONTAL position across the TAB, scaled 0 (far left) to 1000 (far right). Measure it carefully from the image — this is what determines timing and rhythm. Keep x proportional to the real spacing, so wide gaps (rests/pauses) produce large jumps in x and tightly grouped notes have close x values.
- Notes that sound at the SAME time (a chord — numbers stacked vertically at the same horizontal spot) MUST share the same x.
- "artic": a symbol attached to the number — h = hammer-on, p = pull-off, / = slide up, \\\\ = slide down, b = full bend, b½ = half/partial bend, ~ = vibrato. If none, "".

Also return "tuning": the 6 string labels low→high if shown on the left, otherwise ["E","A","D","G","B","e"].

Ignore bar lines, dashes and decorations — emit only real fret numbers. List notes left to right. If there is no readable TAB, return an empty notes array.`;

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

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 4000,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Convert this guitar TAB image to JSON using the schema." },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "guitar_tab", strict: true, schema: SCHEMA },
      },
    });
    const content = completion.choices[0]?.message?.content ?? "{}";
    return NextResponse.json(sanitizeTab(JSON.parse(content)));
  } catch {
    return NextResponse.json({ error: "Conversion failed. Try a clearer image." }, { status: 502 });
  }
}
