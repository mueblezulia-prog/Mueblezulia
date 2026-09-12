// screens/SettingsScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../App';
import { useSounds } from '../hooks/useSounds';

const API_KEY_STORAGE_KEY = 'GEMINI_API_KEY';

// PEGA_AQUI_TU_API_KEY
// (You can either hardcode a default key below for testing, or just
// leave this empty and paste your key inside the app's Settings screen —
// it will be saved on the device with AsyncStorage.)
const DEFAULT_API_KEY = ''; // PEGA_AQUI_TU_API_KEY

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const { playSuccess, playTap, playError } = useSounds();

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
      if (stored) {
        setApiKey(stored);
      } else if (DEFAULT_API_KEY) {
        setApiKey(DEFAULT_API_KEY);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      playError();
      Alert.alert('Empty key', 'Please paste your Gemini API key first.');
      return;
    }
    await AsyncStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
    setSaved(true);
    playSuccess();
    Alert.alert('Saved ✅', 'Your API key was saved on this device.');
  };

  const handleClear = async () => {
    playTap();
    await AsyncStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
    setSaved(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Settings</Text>

          <GlassCard>
            <Text style={styles.label}>Gemini API Key</Text>
            <Text style={styles.helper}>
              Paste your free key from aistudio.google.com/apikey. It is stored
              only on your phone and sent directly to Google when you chat.
            </Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={(t) => {
                setApiKey(t);
                setSaved(false);
              }}
              placeholder="AIza..."
              placeholderTextColor={THEME.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveButtonText}>{saved ? 'Saved ✓' : 'Save API Key'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={handleClear} activeOpacity={0.85}>
              <Text style={styles.clearButtonText}>Clear Key</Text>
            </TouchableOpacity>
          </GlassCard>

          <GlassCard style={{ marginTop: 16 }}>
            <Text style={styles.infoTitle}>About El Calvito de Open</Text>
            <Text style={styles.infoText}>
              This app teaches English using a fixed curriculum: classroom
              language, greetings & "to be", places & prepositions, clothes/
              colors/possessives & present continuous, routines & present
              simple, health & invitations, future plans, and past simple.
              Use the Chat Tutor tab to practice, or the Games tab for
              Sentence Builder and Trivia.
            </Text>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function GlassCard({ children, style }) {
  return (
    <BlurView intensity={28} tint="dark" style={[styles.card, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  container: { padding: 20, paddingBottom: 120, flexGrow: 1 },
  title: { fontSize: 26, fontWeight: '800', color: THEME.text, marginBottom: 20, letterSpacing: -0.3 },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    backgroundColor: THEME.glass,
    overflow: 'hidden',
  },
  label: { fontSize: 15, fontWeight: '700', color: THEME.text, marginBottom: 4 },
  helper: { fontSize: 12, color: THEME.textMuted, marginBottom: 14, lineHeight: 17 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: THEME.text,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    marginBottom: 14,
  },
  saveButton: {
    backgroundColor: THEME.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  clearButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  clearButtonText: { color: THEME.primary, fontWeight: '600' },
  infoTitle: { fontWeight: '700', color: THEME.text, marginBottom: 6, fontSize: 15 },
  infoText: { color: THEME.textMuted, fontSize: 13, lineHeight: 19 },
});
