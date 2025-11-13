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

    console.log("Enriching report:", reportId, "with photo:", report.photo_url);

    // Validate photo URL exists
    if (!report.photo_url) {
      console.error("No photo URL found for report");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No photo URL found" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Call OpenAI Vision API to analyze the photo
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) {
      console.error("OPENAI_API_KEY not configured");
      throw new Error("OpenAI API key not configured");
    }

    const visionPrompt = `You are a vision model helping with civic infrastructure. The image shows a public issue on a city street or public space. Look at the image and classify the issue for a civic reporting app. Respond with ONLY valid JSON and no extra text.

The JSON format must be:
{
  "category": "pothole|broken_light|trash|flooding|other",
  "severity": "low|medium|high",
  "short_description": "<one sentence, plain English>"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: visionPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: report.photo_url,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      // Don't throw - log and return gracefully
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "OpenAI API error",
          details: errorText 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200, // Return 200 to not block the app
        }
      );
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0].message.content;

    console.log("AI Response:", aiContent);

    // Parse AI response
    let aiMetadata;
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanedContent = aiContent.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.replace(/```\n?/g, "");
      }
      
      aiMetadata = JSON.parse(cleanedContent);
      
      // Validate the structure
      if (!aiMetadata.category || !aiMetadata.severity || !aiMetadata.short_description) {
        throw new Error("Invalid AI response structure");
      }
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      console.error("Raw content:", aiContent);
      aiMetadata = {
        category: "other",
        severity: "medium",
        short_description: report.description || "Unable to analyze image",
        raw_response: aiContent,
        parse_error: e instanceof Error ? e.message : "Unknown error",
      };
    }

    // Prepare update data
    const updateData: any = { ai_metadata: aiMetadata };

    // Update type if it's "other" or missing and we have a valid category
    const validCategories = ["pothole", "broken_light", "trash", "flooding", "other"];
    if (
      aiMetadata.category &&
      validCategories.includes(aiMetadata.category) &&
      (!report.type || report.type === "other")
    ) {
      updateData.type = aiMetadata.category;
      console.log(`Updating report type from "${report.type}" to "${aiMetadata.category}"`);
    }

    // Update the report with AI metadata
    const { error: updateError } = await supabase
      .from("reports")
      .update(updateData)
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
    // Return success with error info to not block the app
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Return 200 to not block the app
      }
    );
  }
});
