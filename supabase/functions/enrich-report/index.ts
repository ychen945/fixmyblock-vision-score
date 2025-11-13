import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId } = await req.json();

    if (!reportId) {
      throw new Error("reportId is required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the report
    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (fetchError) {
      console.error("Error fetching report:", fetchError);
      throw fetchError;
    }

    console.log("Enriching report:", reportId);

    // Call OpenAI to analyze the report
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) {
      console.error("OPENAI_API_KEY not configured");
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `Analyze this community issue report and provide insights:
- Type: ${report.type}
- Description: ${report.description || "No description provided"}
- Location: (${report.lat}, ${report.lng})

Please provide:
1. Severity assessment (low, medium, high, critical)
2. Suggested priority level
3. Estimated resolution timeframe
4. Any safety concerns

Respond in JSON format with keys: severity, priority, timeframe, safety_concerns`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant that analyzes community issue reports and provides actionable insights for city maintenance teams.",
          },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0].message.content;

    console.log("AI Response:", aiContent);

    // Parse AI response
    let aiMetadata;
    try {
      aiMetadata = JSON.parse(aiContent);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      aiMetadata = {
        raw_response: aiContent,
        severity: "medium",
        priority: "normal",
        timeframe: "unknown",
        safety_concerns: "Unable to parse AI response",
      };
    }

    // Update the report with AI metadata
    const { error: updateError } = await supabase
      .from("reports")
      .update({ ai_metadata: aiMetadata })
      .eq("id", reportId);

    if (updateError) {
      console.error("Error updating report:", updateError);
      throw updateError;
    }

    console.log("Report enriched successfully:", reportId);

    return new Response(
      JSON.stringify({ success: true, ai_metadata: aiMetadata }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in enrich-report function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
