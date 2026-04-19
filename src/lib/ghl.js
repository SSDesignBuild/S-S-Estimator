export async function sendQuoteToGhl(supabase, payload) {
  try {
    const { data, error } = await supabase.functions.invoke('send-to-ghl', {
      body: payload,
    });

    if (error) {
      let detailedMessage = error.message || 'GoHighLevel send failed.';

      try {
        if (error.context) {
          const cloned = error.context.clone ? error.context.clone() : error.context;
          const json = await cloned.json();
          detailedMessage = json?.message || detailedMessage;
          if (json?.debug) {
            detailedMessage += ` ${typeof json.debug === 'string' ? json.debug : JSON.stringify(json.debug)}`;
          }
        }
      } catch {
        try {
          if (error.context) {
            const cloned = error.context.clone ? error.context.clone() : error.context;
            const text = await cloned.text();
            if (text) detailedMessage = text;
          }
        } catch {
          // ignore parse errors and keep base message
        }
      }

      return {
        data: null,
        error: detailedMessage,
      };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error:
        err?.message ||
        'GoHighLevel send is not configured yet. Finish Step 10 setup and deploy the Supabase Edge Function.'
    };
  }
}
