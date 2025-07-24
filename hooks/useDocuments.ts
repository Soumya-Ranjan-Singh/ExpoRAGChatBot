import { Document, DocumentChunk } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { useEffect, useState } from "react";

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const savedDocuments = await AsyncStorage.getItem("documents");
      if (savedDocuments) {
        const parsed = JSON.parse(savedDocuments);
        setDocuments(
          parsed.map((doc: any) => ({
            ...doc,
            uploadedAt: new Date(doc.uploadedAt),
          }))
        );
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDocuments = async (newDocuments: Document[]) => {
    try {
      await AsyncStorage.setItem("documents", JSON.stringify(newDocuments));
    } catch (error) {
      console.error("Error saving documents:", error);
    }
  };

  const uploadDocument = async (file: any) => {
    try {
      // Read file content
      const content = await FileSystem.readAsStringAsync(file.uri);

      // Create document chunks
      const chunks = await createDocumentChunks(content, file.name);

      const newDocument: Document = {
        id: Date.now().toString(),
        name: file.name,
        content,
        chunks,
        uploadedAt: new Date(),
        size: file.size || 0,
        type: file.mimeType || "text/plain",
      };

      const newDocuments = [...documents, newDocument];
      setDocuments(newDocuments);
      await saveDocuments(newDocuments);

      return newDocument;
    } catch (error) {
      console.error("Error uploading document:", error);
      throw error;
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const newDocuments = documents.filter((doc) => doc.id !== documentId);
      setDocuments(newDocuments);
      await saveDocuments(newDocuments);
    } catch (error) {
      console.error("Error deleting document:", error);
      throw error;
    }
  };

  const searchDocuments = async (query: string): Promise<string[]> => {
    try {
      // Simple keyword-based search for now
      const relevantChunks: string[] = [];

      const queryWords = query.toLowerCase().split(" ");

      documents.forEach((doc) => {
        doc.chunks.forEach((chunk) => {
          const chunkContent = chunk.content.toLowerCase();
          const relevanceScore = queryWords.reduce((score, word) => {
            return score + (chunkContent.includes(word) ? 1 : 0);
          }, 0);

          if (relevanceScore > 0) {
            relevantChunks.push(chunk.content);
          }
        });
      });

      return relevantChunks.slice(0, 5); // Return top 5 relevant chunks
    } catch (error) {
      console.error("Error searching documents:", error);
      return [];
    }
  };

  return {
    documents,
    uploadDocument,
    deleteDocument,
    searchDocuments,
    isLoading,
  };
};

// Helper function to create document chunks
const createDocumentChunks = async (
  content: string,
  fileName: string
): Promise<DocumentChunk[]> => {
  const chunkSize = 1000; // Characters per chunk
  const chunks: DocumentChunk[] = [];

  for (let i = 0; i < content.length; i += chunkSize) {
    const chunkContent = content.slice(i, i + chunkSize);

    chunks.push({
      id: `${fileName}-chunk-${i}`,
      content: chunkContent,
      embedding: [], // Would be populated by embedding service
      metadata: {
        source: fileName,
        section: `Part ${Math.floor(i / chunkSize) + 1}`,
      },
    });
  }

  return chunks;
};
