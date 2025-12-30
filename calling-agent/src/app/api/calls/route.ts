import { NextResponse } from "next/server";
import { CallRequestSchema } from "@/lib/call-validator";
import { CALL_TEMPLATES } from "@/lib/call-templates";
import { buildCallTwiml } from "@/lib/call-script";
import { getTwilioClient, hasTwilioCredentials } from "@/lib/twilio";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = CallRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid call configuration",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const template = CALL_TEMPLATES.find(
      (item) => item.id === data.templateId,
    );

    if (!template) {
      return NextResponse.json(
        { error: "Unknown template" },
        { status: 404 },
      );
    }

    const twiml = buildCallTwiml({
      style: data.style,
      template,
      variables: data.variables,
      voice: data.voice,
      language: data.language,
    });

    if (!hasTwilioCredentials()) {
      return NextResponse.json(
        {
          sid: `SIM-${Date.now()}`,
          status: "queued",
          simulated: true,
          twiml,
          message:
            "Call simulation complete (Twilio credentials not configured).",
        },
        { status: 200 },
      );
    }

    const client = getTwilioClient();
    const call = await client.calls.create({
      to: data.to,
      from: process.env.TWILIO_CALLER_ID!,
      twiml,
    });

    return NextResponse.json(
      {
        sid: call.sid,
        status: call.status,
        simulated: false,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Call creation failed:", error);
    return NextResponse.json(
      {
        error: "Unable to place call",
        details:
          error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
