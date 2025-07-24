export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  sources?: string[];
  isError?: boolean;
}

export interface Document {
  id: string;
  name: string;
  content: string;
  chunks: DocumentChunk[];
  uploadedAt: Date;
  size: number;
  type: string;
}

export interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    page?: number;
    section?: string;
  };
}

export interface RAGResponse {
  response: string;
  sources: string[];
  error?: string;
}

export interface Settings {
  apiKey: string;
  maxTokens: number;
  temperature: number;
  advancedMode: boolean;
}
