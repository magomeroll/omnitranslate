import React, { useState, useRef, useEffect } from 'react';
import { Settings, Mic, MicOff, Play, Square, Headphones, Activity, Globe, MessageSquare, AlertCircle, RefreshCw, ChevronLeft, Lock, Key, ArrowRight, ShieldCheck } from 'lucide-react';
import { Language, SessionConfig, MessageLog } from './types';
import { useLiveTranslator } from './hooks/useLiveTranslator';
import { Visualizer } from './components/Visualizer';

const PIN_CODE = "6841";

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState(false);

  // App Config State
  const [userApiKey, setUserApiKey] = useState("");
  const [isSetup, setIsSetup] = useState(true);
  const [config, setConfig] = useState<SessionConfig>({
    languageA: Language.ITALIAN,
    languageB: Language.ENGLISH,
    splitAudio: false
  });
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load API Key from local storage if available
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setUserApiKey(storedKey);
    }
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === PIN_CODE) {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setPinInput("");
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setUserApiKey(newVal);
    localStorage.setItem('gemini_api_key', newVal);
  };

  const handleTranscription = (text: string, isUser: boolean) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      source: isUser ? 'user' : 'ai',
      text,
      timestamp: new Date()
    }]);
  };

  const { 
    connect, 
    disconnect, 
    connectionState, 
    isMuted, 
    toggleMute, 
    volume,
    errorMessage
  } = useLiveTranslator({
    languageA: config.languageA,
    languageB: config.languageB,
    splitAudio: config.splitAudio,
    onTranscription: handleTranscription,
    apiKey: userApiKey
  });

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleStartSession = () => {
    setIsSetup(false);
    connect();
  };

  const handleStopSession = () => {
    disconnect();
    setIsSetup(true);
    setLogs([]);
  };

  const handleRetry = () => {
    disconnect();
    connect();
  };

  // 1. PIN Authentication Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="max-w-xs w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl z-10 flex flex-col items-center">
          <div className="p-4 bg-slate-800 rounded-full mb-6">
            <Lock className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">OmniTranslate Safe</h2>
          <p className="text-slate-400 text-sm mb-6 text-center">Enter access PIN to continue</p>
          
          <form onSubmit={handlePinSubmit} className="w-full space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className={`w-full bg-slate-950 border ${authError ? 'border-red-500' : 'border-slate-700'} rounded-lg px-4 py-3 text-center text-2xl tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              placeholder="••••"
              autoFocus
            />
            {authError && <p className="text-red-400 text-xs text-center">Incorrect PIN code</p>}
            
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Unlock <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Configuration & Setup Screen
  if (isSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                OmniTranslate
              </h1>
              <p className="text-slate-400 text-sm">Real-time AI Interpreter</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* API Key Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-2">
                <Key className="w-3 h-3" />
                Gemini API Key
              </label>
              <input 
                type="password"
                value={userApiKey}
                onChange={handleApiKeyChange}
                placeholder="Paste your Gemini API Key here..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-10 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
              />
              <p className="text-[10px] text-slate-500">
                Your key is stored securely in your browser's local memory.
              </p>
            </div>

            <div className="h-px bg-slate-800 my-4"></div>

            {/* Person A Language */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                Interlocutor A (Left)
              </label>
              <select 
                value={config.languageA}
                onChange={(e) => setConfig({...config, languageA: e.target.value as Language})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                {Object.values(Language).map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Person B Language */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                Interlocutor B (Right)
              </label>
              <select 
                value={config.languageB}
                onChange={(e) => setConfig({...config, languageB: e.target.value as Language})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              >
                {Object.values(Language).map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Split Audio Option */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="flex items-center gap-3">
                <Headphones className={`w-5 h-5 ${config.splitAudio ? 'text-green-400' : 'text-slate-500'}`} />
                <div>
                  <p className="text-sm font-medium text-white">Split Audio Channels</p>
                  <p className="text-xs text-slate-400">Experimental: Route translations to L/R</p>
                </div>
              </div>
              <button 
                onClick={() => setConfig({...config, splitAudio: !config.splitAudio})}
                className={`w-12 h-6 rounded-full transition-colors relative ${config.splitAudio ? 'bg-green-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${config.splitAudio ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <button
              onClick={handleStartSession}
              disabled={!userApiKey}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Interpretation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Active Session Screen
  return (
    <div className="h-screen bg-slate-950 flex flex-col relative overflow-hidden text-white">
      {/* Dynamic Background */}
      <div className={`absolute inset-0 bg-gradient-to-br from-blue-900/10 to-purple-900/10 transition-opacity duration-1000 ${connectionState === 'connected' ? 'opacity-100' : 'opacity-0'}`}></div>

      {/* Header */}
      <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md z-10 sticky top-0 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          <span className="font-bold text-lg tracking-tight">OmniTranslate</span>
          {connectionState === 'connected' && (
            <span className={`px-2 py-0.5 rounded-full text-xs border animate-pulse ${isMuted ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
              {isMuted ? 'PAUSED' : 'LIVE'}
            </span>
          )}
        </div>
        <button 
          onClick={handleStopSession}
          className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-red-400"
          title="End Session"
        >
          <Square className="w-5 h-5 fill-current" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden max-w-7xl mx-auto w-full z-10 min-h-0">
        
        {/* Left: Visualization & Controls */}
        <div className="flex-1 flex flex-col gap-4 h-full">
          
          {/* Active Speakers Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex-1 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            
            {/* Connection Loading State */}
            {(connectionState === 'connecting' || connectionState === 'requesting_permission') && (
               <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center z-50 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                    
                    {connectionState === 'requesting_permission' ? (
                        <>
                           <Mic className="w-10 h-10 text-blue-400 animate-bounce" />
                           <span className="text-blue-400 font-medium text-lg">Microphone Access Required</span>
                           <p className="text-slate-400 text-sm text-center max-w-xs">Please click "Allow" in your browser's permission popup to continue.</p>
                        </>
                    ) : (
                        <>
                           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                           <span className="text-blue-400 font-medium">Connecting to Satellite...</span>
                           <p className="text-slate-500 text-sm text-center max-w-xs">Establishing secure line for {config.languageA} ↔ {config.languageB}</p>
                        </>
                    )}
                    
                    <button 
                      onClick={handleStopSession} 
                      className="mt-6 px-6 py-2 rounded-full border border-slate-700 hover:bg-slate-800 text-slate-400 text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
               </div>
            )}

            {/* Error State */}
            {connectionState === 'error' && (
               <div className="absolute inset-0 bg-slate-950/95 flex items-center justify-center z-50 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-4 max-w-sm text-center p-6 animate-in zoom-in duration-300">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Connection Failed</h3>
                    <p className="text-slate-400 text-sm">{errorMessage || "Unable to access microphone or connect to the server. Please check your permissions and try again."}</p>
                    <div className="flex gap-3 w-full mt-2">
                      <button 
                        onClick={handleStopSession}
                        className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button 
                        onClick={handleRetry}
                        className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                      </button>
                    </div>
                  </div>
               </div>
            )}

            {/* Disconnected State Overlay (when in main view but dropped) */}
            {connectionState === 'disconnected' && (
               <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-slate-800 rounded-full">
                       <Activity className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white">Session Paused</h3>
                    <button 
                      onClick={handleRetry}
                      className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reconnect
                    </button>
                    <button 
                      onClick={handleStopSession}
                      className="text-slate-500 text-sm hover:text-slate-300"
                    >
                      Back to Settings
                    </button>
                  </div>
               </div>
            )}

            <div className="flex w-full justify-between items-center mb-8 px-8">
               {/* Avatar A */}
               <div className="flex flex-col items-center gap-3 group">
                 <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 p-[2px] shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center relative overflow-hidden">
                       <img src={`https://picsum.photos/200/200?random=1`} alt="Avatar A" className="opacity-80 object-cover w-full h-full" />
                       <div className="absolute bottom-0 w-full bg-blue-600/80 text-center text-xs py-1 text-white font-bold backdrop-blur-sm">
                         {config.languageA}
                       </div>
                    </div>
                 </div>
               </div>

               {/* Central Visualizer */}
               <div className="flex-1 px-8 flex flex-col items-center gap-2">
                  <div className="w-full">
                     {/* Pass isActive false if muted to freeze animation */}
                     <Visualizer isActive={connectionState === 'connected' && !isMuted} volume={volume} color="#60a5fa" />
                  </div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-2">Bi-Directional</p>
               </div>

               {/* Avatar B */}
               <div className="flex flex-col items-center gap-3 group">
                 <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 p-[2px] shadow-lg shadow-purple-500/30 group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center relative overflow-hidden">
                       <img src={`https://picsum.photos/200/200?random=2`} alt="Avatar B" className="opacity-80 object-cover w-full h-full" />
                       <div className="absolute bottom-0 w-full bg-purple-600/80 text-center text-xs py-1 text-white font-bold backdrop-blur-sm">
                         {config.languageB}
                        </div>
                    </div>
                 </div>
               </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleMute}
                disabled={connectionState !== 'connected'}
                className={`p-4 rounded-full transition-all shadow-lg ${isMuted ? 'bg-yellow-500 hover:bg-yellow-600 text-slate-900' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            </div>
            <p className="mt-4 text-slate-400 text-sm">
              {connectionState === 'connected' 
                ? (isMuted ? 'Session Paused (Mic Off)' : 'Listening... Speak naturally')
                : (connectionState === 'disconnected' ? 'Session paused' : 'Waiting for connection...')}
            </p>

          </div>
        </div>

        {/* Right: Live Transcript */}
        <div className="w-full md:w-96 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col shadow-xl overflow-hidden backdrop-blur-md h-full">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 shrink-0">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <h3 className="font-semibold text-slate-200">Live Transcript</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {logs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 opacity-50">
                <Globe className="w-8 h-8" />
                <p className="text-sm">Conversation logs will appear here</p>
              </div>
            )}
            
            {logs.map((log) => (
              <div key={log.id} className={`flex flex-col ${log.source === 'ai' ? 'items-start' : 'items-end'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  log.source === 'ai' 
                    ? 'bg-slate-800 text-blue-200 rounded-tl-none border border-slate-700' 
                    : 'bg-blue-600 text-white rounded-tr-none'
                }`}>
                  {log.text}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {log.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {log.source === 'ai' ? 'Translator' : 'Original'}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;