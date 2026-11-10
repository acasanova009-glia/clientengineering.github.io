// applet/src/tantrum_analyzer.js

export async function onInvoke(request, env) {
  try {
    let parsedData = null;

    // 1. Try reading standard Request / Fetch object
    if (request && typeof request.json === 'function') {
      try {
        parsedData = await request.json();
      } catch (jsonErr) {
        try {
          const rawText = await request.text();
          parsedData = rawText ? JSON.parse(rawText) : null;
        } catch {
          parsedData = null;
        }
      }
    } 
    // 2. Direct string payload
    else if (typeof request === 'string') {
      try {
        parsedData = JSON.parse(request);
      } catch {
        parsedData = { text: request };
      }
    } 
    // 3. Pre-parsed object
    else if (request && typeof request === 'object') {
      parsedData = request;
    }

    // 4. Unwrap Glia's browser payload wrapper if present
    let actualPayload = parsedData;
    if (parsedData && parsedData.payload !== undefined) {
      if (typeof parsedData.payload === 'string') {
        try {
          actualPayload = JSON.parse(parsedData.payload);
        } catch {
          actualPayload = { text: parsedData.payload };
        }
      } else {
        actualPayload = parsedData.payload;
      }
    }

    // 5. Extract text from any variation
    let textToAnalyze = '';
    if (typeof actualPayload === 'string') {
      textToAnalyze = actualPayload;
    } else if (actualPayload && typeof actualPayload === 'object') {
      textToAnalyze = actualPayload.text || actualPayload.message || '';
    }

    // Fallback to parsedData root
    if (!textToAnalyze && parsedData && typeof parsedData === 'object') {
      textToAnalyze = parsedData.text || parsedData.message || '';
    }

    // 6. Score logic
    const cleanText = String(textToAnalyze || '').toLowerCase().trim();
    const triggerWords = ['cancel', 'terrible', 'garbage'];
    const hasTriggerWord = triggerWords.some((word) => cleanText.includes(word));
    const score = hasTriggerWord ? 9 : 3;

    const responseBody = {
      score: score,
      flagged: hasTriggerWord,
      analyzedText: cleanText
    };

    // 7. Explicit JSON Response (compatible with both Response object & legacy Glia wrapper)
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (err) {
    const errorBody = {
      error: 'Handler crashed',
      message: err.message
    };

    return new Response(JSON.stringify(errorBody), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}