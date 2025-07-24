import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ChatRequest {
  message: string;
  context: string[];
}

export interface ChatResponse {
  response: string;
  sources: string[];
  error?: string;
}

export const chatWithOpenAI = async (
  message: string,
  context: string[]
): Promise<ChatResponse> => {
  try {
    // Get API key from AsyncStorage
    const apiKey = await AsyncStorage.getItem("openai_api_key");

    if (!apiKey) {
      return {
        response: "Please configure your OpenAI API key in Settings first.",
        sources: [],
        error: "No API key configured",
      };
    }

    // Prepare context for the prompt
    const contextText =
      context.length > 0
        ? `Based on the following context:\n\n${context.join("\n\n")}\n\n`
        : "";

    // Create the prompt
    const prompt = `${contextText}Please answer the following question: ${message}

If the context doesn't contain relevant information to answer the question, please say so and provide a general response based on your knowledge.`;

    // Call OpenAI API directly
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that answers questions based on provided context. If the context doesn't contain relevant information, acknowledge this and provide a helpful general response.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      return {
        response:
          "Sorry, I encountered an error with the OpenAI API. Please check your API key and try again.",
        sources: [],
        error: "OpenAI API error",
      };
    }

    const data = await response.json();
    const aiResponse =
      data.choices[0]?.message?.content || "No response generated";

    // Prepare sources (simplified - in a real implementation you'd track which documents were used)
    const sources = context.length > 0 ? ["Document context"] : [];

    return {
      response: aiResponse,
      sources,
    };
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return {
      response: "Sorry, I encountered an error. Please try again.",
      sources: [],
      error: "Network or API error",
    };
  }
};
