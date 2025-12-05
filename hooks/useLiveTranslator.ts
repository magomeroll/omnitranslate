import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Language, ConnectionState } from '../types';
import { createBlob, decode, decodeAudioData } from '../utils/audio';

interface UseLiveTranslatorProps {
  languageA: Language;
  languageB: Language;
  splitAudio: boolean;
  onTranscription: (text: string, isUser: boolean) => void;
  apiKey: string; // New prop for manual key entry
}

export const useLiveTranslator = ({
  languageA,
  languageB,
  splitAudio,
  onTranscription,
  apiKey
}: UseLiveTranslatorProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // State for UI rendering
  const [isMuted, setIsMuted] = useState(false);
  // Ref for logic inside callbacks (avoids stale closures)
  const isMutedRef = useRef(false);
  
  const [volume, setVolume] = useState(0);

  // Audio Context and Processing Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const connectionTimeoutRef = useRef<any>(null);
  
  // Track if connection was successfully established to handle early closures
  const isConnectedRef = useRef<boolean>(false);

  // Analyzers for visualization
  const analyzerRef = useRef<AnalyserNode | null>(null);

  const cleanup = useCallback(() => {
    isConnectedRef.current = false;
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputContextRef.current && inputContextRef.current.state !== 'closed') {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    
    setVolume(0);
  }, []);

  const connect = useCallback(async () => {
    setErrorMessage(null);
    isConnectedRef.current = false;

    // Reset mute state on new connection
    setIsMuted(false);
    isMutedRef.current = false;

    // Simplified Key Logic: Use manual input OR standard env var
    const activeKey = apiKey || process.env.API_KEY;

    if (!activeKey) {
      setErrorMessage("API Key is missing. Please enter your key in settings.");
      setConnectionState('error');
      return;
    }

    try {
      // Step 1: Request Microphone
      setConnectionState('requesting_permission');

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Audio input is not supported in this browser or context (requires HTTPS).");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000
          } 
        });
        streamRef.current = stream;
      } catch (err: any) {
        console.error("Microphone permission error:", err);
        setErrorMessage("Microphone access denied. Please allow microphone permissions in your browser settings.");
        setConnectionState('error');
        return;
      }

      // Step 2: Connect to API
      setConnectionState('connecting');

      // Set a timeout to avoid infinite loading
      connectionTimeoutRef.current = setTimeout(() => {
        if (!isConnectedRef.current) {
          console.error("Connection timed out");
          setErrorMessage("Connection to the server timed out. Please check your network.");
          setConnectionState('error');
          cleanup();
        }
      }, 15000); // 15 second timeout

      const ai = new GoogleGenAI({ apiKey: activeKey });
      
      // Initialize Audio Contexts
      // Output Context (24kHz for Gemini output)
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // Input Context (16kHz for Gemini input)
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputContextRef.current = inputCtx;

      // Setup Analyzer for Visuals
      const analyzer = inputCtx.createAnalyser();
      analyzer.fftSize = 256;
      analyzerRef.current = analyzer;

      // Define System Instruction
      const systemInstruction = `
        You are an expert simultaneous interpreter. 
        Your task is to listen to a conversation between two people.
        One person speaks ${languageA}. The other person speaks ${languageB}.
        
        Rules:
        1. When you hear ${languageA}, immediately translate it verbally into ${languageB}.
        2. When you hear ${languageB}, immediately translate it verbally into ${languageA}.
        3. Do not engage in the conversation. Do not answer questions. Only translate.
        4. Keep your translations concise and accurate.
        5. If the audio is unclear, stay silent.
      `;

      // Establish Connection
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: systemInstruction,
          // Enable transcription to display text logs - Just empty objects needed to enable
          inputAudioTranscription: {},
          outputAudioTranscription: {}, 
        },
        callbacks: {
          onopen: () => {
            console.log("Session Opened");
            isConnectedRef.current = true; // Mark as successfully connected
            
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            setConnectionState('connected');

            // Setup Input Processing
            const source = inputCtx.createMediaStreamSource(stream);
            sourceRef.current = source;
            source.connect(analyzer); // Connect to analyzer for visuals

            // Use ScriptProcessor for raw PCM access (standard for Gemini Live examples)
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              // CRITICAL FIX: Use ref here, not state, to avoid stale closure
              if (isMutedRef.current) {
                return; 
              }

              // Calculate volume for UI
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for(let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(rms * 5, 1)); // Scale up a bit

              // Send to Gemini
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Transcriptions
            if (msg.serverContent?.inputTranscription?.text) {
               onTranscription(msg.serverContent.inputTranscription.text, true);
            }
            if (msg.serverContent?.outputTranscription?.text) {
               onTranscription(msg.serverContent.outputTranscription.text, false);
            }

            // Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputCtx) {
              try {
                // Determine start time to avoid gaps
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);

                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  outputCtx
                );

                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;

                const panner = outputCtx.createStereoPanner();
                if (splitAudio) {
                    // Defaulting to center/both for reliability as we don't have speaker id in audio stream
                    panner.pan.value = 0; 
                } else {
                    panner.pan.value = 0;
                }
                
                source.connect(panner);
                panner.connect(outputCtx.destination);
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;

              } catch (err) {
                console.error("Audio decode error", err);
              }
            }

            // Handle Interruption
            if (msg.serverContent?.interrupted) {
               nextStartTimeRef.current = outputCtx.currentTime;
            }
          },
          onclose: () => {
            console.log("Session Closed");
            if (!isConnectedRef.current) {
                // If it closed and we never marked it as connected, it's an immediate failure
                setErrorMessage("Connection failed immediately. Please check your network or API Key.");
                setConnectionState('error');
            } else {
                setConnectionState('disconnected');
            }
            isConnectedRef.current = false;
          },
          onerror: (err) => {
            console.error("Session Error", err);
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            setErrorMessage("Connection to AI service failed.");
            setConnectionState('error');
            isConnectedRef.current = false;
          }
        }
      });
      
    } catch (err: any) {
      console.error("Connection failed", err);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      setErrorMessage(err.message || "Failed to initialize connection");
      setConnectionState('error');
      isConnectedRef.current = false;
    }
  }, [languageA, languageB, splitAudio, onTranscription, apiKey]); // Added apiKey to deps

  const disconnect = useCallback(() => {
    cleanup();
    setConnectionState('disconnected');
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    // Toggle the ref (immediate logic)
    isMutedRef.current = !isMutedRef.current;
    // Toggle the state (UI update)
    setIsMuted(isMutedRef.current);
    
    // If muted, explicitly set volume to 0 so visualizer stops
    if (isMutedRef.current) {
      setVolume(0);
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    }
  }, [cleanup]);

  return {
    connect,
    disconnect,
    connectionState,
    errorMessage,
    isMuted, // Return state for UI
    toggleMute,
    volume,
    analyzerNode: analyzerRef.current
  };
};