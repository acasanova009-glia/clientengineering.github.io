// step1-auth-test.js
const API_KEY_ID = "644c1c4e-1b0e-4afa-95e3-5e49a0647427";
const API_KEY_SECRET = "glu_GEfQWjMCYSRNd91UmJ73X4CXzCEGjvn6fbNS";
const TOKEN_URL = "https://api.beta.glia.com/operator_authentication/tokens";

export async function onInvoke(request, env) {
  try {
    const res = await fetch(TOKEN_URL, {
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

    const text = await res.text();

    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "fetch failed", 
      message: err.message,
      name: err.name,
      stack: err.stack 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}