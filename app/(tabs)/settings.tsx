import AsyncStorage from "@react-native-async-storage/async-storage";
import { Info, Key, Settings as SettingsIcon, Zap } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState("");
  const [savedApiKey, setSavedApiKey] = useState("");
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [maxTokens, setMaxTokens] = useState("1000");
  const [temperature, setTemperature] = useState("0.7");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedApiKey = await AsyncStorage.getItem("openai_api_key");
      const storedAdvancedMode = await AsyncStorage.getItem("advanced_mode");
      const storedMaxTokens = await AsyncStorage.getItem("max_tokens");
      const storedTemperature = await AsyncStorage.getItem("temperature");

      if (storedApiKey) {
        setSavedApiKey(storedApiKey);
        setApiKey(storedApiKey);
      }
      if (storedAdvancedMode) {
        setIsAdvancedMode(JSON.parse(storedAdvancedMode));
      }
      if (storedMaxTokens) {
        setMaxTokens(storedMaxTokens);
      }
      if (storedTemperature) {
        setTemperature(storedTemperature);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert("Error", "Please enter a valid API key");
      return;
    }

    try {
      await AsyncStorage.setItem("openai_api_key", apiKey);
      setSavedApiKey(apiKey);
      Alert.alert("Success", "API key saved successfully");
    } catch (error) {
      console.error("Error saving API key:", error);
      Alert.alert("Error", "Failed to save API key");
    }
  };

  const clearApiKey = async () => {
    Alert.alert(
      "Clear API Key",
      "Are you sure you want to clear the API key?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("openai_api_key");
              setApiKey("");
              setSavedApiKey("");
              Alert.alert("Success", "API key cleared");
            } catch (error) {
              console.error("Error clearing API key:", error);
            }
          },
        },
      ]
    );
  };

  const saveAdvancedSettings = async () => {
    try {
      await AsyncStorage.setItem(
        "advanced_mode",
        JSON.stringify(isAdvancedMode)
      );
      await AsyncStorage.setItem("max_tokens", maxTokens);
      await AsyncStorage.setItem("temperature", temperature);
      Alert.alert("Success", "Advanced settings saved");
    } catch (error) {
      console.error("Error saving advanced settings:", error);
      Alert.alert("Error", "Failed to save advanced settings");
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return (
      key.substring(0, 4) +
      "•••••••••••••••••••••••••••••••••••••••" +
      key.substring(key.length - 4)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <SettingsIcon size={24} color="#3B82F6" />
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Key size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>OpenAI API Key</Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Enter your OpenAI API key"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={true}
            />
          </View>

          {savedApiKey && (
            <View style={styles.savedKeyContainer}>
              <Text style={styles.savedKeyLabel}>Current API Key:</Text>
              <Text style={styles.savedKeyValue}>
                {maskApiKey(savedApiKey)}
              </Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.saveButton} onPress={saveApiKey}>
              <Text style={styles.saveButtonText}>Save API Key</Text>
            </TouchableOpacity>
            {savedApiKey && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearApiKey}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Advanced Settings</Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Advanced Mode</Text>
            <Switch
              value={isAdvancedMode}
              onValueChange={setIsAdvancedMode}
              trackColor={{ false: "#E5E7EB", true: "#3B82F6" }}
              thumbColor={isAdvancedMode ? "#FFFFFF" : "#F3F4F6"}
            />
          </View>

          {isAdvancedMode && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Max Tokens</Text>
                <TextInput
                  style={styles.textInput}
                  value={maxTokens}
                  onChangeText={setMaxTokens}
                  placeholder="1000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Temperature</Text>
                <TextInput
                  style={styles.textInput}
                  value={temperature}
                  onChangeText={setTemperature}
                  placeholder="0.7"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                style={styles.saveAdvancedButton}
                onPress={saveAdvancedSettings}
              >
                <Text style={styles.saveAdvancedButtonText}>
                  Save Advanced Settings
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>About</Text>
          </View>

          <Text style={styles.aboutText}>
            This RAG chatbot allows you to upload documents and ask questions
            about them. The AI will search through your documents and provide
            answers based on the content.
          </Text>

          <Text style={styles.aboutText}>
            To get started, upload some documents in the Documents tab and
            configure your OpenAI API key above.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  savedKeyContainer: {
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  savedKeyLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E40AF",
    marginBottom: 4,
  },
  savedKeyValue: {
    fontSize: 14,
    color: "#374151",
    fontFamily: "monospace",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  clearButton: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  clearButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  saveAdvancedButton: {
    backgroundColor: "#8B5CF6",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveAdvancedButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  aboutText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
});
