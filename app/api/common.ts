import { NextRequest, NextResponse } from "next/server";

export const OPENAI_URL = "api.openai.com";
const DEFAULT_PROTOCOL = "https";
const PROTOCOL = process.env.PROTOCOL ?? DEFAULT_PROTOCOL;
const BASE_URL = process.env.BASE_URL ?? OPENAI_URL;
const DISABLE_GPT4 = !!process.env.DISABLE_GPT4;
const AZURE_URL =
  process.env.AZURE_URL && process.env.AZURE_URL.length !== 0
    ? process.env.AZURE_URL
    : BASE_URL;
const AZURE_KEY = process.env.AZURE_KEY ?? "";
const GPT_4_BASE_URL: string = process.env.GPT_4_BASE_URL ?? OPENAI_URL;
const GPT_4_KEY: string = process.env.GPT_4_KEY ?? "";

export async function requestOpenai(req: NextRequest) {
  const controller = new AbortController();
  const authValue = req.headers.get("Authorization") ?? "";
  const openaiPath = `${req.nextUrl.pathname}${req.nextUrl.search}`.replaceAll(
    "/api/openai/",
    "",
  );

  let org_id: string = "";
  if (process.env.OPENAI_ORG_ID) {
    org_id = process.env.OPENAI_ORG_ID;
    // console.log("[Org ID]", process.env.OPENAI_ORG_ID);
  }

  // 这里判断如果是gpt4的请求才使用组织ID，否则使用默认组织ID

  // 生成一个变量来判断当前使用的模型是：
  const clonedBody = await req.text();
  console.log("【本次消息】", clonedBody);
  let is_gpt_4_model: boolean = false;
  try {
    if (clonedBody) {
      const jsonBody = JSON.parse(clonedBody);
      if (!(jsonBody?.model ?? "").includes("gpt-4")) {
        org_id = "";
      } else {
        is_gpt_4_model = true;
      }
    }
  } catch (e) {
    console.error("[OpenAI] 判断模型失败 ", e);
  }
  let baseUrl = BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `${PROTOCOL}://${baseUrl}`;
  }
  // 如果不是4，那么考虑使用微软的接口，节省成本。
  if (!is_gpt_4_model && process.env.AZURE_URL) {
    // 替换baseurl，
    baseUrl = AZURE_URL;
  }

  let auth_key = AZURE_KEY.length === 0 ? authValue : `Bearer ${AZURE_KEY}`;

  if (is_gpt_4_model && GPT_4_BASE_URL && GPT_4_KEY) {
    baseUrl = GPT_4_BASE_URL;
    auth_key = GPT_4_KEY;
  }

  // req.headers.set("Authorization", `Bearer ${apiKey}`);
  // console.log("[Proxy] ", openaiPath);
  console.log("[Base Url]", baseUrl);
  // console.log(auth_key)

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10 * 60 * 1000);

  const fetchUrl = `${baseUrl}/${openaiPath}`;
  const fetchOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Authorization: auth_key,
      ...(org_id.length !== 0 && {
        "OpenAI-Organization": org_id,
      }),
    },
    method: req.method,
    body: clonedBody ? clonedBody : null,
    // @ts-ignore
    duplex: "half",
    signal: controller.signal,
  };

  // #1815 try to refuse gpt4 request
  if (DISABLE_GPT4 && is_gpt_4_model) {
    return NextResponse.json(
      {
        error: true,
        message: "you are not allowed to use gpt-4 model",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const res = await fetch(fetchUrl, fetchOptions);

    // to prevent browser prompt for credentials
    const newHeaders = new Headers(res.headers);
    newHeaders.delete("www-authenticate");
    // to disable nginx buffering
    newHeaders.set("X-Accel-Buffering", "no");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
