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
    const { imageData } = await req.json();

    if (!imageData) {
      throw new Error("imageData is required");
    }

    console.log("Analyzing image for report field suggestions");

    // Call OpenAI Vision API
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) {
      console.error("OPENAI_API_KEY not configured");
      throw new Error("OpenAI API key not configured");
    }

    const visionPrompt = `You are a vision model helping with civic infrastructure. The image shows a public issue on a city street or public space. Look at the image and classify the issue for a civic reporting app. Respond with ONLY valid JSON and no extra text.

The JSON format must be:
{
  "category": "pothole|broken_light|trash|flooding|other",
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
                  url: imageData, // Can be base64 or URL
                },
              },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      // Return graceful error
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to analyze image",
          details: errorText 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200, // Return 200 so app doesn't break
        }
      );
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0].message.content;

    console.log("AI Response:", aiContent);

    // Parse AI response
    let suggestions;
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanedContent = aiContent.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.replace(/```\n?/g, "");
      }
      
      suggestions = JSON.parse(cleanedContent);
      
      // Validate the structure
      if (!suggestions.category || !suggestions.short_description) {
        throw new Error("Invalid AI response structure");
      }
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      console.error("Raw content:", aiContent);
      // Return graceful error
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to parse AI response",
          raw_response: aiContent,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("Suggestions generated:", suggestions);

    return new Response(
      JSON.stringify({ 
        success: true, 
        category: suggestions.category,
        short_description: suggestions.short_description,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in suggest-report-fields function:", error);
    // Return success:false to not block the app
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
