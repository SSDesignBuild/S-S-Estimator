export async function sendQuoteToGhl(supabase, payload) {
  try {
    const { data, error } = await supabase.functions.invoke('send-to-ghl', {
      body: payload,
    });

    if (error) {
      return {
        data: null,
        error:
          error.message ||
          'GoHighLevel send is not configured yet. Finish Step 10 setup and deploy the Supabase Edge Function.'
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
