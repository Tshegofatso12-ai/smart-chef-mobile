import { useRef, useState } from "react";
import { Alert } from "react-native";

// expo-speech-recognition requires a native build — guard for Expo Go
let _module: any = null;
let _useSpeechRecognitionEvent: (event: string, cb: (e: any) => void) => void =
  () => {};
try {
  const m = require("expo-speech-recognition");
  _module = m.ExpoSpeechRecognitionModule;
  _useSpeechRecognitionEvent = m.useSpeechRecognitionEvent;
} catch {
  // running in Expo Go — voice input disabled
}

// Module-level owner token: only one hook instance may hold an active session.
// Set to a stable sessionId string when listening starts; cleared on end/error.
const _activeSessionId = { current: null as string | null };

let _nextId = 0;

export type VoiceInputErrorKind =
  | "unavailable"
  | "permission_denied"
  | "no_speech"
  | "error";

export interface UseVoiceInputOptions {
  /** Called with the final transcript when the session ends with speech. */
  onResult: (transcript: string) => void | Promise<void>;
  /** Optional: called with live interim text while the user is speaking. */
  onInterimResult?: (partial: string) => void;
  /** Optional: structured error kind. Defaults to showing an Alert if omitted. */
  onError?: (kind: VoiceInputErrorKind) => void;
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  isProcessing: boolean;
  liveTranscript: string;
  /** False in Expo Go — use to conditionally hide the mic button. */
  isAvailable: boolean;
  toggleListening: () => Promise<void>;
}

export function useVoiceInput(
  options: UseVoiceInputOptions
): UseVoiceInputReturn {
  // Store callbacks in refs so the event handlers always see the latest version
  // without requiring callers to memoize with useCallback.
  const onResultRef = useRef(options.onResult);
  onResultRef.current = options.onResult;
  const onInterimResultRef = useRef(options.onInterimResult);
  onInterimResultRef.current = options.onInterimResult;
  const onErrorRef = useRef(options.onError);
  onErrorRef.current = options.onError;

  // Stable session ID for this hook instance (never changes after mount).
  const sessionId = useRef(`voice-${_nextId++}`).current;

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const transcriptRef = useRef("");

  const handleError = (kind: VoiceInputErrorKind) => {
    if (onErrorRef.current) {
      onErrorRef.current(kind);
    } else {
      const messages: Record<VoiceInputErrorKind, string> = {
        unavailable: "Voice input requires a native build. Run `npx expo run:ios` to enable it.",
        permission_denied: "Microphone access is required for voice input.",
        no_speech: "No speech detected. Please try again.",
        error: "Speech recognition failed. Please try again.",
      };
      Alert.alert("Voice Input", messages[kind]);
    }
  };

  _useSpeechRecognitionEvent("result", (e: any) => {
    if (_activeSessionId.current !== sessionId) return;
    const t = e.results[0]?.transcript ?? "";
    transcriptRef.current = t;
    onInterimResultRef.current?.(t);
    setLiveTranscript(t);
  });

  _useSpeechRecognitionEvent("end", async () => {
    if (_activeSessionId.current !== sessionId) return;
    _activeSessionId.current = null;
    setIsListening(false);
    setLiveTranscript("");
    const transcript = transcriptRef.current;
    transcriptRef.current = "";
    if (!transcript) {
      handleError("no_speech");
      return;
    }
    setIsProcessing(true);
    try {
      await onResultRef.current(transcript);
    } finally {
      setIsProcessing(false);
    }
  });

  _useSpeechRecognitionEvent("error", () => {
    if (_activeSessionId.current !== sessionId) return;
    _activeSessionId.current = null;
    setIsListening(false);
    setLiveTranscript("");
    transcriptRef.current = "";
    handleError("error");
  });

  const toggleListening = async () => {
    if (!_module) {
      handleError("unavailable");
      return;
    }

    // Stop if this instance is currently listening
    if (isListening) {
      _module.stop();
      return;
    }

    // Another instance owns the session — don't start
    if (_activeSessionId.current !== null) return;

    const { granted } = await _module.requestPermissionsAsync();
    if (!granted) {
      handleError("permission_denied");
      return;
    }

    transcriptRef.current = "";
    setLiveTranscript("");
    _activeSessionId.current = sessionId;
    setIsListening(true);
    _module.start({ lang: "en-US", interimResults: false, maxAlternatives: 1 });
  };

  return {
    isListening,
    isProcessing,
    liveTranscript,
    isAvailable: _module !== null,
    toggleListening,
  };
}
