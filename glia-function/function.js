// applet/src/tantrum_analyzer.js

export async function onInvoke(request, env) {
  const debug = {
    requestType: typeof request,
    isRequestInstance: typeof Request !== 'undefined' && request instanceof Request,
    hasJsonFunc: !!(request && typeof request.json === 'function'),
    rawReceived: null,
    extractedText: null
  };

  try {
    let parsedData = null;

    // 1. Try reading standard Request / Fetch object
    if (request && typeof request.json === 'function') {
      try {
        parsedData = await request.json();
      } catch (jsonErr) {
        try {
          const rawText = await request.text();
          debug.rawTextStream = rawText;
          parsedData = rawText ? JSON.parse(rawText) : null;
        } catch (textErr) {
          debug.streamError = textErr.message;
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

    debug.rawReceived = parsedData;

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

    // Secondary fallback to root
    if (!textToAnalyze && parsedData && typeof parsedData === 'object') {
      textToAnalyze = parsedData.text || parsedData.message || '';
    }

    debug.extractedText = textToAnalyze;

    // 6. Score logic
    const cleanText = String(textToAnalyze || '').toLowerCase().trim();
    const triggerWords = ['cancel', 'terrible', 'garbage'];
    const hasTriggerWord = triggerWords.some((word) => cleanText.includes(word));
    const score = hasTriggerWord ? 9 : 3;

    return Response.json({
      score: score,
      flagged: hasTriggerWord,
      analyzedText: cleanText,
      debug: debug
    });

  } catch (err) {
    return Response.json({
      error: 'Handler crashed',
      message: err.message,
      stack: err.stack,
      debug: debug
    }, { status: 500 });
  }
}