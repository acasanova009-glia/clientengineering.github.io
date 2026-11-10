// gateway-function.js
import axios from 'axios';

// ==========================================
// 🔑 HARDCODED CREDENTIALS & TARGETS
// ==========================================
const API_KEY_ID = "644c1c4e-1b0e-4afa-95e3-5e49a0647427";
const API_KEY_SECRET = "glu_GEfQWjMCYSRNd91UmJ73X4CXzCEGjvn6fbNS";
const ANALYZER_FUNCTION_ID = "187c2916-dac3-402f-bac6-9160981c168a";


// Choose token endpoint:

const TOKEN_URL = 'https://api.beta.glia.com/operator_authentication/tokens';

async function getBearerToken() {
  const response = await axios.post(
    TOKEN_URL,
    {
      api_key_id: API_KEY_ID,
      api_key_secret: API_KEY_SECRET
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.salemove.v1+json'
      },
      timeout: 5000
    }
  );

  return response.data.token
}

export async function onInvoke(request, env) {
  const debug = {
    step: 'init',
    rawReceived: null,
    extractedPayload: null,
    tokenAcquired: false,
    analyzerStatus: null
  };

  try {
    // 1. Safely parse incoming payload
    let parsedData = null;

    if (request && typeof request.json === 'function') {
      try {
        parsedData = await request.json();
      } catch (jsonErr) {
        try {
          const rawText = await request.text();
          parsedData = rawText ? JSON.parse(rawText) : null;
        } catch (textErr) {
          debug.parseError = textErr.message;
        }
      }
    } else if (typeof request === 'string') {
      try {
        parsedData = JSON.parse(request);
      } catch {
        parsedData = {};
      }
    } else if (request && typeof request === 'object') {
      parsedData = request;
    }

    debug.rawReceived = parsedData;

    // 2. Unwrap Glia payload wrapper if present
    let actualPayload = parsedData;
    if (parsedData && parsedData.payload !== undefined) {
      if (typeof parsedData.payload === 'string') {
        try {
          actualPayload = JSON.parse(parsedData.payload);
        } catch {
          actualPayload = {};
        }
      } else {
        actualPayload = parsedData.payload;
      }
    }

    const payload = actualPayload || {};
    const message = payload.message || payload.text || '';
    const isVip = Boolean(payload.is_vip);

    debug.extractedPayload = { message, isVip };

    // 3. Fetch Bearer Token
    debug.step = 'fetching_bearer_token';
    let bearerToken;
    try {
      bearerToken = await getBearerToken();
      debug.tokenAcquired = true;
    } catch (tokenErr) {
      const status = tokenErr.response ? tokenErr.response.status : 500;
      return Response.json({
        error: `Failed to acquire bearer token: HTTP ${status}`,
        details: tokenErr.response ? tokenErr.response.data : tokenErr.message,
        debug: debug
      }, { status: 502 });
    }

    // 4. Call Function B (Tantrum Analyzer)
    debug.step = 'invoking_analyzer';
    const analyzerUrl = `https://api.beta.glia.com/integrations/${ANALYZER_FUNCTION_ID}/endpoint`;


    let analyzerResponse;
    try {
      analyzerResponse = await axios.post(
        analyzerUrl,
        { text: message },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.salemove.v1+json',
            'Authorization': `Bearer ${bearerToken}`
          },
          timeout: 10000
        }
      );
    } catch (axiosErr) {
      const status = axiosErr.response ? axiosErr.response.status : 502;
      return Response.json({
        error: `Analyzer invocation failed with HTTP ${status}`,
        details: axiosErr.response ? axiosErr.response.data : axiosErr.message,
        debug: debug
      }, { status: 502 });
    }

    debug.analyzerStatus = analyzerResponse.status;

    // 5. Evaluate score and return verdict
    const analyzerData = analyzerResponse.data || {};
    const score = Number(analyzerData.score ?? 0);

    let verdict = '';
    if (score > 8 && isVip) {
      verdict = '🔴 ALERT: Offer VIP apology and $50 credit';
    } else {
      verdict = '🟡 ALERT: Keep calm and use the complaint script';
    }

    return Response.json({
      verdict: verdict,
      tantrum_level: score,
      is_vip: isVip,
      analyzerResponse: analyzerData
    });

  } catch (err) {
    return Response.json({
      error: 'Gateway router crashed',
      message: err.message,
      stack: err.stack,
      debug: debug
    }, { status: 500 });
  }
}