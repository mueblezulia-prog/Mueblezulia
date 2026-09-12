// screens/GamesScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SENTENCE_BUILDER_ITEMS, TRIVIA_QUESTIONS } from '../config/knowledgeBase';
import { THEME } from '../App';
import { useSounds } from '../hooks/useSounds';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Sentence Builder ----------
function SentenceBuilderGame({ onExit }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [bank, setBank] = useState(() => shuffle(SENTENCE_BUILDER_ITEMS[0].correct));
  const [picked, setPicked] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const { playPop, playTap, playSuccess, playError } = useSounds();

  const item = SENTENCE_BUILDER_ITEMS[round];

  const pickWord = (word, index) => {
    playPop();
    setPicked((p) => [...p, word]);
    setBank((b) => b.filter((_, i) => i !== index));
  };

  const removeWord = (index) => {
    playTap();
    const word = picked[index];
    setPicked((p) => p.filter((_, i) => i !== index));
    setBank((b) => [...b, word]);
  };

  const checkAnswer = () => {
    const isCorrect = picked.join(' ') === item.correct.join(' ');
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) {
      setScore((s) => s + 1);
      playSuccess();
    } else {
      playError();
    }
  };

  const nextRound = () => {
    playTap();
    const next = round + 1;
    if (next >= SENTENCE_BUILDER_ITEMS.length) {
      onExit(score);
      return;
    }
    setRound(next);
    setBank(shuffle(SENTENCE_BUILDER_ITEMS[next].correct));
    setPicked([]);
    setFeedback(null);
  };

  return (
    <GlassPanel style={styles.gameContainer}>
      <Text style={styles.gameHeader}>
        Sentence {round + 1}/{SENTENCE_BUILDER_ITEMS.length} · Score: {score}
      </Text>
      <Text style={styles.gameInstruction}>Tap the words in the right order:</Text>

      <View style={styles.answerRow}>
        {picked.map((w, i) => (
          <TouchableOpacity key={i} style={styles.pickedChip} onPress={() => removeWord(i)} activeOpacity={0.8}>
            <Text style={styles.chipTextOnPrimary}>{w}</Text>
          </TouchableOpacity>
        ))}
        {picked.length === 0 && <Text style={styles.placeholder}>Your sentence appears here...</Text>}
      </View>

      <View style={styles.bankRow}>
        {bank.map((w, i) => (
          <TouchableOpacity key={i} style={styles.bankChip} onPress={() => pickWord(w, i)} activeOpacity={0.8}>
            <Text style={styles.chipText}>{w}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {feedback && (
        <Text style={feedback === 'correct' ? styles.correctText : styles.incorrectText}>
          {feedback === 'correct'
            ? '✨ Correct!'
            : `Not quite. Correct: "${item.correct.join(' ')}"`}
        </Text>
      )}

      <View style={styles.buttonRow}>
        {!feedback ? (
          <TouchableOpacity
            style={[styles.actionButton, picked.length !== item.correct.length && styles.disabledButton]}
            disabled={picked.length !== item.correct.length}
            onPress={checkAnswer}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>Check</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.actionButton} onPress={nextRound} activeOpacity={0.85}>
            <Text style={styles.actionButtonText}>
              {round + 1 >= SENTENCE_BUILDER_ITEMS.length ? 'Finish' : 'Next'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </GlassPanel>
  );
}

// ---------- Trivia Q&A ----------
function TriviaGame({ onExit }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const { playTap, playSuccess, playError } = useSounds();

  const q = TRIVIA_QUESTIONS[round];

  const selectOption = (opt) => {
    if (selected) return;
    setSelected(opt);
    if (opt === q.answer) {
      setScore((s) => s + 1);
      playSuccess();
    } else {
      playError();
    }
  };

  const nextRound = () => {
    playTap();
    const next = round + 1;
    if (next >= TRIVIA_QUESTIONS.length) {
      onExit(score);
      return;
    }
    setRound(next);
    setSelected(null);
  };

  return (
    <GlassPanel style={styles.gameContainer}>
      <Text style={styles.gameHeader}>
        Question {round + 1}/{TRIVIA_QUESTIONS.length} · Score: {score}
      </Text>
      <Text style={styles.triviaQuestion}>{q.question}</Text>

      {q.options.map((opt, i) => {
        let optionStyle = styles.optionButton;
        if (selected) {
          if (opt === q.answer) optionStyle = styles.optionCorrect;
          else if (opt === selected) optionStyle = styles.optionIncorrect;
        }
        return (
          <TouchableOpacity key={i} style={optionStyle} onPress={() => selectOption(opt)} activeOpacity={0.85}>
            <Text style={styles.optionText}>{opt}</Text>
          </TouchableOpacity>
        );
      })}

      {selected && (
        <TouchableOpacity style={styles.actionButton} onPress={nextRound} activeOpacity={0.85}>
          <Text style={styles.actionButtonText}>
            {round + 1 >= TRIVIA_QUESTIONS.length ? 'Finish' : 'Next Question'}
          </Text>
        </TouchableOpacity>
      )}
    </GlassPanel>
  );
}

function GlassPanel({ children, style }) {
  return (
    <BlurView intensity={28} tint="dark" style={[styles.glassBase, style]}>
      {children}
    </BlurView>
  );
}

// ---------- Menu / Root ----------
export default function GamesScreen() {
  const [activeGame, setActiveGame] = useState(null); // 'sentence' | 'trivia' | null
  const [lastResult, setLastResult] = useState(null);
  const { playTap } = useSounds();

  const finishGame = (name, score, total) => {
    setLastResult({ name, score, total });
    setActiveGame(null);
  };

  const openGame = (name) => {
    playTap();
    setActiveGame(name);
  };

  if (activeGame === 'sentence') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScrollView contentContainerStyle={styles.screenPad}>
          <SentenceBuilderGame
            onExit={(score) => finishGame('Sentence Builder', score, SENTENCE_BUILDER_ITEMS.length)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (activeGame === 'trivia') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScrollView contentContainerStyle={styles.screenPad}>
          <TriviaGame onExit={(score) => finishGame('Trivia Q&A', score, TRIVIA_QUESTIONS.length)} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.menuContainer}>
        <Text style={styles.menuTitle}>Mini-Games</Text>
        <Text style={styles.menuSubtitle}>Practice everything El Calvito taught you!</Text>

        {lastResult && (
          <GlassPanel style={styles.resultBanner}>
            <Text style={styles.resultText}>
              Last {lastResult.name} score: {lastResult.score}/{lastResult.total} 🎉
            </Text>
          </GlassPanel>
        )}

        <TouchableOpacity onPress={() => openGame('sentence')} activeOpacity={0.85}>
          <GlassPanel style={styles.gameCard}>
            <View style={styles.iconWrap}>
              <Ionicons name="reorder-four" size={24} color={THEME.primary} />
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={styles.gameCardTitle}>Sentence Builder</Text>
              <Text style={styles.gameCardDesc}>Tap the words in the correct order.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.textMuted} />
          </GlassPanel>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => openGame('trivia')} activeOpacity={0.85}>
          <GlassPanel style={styles.gameCard}>
            <View style={styles.iconWrap}>
              <Ionicons name="help-circle" size={24} color={THEME.primary} />
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={styles.gameCardTitle}>Trivia Q&A</Text>
              <Text style={styles.gameCardDesc}>Answer multiple-choice questions.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.textMuted} />
          </GlassPanel>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  screenPad: { padding: 16, paddingBottom: 120, flexGrow: 1 },
  menuContainer: { padding: 20, paddingBottom: 120, flexGrow: 1 },
  menuTitle: { fontSize: 26, fontWeight: '800', color: THEME.text, letterSpacing: -0.3 },
  menuSubtitle: { fontSize: 13, color: THEME.textMuted, marginTop: 4, marginBottom: 22 },

  glassBase: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    backgroundColor: THEME.glass,
    overflow: 'hidden',
  },

  resultBanner: { padding: 14, marginBottom: 16 },
  resultText: { color: THEME.success, fontWeight: '600' },

  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginBottom: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(157, 124, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameCardTitle: { fontSize: 16, fontWeight: '700', color: THEME.text },
  gameCardDesc: { fontSize: 12, color: THEME.textMuted, marginTop: 2 },

  gameContainer: { flex: 1, padding: 18 },
  gameHeader: { fontSize: 14, fontWeight: '700', color: THEME.text, marginBottom: 6 },
  gameInstruction: { fontSize: 13, color: THEME.textMuted, marginBottom: 14 },
  answerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  placeholder: { color: THEME.textMuted, fontSize: 13, paddingVertical: 6 },
  bankRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  pickedChip: {
    backgroundColor: THEME.primary,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  bankChip: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  chipText: { color: THEME.text, fontWeight: '600', fontSize: 13 },
  chipTextOnPrimary: { color: '#fff', fontWeight: '600', fontSize: 13 },
  correctText: { color: THEME.success, fontWeight: '700', marginBottom: 10 },
  incorrectText: { color: THEME.danger, fontWeight: '700', marginBottom: 10 },
  buttonRow: { marginTop: 4 },
  actionButton: {
    backgroundColor: THEME.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: { backgroundColor: 'rgba(255,255,255,0.08)' },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  triviaQuestion: { fontSize: 16, fontWeight: '600', color: THEME.text, marginBottom: 16 },
  optionButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  optionCorrect: {
    backgroundColor: 'rgba(126, 224, 168, 0.15)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(126, 224, 168, 0.4)',
  },
  optionIncorrect: {
    backgroundColor: 'rgba(240, 160, 144, 0.15)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(240, 160, 144, 0.4)',
  },
  optionText: { fontSize: 14, color: THEME.text, fontWeight: '600' },
});
