import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

// expo-speech-recognition requires a native build — guard for Expo Go.
// We only grab the module reference; event subscriptions are registered
// inside useEffect (not at the hook call site) to avoid crashes.
let _module: any = null;
try {
  const m = require("expo-speech-recognition");
  const mod = m.ExpoSpeechRecognitionModule;
  // Verify the native module is actually present (not just the JS shim)
  if (mod && typeof mod.start === "function") {
    _module = mod;
  }
} catch {
  // Module not bundled — Expo Go or unsupported platform
}

// Module-level owner token: only one hook instance may hold an active session.
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
  // Store callbacks in refs so event handlers always see the latest values
  // without requiring callers to wrap in useCallback.
  const onResultRef = useRef(options.onResult);
  onResultRef.current = options.onResult;
  const onInterimResultRef = useRef(options.onInterimResult);
  onInterimResultRef.current = options.onInterimResult;
  const onErrorRef = useRef(options.onError);
  onErrorRef.current = options.onError;

  // Stable ID for this hook instance — set once on mount, never changes.
  const sessionIdRef = useRef(`voice-${_nextId++}`);
  const sessionId = sessionIdRef.current;

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const transcriptRef = useRef("");

  const fireError = useRef((kind: VoiceInputErrorKind) => {
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
  }).current;

  // Register native event listeners once on mount via useEffect.
  // This avoids calling useSpeechRecognitionEvent (a hook) inside another
  // hook body, which caused crashes in Expo Go.
  useEffect(() => {
    if (!_module) return;

    const resultSub = _module.addListener("result", (e: any) => {
      if (_activeSessionId.current !== sessionId) return;
      const t = e.results?.[0]?.transcript ?? "";
      transcriptRef.current = t;
      onInterimResultRef.current?.(t);
      setLiveTranscript(t);
    });

    const endSub = _module.addListener("end", async () => {
      if (_activeSessionId.current !== sessionId) return;
      _activeSessionId.current = null;
      setIsListening(false);
      setLiveTranscript("");
      const transcript = transcriptRef.current;
      transcriptRef.current = "";
      if (!transcript) {
        fireError("no_speech");
        return;
      }
      setIsProcessing(true);
      try {
        await onResultRef.current(transcript);
      } finally {
        setIsProcessing(false);
      }
    });

    const errorSub = _module.addListener("error", () => {
      if (_activeSessionId.current !== sessionId) return;
      _activeSessionId.current = null;
      setIsListening(false);
      setLiveTranscript("");
      transcriptRef.current = "";
      fireError("error");
    });

    return () => {
      resultSub?.remove();
      endSub?.remove();
      errorSub?.remove();
    };
  }, [sessionId, fireError]);

  const toggleListening = async () => {
    if (!_module) {
      fireError("unavailable");
      return;
    }
    if (isListening) {
      _module.stop();
      return;
    }
    if (_activeSessionId.current !== null) return;

    const { granted } = await _module.requestPermissionsAsync();
    if (!granted) {
      fireError("permission_denied");
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
