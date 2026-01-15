'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

const MAX_RESTARTS = 50; // Allow many restarts for long recordings

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const manualStopRef = useRef(false);
  const restartCountRef = useRef(0);
  const transcriptRef = useRef('');

  // Keep transcriptRef in sync
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Check browser support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognitionAPI);
    }
  }, []);

  // Initialize recognition
  const initRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'de-DE'; // German language

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let currentInterim = '';

      // Only process new results from resultIndex onwards
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          currentInterim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
      setInterimTranscript(currentInterim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log('Speech recognition event:', event.error);

      // Ignore no-speech and aborted errors - these are normal during continuous listening
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      switch (event.error) {
        case 'not-allowed':
          setError('Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.');
          manualStopRef.current = true; // Stop retrying
          break;
        case 'audio-capture':
          setError('Kein Mikrofon gefunden. Bitte schließe ein Mikrofon an.');
          manualStopRef.current = true;
          break;
        case 'network':
          setError('Netzwerkfehler. Bitte überprüfe deine Internetverbindung.');
          break;
        default:
          // Don't show error for minor issues
          console.warn(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setInterimTranscript('');

      // Only stop if user manually stopped or max restarts reached
      if (manualStopRef.current) {
        setIsListening(false);
        recognitionRef.current = null;
        restartCountRef.current = 0;
        return;
      }

      // Auto-restart if not manually stopped (browser timeout)
      if (restartCountRef.current < MAX_RESTARTS) {
        restartCountRef.current++;

        setTimeout(() => {
          if (!manualStopRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // If restart fails, create new instance
              console.log('Recreating recognition instance');
              const newRecognition = initRecognition();
              if (newRecognition) {
                recognitionRef.current = newRecognition;
                try {
                  newRecognition.start();
                } catch (e2) {
                  console.error('Failed to restart recognition:', e2);
                  setIsListening(false);
                }
              }
            }
          }
        }, 100);
      } else {
        // Max restarts reached
        setIsListening(false);
        recognitionRef.current = null;
        restartCountRef.current = 0;
      }
    };

    return recognition;
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Spracherkennung wird von diesem Browser nicht unterstützt. Bitte verwende Chrome, Edge oder Safari.');
      return;
    }

    // Reset flags
    manualStopRef.current = false;
    restartCountRef.current = 0;

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore
      }
    }

    // Create new recognition instance
    const recognition = initRecognition();
    if (!recognition) {
      setError('Konnte Spracherkennung nicht initialisieren.');
      return;
    }

    recognitionRef.current = recognition;
    setError(null);

    try {
      recognition.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
      setError('Fehler beim Starten der Spracherkennung.');
    }
  }, [isSupported, initRecognition]);

  const stopListening = useCallback(() => {
    // Set flag BEFORE stopping to prevent auto-restart
    manualStopRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }

    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    transcriptRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      manualStopRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
