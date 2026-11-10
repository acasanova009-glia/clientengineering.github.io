export async function onInvoke(request, env) {
  try {
    const quickResponses = [
      { input: 'escalate', output: 'If you wish to escalate your matter, please call our phone support.' },
      { input: 'feedback', output: 'We value your opinion. Please use the Contact Us page to send us your feedback.' }
    ];

    // 1. Safely parse incoming JSON
    let incoming = {};
    try {
      incoming = await request.json();
    } catch {
      const text = await request.text();
      incoming = text ? JSON.parse(text) : {};
    }

    // 2. Safely unwrap 'payload' (whether stringified, object, or absent)
    let body = incoming;
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

    // 3. Guarantee a string so .match() never encounters undefined
    const rawMessage = body?.message ?? body?.text ?? incoming?.message ?? incoming?.text ?? '';
    const message = typeof rawMessage === 'string' ? rawMessage : String(rawMessage || '');

    // 4. Test regex rules
    for (const response of quickResponses) {
      const regex = new RegExp(response.input, 'ui');
      if (message.match(regex)) {
        return new Response(JSON.stringify({
          match: true,
          message: `System message: ${response.output}`
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Default: No match found
    return new Response(JSON.stringify({ 
      match: false, 
      message: '' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      match: false,
      error: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}