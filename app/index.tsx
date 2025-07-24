import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function AdvancedRAGChatbot() {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [documentChunks, setDocumentChunks] = useState<any[]>([]);
  const [documentName, setDocumentName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiModal, setShowApiModal] = useState(true);
  const [tempApiKey, setTempApiKey] = useState("");

  const router = useRouter();

  // OpenAI API configuration
  const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
  const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

  useEffect(() => {
    if (apiKey) {
      setMessages([
        {
          id: 1,
          text: "Hello! I'm your advanced RAG chatbot powered by OpenAI. You can ask me questions about any topic, or upload a document (PDF, TXT, DOCX) for me to analyze and answer questions about it.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    }
  }, [apiKey]);

  const saveApiKey = () => {
    if (tempApiKey.trim() === "") {
      Alert.alert("Error", "Please enter your OpenAI API key");
      return;
    }
    setApiKey(tempApiKey.trim());
    setShowApiModal(false);
    setTempApiKey("");
  };

  const chunkText = (text: string, maxChunkSize = 1000) => {
    const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim());
    const chunks = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ". " : "") + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  };

  const getEmbedding = async (text: string) => {
    try {
      const response = await fetch(OPENAI_EMBEDDINGS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: "text-embedding-3-small",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error("Error getting embedding:", error);
      return null;
    }
  };

  const cosineSimilarity = (a: any[], b: any[]) => {
    const dotProduct = a.reduce(
      (sum: number, ai: number, i: number) => sum + ai * b[i],
      0
    );
    const magnitudeA = Math.sqrt(
      a.reduce((sum: number, ai: number) => sum + ai * ai, 0)
    );
    const magnitudeB = Math.sqrt(
      b.reduce((sum: number, bi: number) => sum + bi * bi, 0)
    );
    return dotProduct / (magnitudeA * magnitudeB);
  };

  const processDocument = async (
    uri: string,
    mimeType: string | string[] | undefined,
    name: string
  ) => {
    try {
      let content = "";

      if (mimeType === "text/plain") {
        content = await FileSystem.readAsStringAsync(uri);
      } else if (mimeType === "application/pdf") {
        // For PDF processing, you'd typically use a library like react-native-pdf-lib
        // For now, we'll simulate PDF extraction
        content = `[PDF Content Extracted from ${name}]\n\nThis is simulated PDF content. In a production app, you would use a PDF parsing library to extract actual text content from the PDF file. The document processing system would handle various PDF formats and extract structured information including text, tables, and metadata.`;
      } else if (
        mimeType?.includes("officedocument") ||
        mimeType?.includes("msword")
      ) {
        // For DOCX/DOC processing, you'd use libraries like mammoth or docx-preview
        content = `[DOCX Content Extracted from ${name}]\n\nThis is simulated DOCX content. In a production app, you would use libraries like mammoth.js to extract actual text content from Word documents. The system would preserve formatting and structure while extracting readable text for processing.`;
      } else {
        // Try to read as text for other formats
        try {
          content = await FileSystem.readAsStringAsync(uri);
        } catch (err) {
          content = `[Document Content from ${name}]\n\nUnable to extract text content automatically. Please ensure the document is in a supported format (TXT, PDF, DOCX).`;
          console.log(err);
        }
      }

      // Chunk the document
      const chunks = chunkText(content, 800);

      // Get embeddings for each chunk (in production, you might want to batch this)
      const chunksWithEmbeddings = [];
      for (let i = 0; i < Math.min(chunks.length, 10); i++) {
        // Limit to 10 chunks for demo
        const embedding = await getEmbedding(chunks[i]);
        if (embedding) {
          chunksWithEmbeddings.push({
            text: chunks[i],
            embedding: embedding,
            index: i,
          });
        }
      }

      setDocumentChunks(chunksWithEmbeddings);
      return chunksWithEmbeddings.length;
    } catch (error) {
      console.error("Error processing document:", error);
      throw error;
    }
  };

  const pickDocument = async () => {
    try {
      setIsProcessing(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/plain",
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setDocumentName(asset.name);

        addMessage(`Processing document "${asset.name}"...`, "bot");

        const chunksProcessed = await processDocument(
          asset.uri,
          asset.mimeType,
          asset.name
        );

        addMessage(
          `Document "${asset.name}" has been processed successfully! I've created ${chunksProcessed} searchable chunks. You can now ask questions about the document content.`,
          "bot"
        );
      }
    } catch (error) {
      console.error("Document processing error:", error);
      Alert.alert("Error", "Failed to process document. Please try again.");
      addMessage(
        "Sorry, I encountered an error while processing the document. Please try uploading again.",
        "bot"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const addMessage = (text: string, sender: string) => {
    const newMessage = {
      id: Date.now(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const findRelevantChunks = async (query: string, topK = 3) => {
    if (documentChunks.length === 0) return [];

    const queryEmbedding = await getEmbedding(query);
    if (!queryEmbedding) return [];

    const similarities = documentChunks.map((chunk) => ({
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    return similarities
      .toSorted((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  };

  const generateResponse = async (query: string, relevantChunks: any[]) => {
    try {
      let systemPrompt =
        "You are a helpful AI assistant that answers questions based on provided context.";
      let userPrompt = query;

      if (relevantChunks.length > 0) {
        const context = relevantChunks
          .map((chunk: { text: any }) => chunk.text)
          .join("\n\n");
        systemPrompt +=
          " Answer the user's question based on the following document context. If the context doesn't contain relevant information, say so clearly.";
        userPrompt = `Context from document:\n${context}\n\nQuestion: ${query}`;
      } else {
        systemPrompt +=
          " Answer the user's question using your general knowledge. Be helpful and informative.";
      }

      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error("Error generating response:", error);
      if (error?.message?.includes("API key")) {
        return "There seems to be an issue with the API key. Please check your OpenAI API key and try again.";
      }
      return "I apologize, but I encountered an error while generating a response. Please try again.";
    }
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === "" || !apiKey) return;

    const userMessage = inputText.trim();
    setInputText("");
    addMessage(userMessage, "user");
    setIsLoading(true);

    try {
      // Find relevant chunks from uploaded document
      const relevantChunks = await findRelevantChunks(userMessage);

      // Generate response using OpenAI
      const response = await generateResponse(userMessage, relevantChunks);
      addMessage(response, "bot");
    } catch (error) {
      console.error("Error handling message:", error);
      addMessage(
        "I apologize, but I encountered an error. Please try again.",
        "bot"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: "Chat cleared! How can I help you?",
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
  };

  const gotoTabs = () => {
    router.navigate("/(tabs)");
  };

  const resetApiKey = () => {
    setApiKey("");
    setShowApiModal(true);
    setMessages([]);
    setDocumentChunks([]);
    setDocumentName("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* API Key Modal */}
      <Modal visible={showApiModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>OpenAI API Key Required</Text>
            <Text style={styles.modalSubtitle}>
              Enter your OpenAI API key to use the advanced RAG chatbot:
            </Text>
            <TextInput
              style={styles.apiKeyInput}
              value={tempApiKey}
              onChangeText={setTempApiKey}
              placeholder="sk-..."
              secureTextEntry
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveApiKey}>
              <Text style={styles.saveButtonText}>Save & Continue</Text>
            </TouchableOpacity>
            <Text style={styles.modalNote}>
              Your API key is stored locally and only used for OpenAI requests.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RAG Chatbot (OpenAI)</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={resetApiKey} style={styles.apiButton}>
            <Text style={styles.apiButtonText}>API</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={gotoTabs} style={styles.gotoTabsButton}>
            <Text style={styles.clearButtonText}>Tabs</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Document Status */}
      {Boolean(documentName) && (
        <View style={styles.documentStatus}>
          <Text style={styles.documentText}>
            📄 {documentName} ({documentChunks.length} chunks processed)
          </Text>
        </View>
      )}

      {/* Chat Messages */}
      <ScrollView style={styles.chatContainer}>
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.sender === "user"
                ? styles.userMessage
                : styles.botMessage,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.sender === "user"
                  ? styles.userMessageText
                  : styles.botMessageText,
              ]}
            >
              {message.text}
            </Text>
            <Text style={styles.timestamp}>
              {message.timestamp.toLocaleTimeString()}
            </Text>
          </View>
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Thinking with AI...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.documentButton}
          onPress={pickDocument}
          disabled={isProcessing || !apiKey}
        >
          <Text style={styles.documentButtonText}>
            {isProcessing ? "⏳" : "📎"}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={apiKey ? "Ask me anything..." : "Set API key first"}
          multiline
          maxLength={500}
          editable={!!apiKey}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (inputText.trim() === "" || !apiKey) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={inputText.trim() === "" || isLoading || !apiKey}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  apiButton: {
    padding: 8,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
  },
  apiButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  clearButton: {
    padding: 8,
    backgroundColor: "#ff4444",
    borderRadius: 8,
  },
  gotoTabsButton: {
    padding: 8,
    backgroundColor: "#ff4",
    borderRadius: 8,
  },
  clearButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  documentStatus: {
    padding: 12,
    backgroundColor: "#e8f5e8",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  documentText: {
    fontSize: 14,
    color: "#2e7d32",
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    maxWidth: "85%",
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
  },
  botMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: "white",
  },
  botMessageText: {
    color: "#333",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: "#666",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    alignItems: "flex-end",
  },
  documentButton: {
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginRight: 8,
  },
  documentButtonText: {
    fontSize: 16,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
  sendButtonText: {
    color: "white",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 20,
    padding: 24,
    borderRadius: 16,
    width: width - 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#333",
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  apiKeyInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalNote: {
    fontSize: 12,
    textAlign: "center",
    color: "#888",
  },
});
