// screens/ChatScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TEACHER_KATHERYN_SYSTEM_PROMPT } from '../config/systemPrompt';
import { THEME } from '../App';
import { useSounds } from '../hooks/useSounds';

const API_KEY_STORAGE_KEY = 'GEMINI_API_KEY';

const INITIAL_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm El Calvito de Open 👋 Let's practice English together. Ready to start with some classroom phrases? Try saying: \"I have a question\" 😊",
};

export default function ChatScreen() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const { playSend, playPop, playError } = useSounds();

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const apiKey = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
    if (!apiKey) {
      playError();
      Alert.alert(
        'Missing API Key',
        'Please add your Gemini API key in the Settings tab first.'
      );
      return;
    }

    playSend();

    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const contents = newMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: TEACHER_KATHERYN_SYSTEM_PROMPT }],
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 400,
            },
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Gemini API error');
      }

      const replyText =
        data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        "Sorry, I didn't catch that. Can you try again?";

      const botMsg = {
        id: Date.now().toString() + '-bot',
        role: 'assistant',
        content: replyText,
      };
      setMessages((prev) => [...prev, botMsg]);
      playPop();
    } catch (err) {
      playError();
      Alert.alert('Error', err.message || 'Something went wrong contacting Gemini.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser ? styles.rowRight : styles.rowLeft]}>
        {!isUser && (
          <LinearAvatar />
        )}
        <BlurView
          intensity={isUser ? 55 : 30}
          tint="dark"
          style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}
        >
          <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
            {item.content}
          </Text>
        </BlurView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>C</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>El Calvito de Open</Text>
          <Text style={styles.headerSubtitle}>Your English practice buddy</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
        {loading && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={THEME.primary} />
            <Text style={styles.typingText}>El Calvito is typing...</Text>
          </View>
        )}
        <BlurView intensity={45} tint="dark" style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Type in English..."
            placeholderTextColor={THEME.textMuted}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={loading || !input.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </BlurView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LinearAvatar() {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>C</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: THEME.primary,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  headerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: THEME.text },
  headerSubtitle: { fontSize: 12, color: THEME.textMuted, marginTop: 1 },

  listContent: { padding: 16, paddingBottom: 24 },
  bubbleRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  bubble: {
    maxWidth: '78%',
    borderRadius: 20,
    paddingVertical: 11,
    paddingHorizontal: 15,
    overflow: 'hidden',
    borderWidth: 1,
  },
  botBubble: {
    backgroundColor: THEME.glass,
    borderBottomLeftRadius: 6,
    borderColor: THEME.glassBorder,
  },
  userBubble: {
    backgroundColor: 'rgba(157, 124, 255, 0.35)',
    borderBottomRightRadius: 6,
    borderColor: 'rgba(157, 124, 255, 0.5)',
  },
  bubbleText: { fontSize: 14.5, color: THEME.text, lineHeight: 21 },
  userBubbleText: { color: '#fff' },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  typingText: { marginLeft: 8, color: THEME.textMuted, fontSize: 12 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    margin: 16,
    marginBottom: 100,
    padding: 8,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: THEME.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: THEME.glassStrong,
  },
});
