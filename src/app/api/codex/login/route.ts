import { NextResponse } from "next/server";
import { startCodexDeviceLogin } from "@/lib/ai/codex";

export const runtime = "nodejs";

export async function POST() {
  try {
    const login = await startCodexDeviceLogin();

    return NextResponse.json({
      success: true,
      authUrl: login.authUrl,
      code: login.code,
      message: "Open the link and enter the device code to finish Codex login.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Codex 登录启动失败";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
