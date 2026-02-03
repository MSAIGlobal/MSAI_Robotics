// MotherT2VShell - Text-to-Video Multi-Model Generation
// Prompt → UID → Multi-model content → HLS Feed
// Images, Videos, Audio, Effects - Full production pipeline
'use client';

import { useState, useEffect, useRef } from 'react';

// Types
interface ContentUID {
  uid: string;
  prompt: string;
  created_at: string;
  status: 'pending' | 'generating' | 'processing' | 'ready' | 'streaming' | 'error';
  progress: number;
  stages: GenerationStage[];
  outputs: ContentOutput[];
  hls_url?: string;
  story_vector?: number[];
}

interface GenerationStage {
  name: string;
  model: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: number;
  started_at?: string;
  completed_at?: string;
  output?: string;
}

interface ContentOutput {
  type: 'image' | 'video' | 'audio' | 'effect' | 'scene';
  url: string;
  thumbnail?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface StoryMemory {
  uid: string;
  prompt: string;
  vector: number[];
  characters: string[];
  locations: string[];
  themes: string[];
  created_at: string;
}

interface MotherT2VShellProps {
  onContentReady?: (uid: string, hlsUrl: string) => void;
  apiEndpoint?: string;
  hlsBaseUrl?: string;
}

// Models used in pipeline
const PIPELINE_MODELS = [
  { id: 'script', name: 'Script Generation', model: 'MOTHER Story' },
  { id: 'scene', name: 'Scene Breakdown', model: 'MOTHER Director' },
  { id: 'image', name: 'Image Generation', model: 'Stable Diffusion XL' },
  { id: 'video', name: 'Video Generation', model: 'Runway Gen-3' },
  { id: 'audio', name: 'Audio/Music', model: 'MusicGen + Bark' },
  { id: 'effects', name: 'VFX/Transitions', model: 'MOTHER VFX' },
  { id: 'composite', name: 'Final Composite', model: 'MOTHER Editor' },
  { id: 'encode', name: 'HLS Encoding', model: 'FFmpeg HLS' },
];

export function MotherT2VShell({
  onContentReady,
  apiEndpoint = '/api/t2v',
  hlsBaseUrl = '/hls',
}: MotherT2VShellProps) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<'short' | 'medium' | 'long' | 'feature'>('medium');
  const [style, setStyle] = useState<'cinematic' | 'animated' | 'documentary' | 'music-video'>('cinematic');
  const [currentContent, setCurrentContent] = useState<ContentUID | null>(null);
  const [history, setHistory] = useState<ContentUID[]>([]);
  const [storyMemory, setStoryMemory] = useState<StoryMemory[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Duration mappings
  const DURATIONS = {
    'short': { label: '30s - 2min', seconds: 120 },
    'medium': { label: '5-15min', seconds: 900 },
    'long': { label: '30-60min', seconds: 3600 },
    'feature': { label: '90min+', seconds: 5400 },
  };

  // Load history
  useEffect(() => {
    const stored = localStorage.getItem('mother_t2v_history');
    if (stored) {
      setHistory(JSON.parse(stored));
    }
  }, []);

  // Connect to generation WebSocket
  const connectWebSocket = (uid: string) => {
    const wsUrl = apiEndpoint.replace('http', 'ws') + `/stream/${uid}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setCurrentContent(prev => prev ? { ...prev, ...data } : data);

      if (data.status === 'ready' && data.hls_url) {
        onContentReady?.(uid, data.hls_url);
      }
    };

    wsRef.current.onerror = () => {
      console.error('WebSocket error');
    };
  };

  // Generate content
  const generateContent = async () => {
    if (!prompt.trim() || isGenerating) return;

    const uid = `content_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const newContent: ContentUID = {
      uid,
      prompt: prompt.trim(),
      created_at: new Date().toISOString(),
      status: 'pending',
      progress: 0,
      stages: PIPELINE_MODELS.map(m => ({
        name: m.name,
        model: m.model,
        status: 'pending',
        progress: 0,
      })),
      outputs: [],
    };

    setCurrentContent(newContent);
    setIsGenerating(true);

    try {
      // Extract story elements for memory
      const storyElements = extractStoryElements(prompt);

      // Start generation
      const response = await fetch(`${apiEndpoint}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          prompt: prompt.trim(),
          duration: DURATIONS[duration].seconds,
          style,
          story_context: storyMemory.slice(-5),
        }),
      });

      if (response.ok) {
        // Connect to progress stream
        connectWebSocket(uid);

        // Add to story memory
        setStoryMemory(prev => [...prev, {
          uid,
          prompt: prompt.trim(),
          vector: [], // Would be set by backend
          ...storyElements,
          created_at: new Date().toISOString(),
        }].slice(-50));

        // Simulate progress for demo
        simulateProgress(newContent);
      }
    } catch (err) {
      console.error('Generation error:', err);
      setCurrentContent(prev => prev ? { ...prev, status: 'error' } : null);
    }
  };

  // Extract story elements from prompt
  const extractStoryElements = (text: string) => {
    // Simple extraction - in production, use NLP
    const characters = text.match(/(?:named?|called?|protagonist|hero|villain)\s+(\w+)/gi)?.map(m => m.split(' ').pop() || '') || [];
    const locations = text.match(/(?:in|at|on|near)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g)?.map(m => m.replace(/^(in|at|on|near)\s+(the\s+)?/, '')) || [];
    const themes = text.match(/(?:about|theme|story of)\s+(\w+)/gi)?.map(m => m.split(' ').pop() || '') || [];

    return { characters, locations, themes };
  };

  // Simulate progress for demo
  const simulateProgress = (content: ContentUID) => {
    let stageIndex = 0;
    let stageProgress = 0;

    const interval = setInterval(() => {
      stageProgress += Math.random() * 15;

      if (stageProgress >= 100) {
        stageProgress = 0;
        stageIndex++;

        if (stageIndex >= content.stages.length) {
          clearInterval(interval);
          setCurrentContent(prev => prev ? {
            ...prev,
            status: 'ready',
            progress: 100,
            hls_url: `${hlsBaseUrl}/${content.uid}/master.m3u8`,
            stages: prev.stages.map(s => ({ ...s, status: 'complete', progress: 100 })),
          } : null);
          setIsGenerating(false);

          // Save to history
          setHistory(prev => {
            const updated = [{ ...content, status: 'ready' as const, progress: 100 }, ...prev].slice(0, 20);
            localStorage.setItem('mother_t2v_history', JSON.stringify(updated));
            return updated;
          });
          return;
        }
      }

      setCurrentContent(prev => prev ? {
        ...prev,
        status: 'generating',
        progress: ((stageIndex / content.stages.length) * 100) + (stageProgress / content.stages.length),
        stages: prev.stages.map((s, i) => ({
          ...s,
          status: i < stageIndex ? 'complete' : i === stageIndex ? 'running' : 'pending',
          progress: i < stageIndex ? 100 : i === stageIndex ? stageProgress : 0,
        })),
      } : null);
    }, 500);
  };

  return (
    <div className="flex h-full bg-[#04060a] rounded-xl border border-gray-800 overflow-hidden">
      {/* Main Panel */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
            <h2 className="font-semibold text-white">MOTHER T2V</h2>
            <span className="text-xs text-gray-500">Text → Video → HLS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {storyMemory.length} stories in memory
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Input Section */}
          <div className="mb-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your video... (e.g., 'A cinematic journey through a neon-lit cyberpunk city at night, following a mysterious figure in a hooded coat...')"
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500"
            />

            {/* Options */}
            <div className="flex gap-4 mt-3">
              {/* Duration */}
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as typeof duration)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {Object.entries(DURATIONS).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              {/* Style */}
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as typeof style)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="animated">Animated</option>
                  <option value="documentary">Documentary</option>
                  <option value="music-video">Music Video</option>
                </select>
              </div>

              {/* Generate Button */}
              <div className="flex items-end">
                <button
                  onClick={generateContent}
                  disabled={!prompt.trim() || isGenerating}
                  className="px-8 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>

          {/* Current Generation */}
          {currentContent && (
            <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-white">
                    {currentContent.status === 'ready' ? '✓ Ready' : 'Generating...'}
                  </h3>
                  <p className="text-xs text-gray-500">UID: {currentContent.uid}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-400">
                    {Math.round(currentContent.progress)}%
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${currentContent.progress}%` }}
                />
              </div>

              {/* Pipeline Stages */}
              <div className="grid grid-cols-4 gap-2">
                {currentContent.stages.map((stage, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg text-xs ${
                      stage.status === 'complete' ? 'bg-green-500/20 text-green-400' :
                      stage.status === 'running' ? 'bg-purple-500/20 text-purple-400' :
                      stage.status === 'error' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-700/50 text-gray-500'
                    }`}
                  >
                    <p className="font-medium truncate">{stage.name}</p>
                    <p className="text-[10px] opacity-70">{stage.model}</p>
                    {stage.status === 'running' && (
                      <div className="w-full h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-purple-400 transition-all"
                          style={{ width: `${stage.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* HLS Player */}
              {currentContent.status === 'ready' && currentContent.hls_url && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Preview</span>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      {showPreview ? 'Hide' : 'Show'} Player
                    </button>
                  </div>
                  {showPreview && (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        src={currentContent.hls_url}
                        controls
                        className="w-full h-full"
                      />
                    </div>
                  )}
                  <div className="mt-2 p-2 bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-500">HLS Stream URL:</p>
                    <code className="text-xs text-cyan-400 break-all">
                      {currentContent.hls_url}
                    </code>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Generations</h3>
              <div className="grid grid-cols-2 gap-3">
                {history.slice(0, 6).map((item) => (
                  <div
                    key={item.uid}
                    onClick={() => setCurrentContent(item)}
                    className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-purple-500/50 cursor-pointer"
                  >
                    <p className="text-sm text-white truncate">{item.prompt}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded mt-2 inline-block ${
                      item.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                      item.status === 'error' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Story Memory Sidebar */}
      <div className="w-64 border-l border-gray-800 flex flex-col">
        <div className="p-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-400">Story Vector Memory</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {storyMemory.slice(-10).reverse().map((story) => (
            <div
              key={story.uid}
              className="p-2 bg-gray-800/50 rounded-lg text-xs"
            >
              <p className="text-gray-300 truncate">{story.prompt.slice(0, 50)}...</p>
              {story.characters.length > 0 && (
                <p className="text-purple-400 mt-1">
                  👤 {story.characters.join(', ')}
                </p>
              )}
              {story.locations.length > 0 && (
                <p className="text-cyan-400">
                  📍 {story.locations.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Pipeline Info */}
        <div className="p-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2">Pipeline Models:</p>
          <div className="space-y-1">
            {PIPELINE_MODELS.slice(0, 4).map((m) => (
              <div key={m.id} className="text-xs text-gray-400">
                {m.name}: <span className="text-purple-400">{m.model}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MotherT2VShell;
