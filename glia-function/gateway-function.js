// gateway-step3.js
const API_KEY_ID = "644c1c4e-1b0e-4afa-95e3-5e49a0647427";
const API_KEY_SECRET = "glu_GEfQWjMCYSRNd91UmJ73X4CXzCEGjvn6fbNS";
const ANALYZER_FUNCTION_ID = "187c2916-dac3-402f-bac6-9160981c168a";

const TOKEN_URL = "https://api.beta.glia.com/operator_authentication/tokens";
const ANALYZER_URL = `https://api.beta.glia.com/integrations/${ANALYZER_FUNCTION_ID}/endpoint`;

export async function onInvoke(request, env) {
  try {
    // 1. Parse incoming request safely
    let rawBody = null;
    if (request && typeof request.json === "function") {
      try {
        rawBody = await request.json();
      } catch {
        const text = await request.text();
        rawBody = text ? JSON.parse(text) : {};
      }
    } else if (typeof request === "string") {
      try {
        rawBody = JSON.parse(request);
      } catch {
        rawBody = {};
      }
    } else if (request && typeof request === "object") {
      rawBody = request;
    }

    // 2. Unwrap Glia's payload wrapper if present
    let payload = rawBody;
    if (rawBody && rawBody.payload !== undefined) {
      if (typeof rawBody.payload === "string") {
        try {
          payload = JSON.parse(rawBody.payload);
        } catch {
          payload = {};
        }
      } else {
        payload = rawBody.payload;
      }
    }

    // 3. Extract text and VIP status
    const userText = payload?.text || payload?.message || "";
    const isVip = Boolean(payload?.is_vip);

    // 4. Fetch Bearer Token
    const authRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/vnd.salemove.v1+json"
      },
      body: JSON.stringify({
        api_key_id: API_KEY_ID,
        api_key_secret: API_KEY_SECRET
      })
    });

    const authData = await authRes.json();
    const token = authData.token || authData.access_token;

    if (!token) {
      return new Response(JSON.stringify({ error: "Failed to get token", authData }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 5. Forward text to the Analyzer Function
    const analyzerRes = await fetch(ANALYZER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/vnd.salemove.v1+json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        text: userText
      })
    });

    const rawAnalyzerText = await analyzerRes.text();
    let analyzerData;
    try {
      analyzerData = JSON.parse(rawAnalyzerText);
    } catch {
      analyzerData = { raw: rawAnalyzerText };
    }

    // 6. Return confirmation message along with detected values
    return new Response(JSON.stringify({
      confirmed: true,
      confirmation_message: `Received: "${userText}" | VIP Status: ${isVip ? "Yes" : "No"}`,
      detected: {
        text: userText,
        is_vip: isVip
      },
      analyzerStatus: analyzerRes.status,
      analyzerResponse: analyzerData
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: "Invocation failed",
      message: err.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}