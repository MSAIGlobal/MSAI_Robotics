// MOTHER Voice Panel - Text to Speech integration
import { useState, useRef, useEffect } from 'react';
import { voiceApi } from '../../lib/backend';
import { User } from '../../lib/types';
import { hasPermission } from '../../lib/auth';

interface Props {
  user: User | null;
}

export function MotherVoicePanel({ user }: Props) {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState<{ id: string; name: string }[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<{ text: string; url: string }[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const canSpeak = hasPermission('voice.use', user);

  useEffect(() => {
    loadVoices();
  }, []);

  async function loadVoices() {
    try {
      const data = await voiceApi.voices();
      setVoices(data);
      if (data.length > 0) {
        setSelectedVoice(data[0].id);
      }
    } catch (err) {
      // Use defaults if API unavailable
      setVoices([
        { id: 'mother-default', name: 'MOTHER Default' },
        { id: 'mother-calm', name: 'MOTHER Calm' },
        { id: 'mother-assertive', name: 'MOTHER Assertive' },
      ]);
      setSelectedVoice('mother-default');
    }
  }

  async function handleSpeak() {
    if (!canSpeak || !text.trim()) return;
    setLoading(true);

    try {
      const { audio_url } = await voiceApi.speak({
        text: text.trim(),
        voice: selectedVoice,
      });

      setAudioUrl(audio_url);
      setHistory((prev) => [{ text: text.trim(), url: audio_url }, ...prev.slice(0, 9)]);

      // Auto-play
      if (audioRef.current) {
        audioRef.current.src = audio_url;
        audioRef.current.play();
      }
    } catch (err) {
      console.error('TTS failed:', err);
      // Demo mode - simulate response
      const demoUrl = `data:audio/wav;base64,${btoa('demo')}`;
      setAudioUrl(demoUrl);
    } finally {
      setLoading(false);
    }
  }

  function handleReplay(url: string) {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
    }
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-cyan-400">
          MOTHER Voice
        </h2>
        <span className="text-xs text-gray-500">
          NVIDIA TTS Backend
        </span>
      </div>

      {!canSpeak && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
          <p className="text-yellow-400 text-sm">
            Operator role required to use voice features
          </p>
        </div>
      )}

      {/* Voice Selection */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">Voice</label>
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          disabled={!canSpeak}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
        >
          {voices.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      {/* Text Input */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">Text to Speak</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!canSpeak}
          rows={3}
          placeholder="Enter text for MOTHER to speak..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none resize-none"
        />
      </div>

      {/* Speak Button */}
      <button
        onClick={handleSpeak}
        disabled={!canSpeak || !text.trim() || loading}
        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <span>🔊</span>
            Speak
          </>
        )}
      </button>

      {/* Audio Player */}
      <audio ref={audioRef} className="hidden" />

      {/* Now Playing */}
      {audioUrl && (
        <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => audioRef.current?.play()}
              className="w-10 h-10 flex items-center justify-center bg-cyan-500 rounded-full text-white hover:bg-cyan-400"
            >
              ▶
            </button>
            <div className="flex-1">
              <p className="text-sm text-white">Now Playing</p>
              <p className="text-xs text-gray-400 truncate">{text}</p>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-4 border-t border-gray-700 pt-4">
          <h3 className="text-sm text-gray-400 mb-2">Recent</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {history.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg"
              >
                <button
                  onClick={() => handleReplay(item.url)}
                  className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded-full text-xs hover:bg-gray-600"
                >
                  ▶
                </button>
                <p className="text-sm text-gray-300 truncate flex-1">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Notice */}
      <div className="mt-4 p-2 bg-gray-800/50 rounded-lg">
        <p className="text-xs text-gray-500">
          ✓ Explicit user action only • ✓ All interactions logged • ✗ No autonomous speech
        </p>
      </div>
    </div>
  );
}
