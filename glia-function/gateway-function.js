// combined-gateway-prototype.js
const API_KEY_ID = "644c1c4e-1b0e-4afa-95e3-5e49a0647427";
const API_KEY_SECRET = "glu_GEfQWjMCYSRNd91UmJ73X4CXzCEGjvn6fbNS";
const ANALYZER_FUNCTION_ID = "187c2916-dac3-402f-bac6-9160981c168a";

const TOKEN_URL = "https://api.beta.glia.com/operator_authentication/tokens";
const ANALYZER_URL = `https://api.beta.glia.com/integrations/${ANALYZER_FUNCTION_ID}/endpoint`;

// Predefined quick keyword responses
const quickResponses = [
  { input: 'escalate', output: 'If you wish to escalate your matter, please call our phone support.' },
  { input: 'feedback', output: 'We value your opinion. Please use the Contact Us page to send us your feedback.' }
];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onInvoke(request, env) {
  try {
    // -------------------------------------------------------------
    // 1. Unified Safe Request Parsing
    // -------------------------------------------------------------
    let incoming = {};
    if (request && typeof request.json === 'function') {
      try {
        incoming = await request.json();
      } catch {
        const text = await request.text();
        incoming = text ? JSON.parse(text) : {};
      }
    } else if (typeof request === 'string') {
      try {
        incoming = JSON.parse(request);
      } catch {
        incoming = {};
      }
    } else if (request && typeof request === 'object') {
      incoming = request;
    }

    // Safely unwrap 'payload' (whether serialized string, object, or absent)
    let body = incoming || {};
    if (incoming && incoming.payload !== undefined) {
      if (typeof incoming.payload === 'string') {
        try {
          body = JSON.parse(incoming.payload);
        } catch {
          body = {};
        }
      } else if (typeof incoming.payload === 'object' && incoming.payload !== null) {
        body = incoming.payload;
      }
    }

    // Extract message & VIP status (strictly guaranteed non-null string)
    const rawMsg = body?.text ?? body?.message ?? incoming?.text ?? incoming?.message ?? '';
    const message = typeof rawMsg === 'string' ? rawMsg.trim() : String(rawMsg || '').trim();
    const isVip = Boolean(body?.is_vip ?? incoming?.is_vip);

    // -------------------------------------------------------------
    // 2. Logic Step A: Quick Response Keyword Match
    // -------------------------------------------------------------
    if (message.length > 0) {
      for (const item of quickResponses) {
        const regex = new RegExp(item.input, 'ui');
        if (message.match(regex)) {
          return jsonResponse({
            match: true,
            type: 'quick_response',
            message: `System message: ${item.output}`,
            analyzed_text: message
          }, 200);
        }
      }
    }

    // -------------------------------------------------------------
    // 3. Logic Step B: Gateway Bearer Auth & Tantrum Analyzer
    // -------------------------------------------------------------
    // Acquire Bearer Token
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

    const authData = await authRes.json().catch(() => ({}));
    const token = authData?.token || authData?.access_token;

    if (!token) {
      return jsonResponse({
        match: false,
        error: "Failed to acquire Glia bearer token",
        authData
      }, 502);
    }

    // Call Analyzer Function endpoint
    const safeTextToSend = message || "cancel";
    const analyzerRes = await fetch(ANALYZER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/vnd.salemove.v1+json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        text: safeTextToSend,
        message: safeTextToSend,
        payload: { text: safeTextToSend, message: safeTextToSend }
      })
    });

    const rawAnalyzerText = await analyzerRes.text();
    let analyzerData = {};
    try {
      analyzerData = JSON.parse(rawAnalyzerText);
    } catch {
      analyzerData = { raw: rawAnalyzerText };
    }

    // Extract score safely
    let rawScore = analyzerData?.score;
    if (rawScore === undefined && analyzerData?.payload) {
      const unwrapped = typeof analyzerData.payload === "string" 
        ? JSON.parse(analyzerData.payload) 
        : analyzerData.payload;
      rawScore = unwrapped?.score;
    }
    const score = Number(rawScore ?? 0);

    // -------------------------------------------------------------
    // 4. Decision Rule: VIP vs Alert Message
    // -------------------------------------------------------------
    let alertMessage = "";
        if (score > 8 && isVip) {
          // High score + VIP client
          alertMessage = "🔴 ALERT: Offer VIP apology and $50 credit";
        } else if (score > 8 && !isVip) {
          // High score + Standard client
          alertMessage = "🟡 ALERT: Keep calm and use the complaint script";
        } else {
          // Normal / low score (neither VIP critical nor a tantrum)
          alertMessage = "🟢 NORMAL: Standard support flow";
        }

    return jsonResponse({
      match: true,
      type: 'tantrum_analysis',
      message: alertMessage,
      level: score,
      is_vip: isVip,
      analyzed_text: safeTextToSend,
      analyzerResponse: analyzerData
    }, 200);

  } catch (err) {
    return jsonResponse({
      match: false,
      error: "Gateway router crashed",
      message: err?.message || String(err)
    }, 500);
  }
}