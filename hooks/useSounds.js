// hooks/useSounds.js
//
// Small helper around expo-audio to play short, satisfying UI sound
// effects (tap, send, success, error, pop). Each sound is preloaded once
// and rewound to the start every time it's played so rapid taps still
// sound crisp instead of getting cut off.
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const SOUND_FILES = {
  tap: require('../assets/sounds/tap.wav'),
  send: require('../assets/sounds/send.wav'),
  success: require('../assets/sounds/success.wav'),
  error: require('../assets/sounds/error.wav'),
  pop: require('../assets/sounds/pop.wav'),
};

export function useSounds() {
  const tapPlayer = useAudioPlayer(SOUND_FILES.tap);
  const sendPlayer = useAudioPlayer(SOUND_FILES.send);
  const successPlayer = useAudioPlayer(SOUND_FILES.success);
  const errorPlayer = useAudioPlayer(SOUND_FILES.error);
  const popPlayer = useAudioPlayer(SOUND_FILES.pop);

  const playFrom = (player) => {
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {
      // Sound is a nice-to-have; never let it crash the app.
    }
  };

  return {
    playTap: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      playFrom(tapPlayer);
    },
    playSend: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playFrom(sendPlayer);
    },
    playSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playFrom(successPlayer);
    },
    playError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playFrom(errorPlayer);
    },
    playPop: () => {
      Haptics.selectionAsync();
      playFrom(popPlayer);
    },
  };
}
