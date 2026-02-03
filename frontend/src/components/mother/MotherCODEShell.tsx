// MotherCODEShell - AI Coding Interface with GitHub Integration
// Code generation, memory, file management, repository integration
'use client';

import React, { useState, useRef, useEffect } from 'react';

// Types
interface CodeFile {
  id: string;
  path: string;
  content: string;
  language: string;
  modified: boolean;
  created_at: string;
}

interface CodeSession {
  id: string;
  name: string;
  files: CodeFile[];
  conversation: CodeMessage[];
  repo?: GitHubRepo;
}

interface CodeMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  code_blocks?: CodeBlock[];
  timestamp: Date;
}

interface CodeBlock {
  language: string;
  code: string;
  file_path?: string;
}

interface GitHubRepo {
  owner: string;
  name: string;
  branch: string;
  connected: boolean;
}

interface MotherCODEShellProps {
  githubToken?: string;
  onCodeGenerated?: (code: string, language: string) => void;
  apiEndpoint?: string;
}

export function MotherCODEShell({
  githubToken,
  onCodeGenerated,
  apiEndpoint = '/api/code',
}: MotherCODEShellProps) {
  const [session, setSession] = useState<CodeSession>({
    id: crypto.randomUUID(),
    name: 'New Session',
    files: [],
    conversation: [],
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeFile, setActiveFile] = useState<CodeFile | null>(null);
  const [showFiles, setShowFiles] = useState(true);
  const [repoInput, setRepoInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.conversation]);

  // Parse code blocks from response
  const parseCodeBlocks = (content: string): CodeBlock[] => {
    const blocks: CodeBlock[] = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
      });
    }

    return blocks;
  };

  // Detect language from file extension
  const detectLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
      css: 'css', scss: 'scss', html: 'html', json: 'json', md: 'markdown',
      sql: 'sql', sh: 'bash', yml: 'yaml', yaml: 'yaml',
    };
    return langMap[ext || ''] || 'text';
  };

  // Send coding request
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: CodeMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setSession(prev => ({
      ...prev,
      conversation: [...prev.conversation, userMessage],
    }));
    setInput('');
    setIsLoading(true);

    try {
      // Build context from files
      const fileContext = session.files
        .map(f => `// ${f.path}\n${f.content}`)
        .join('\n\n');

      const systemPrompt = `You are MOTHER CODE, an expert software engineer.
Current files in session:
${fileContext || 'No files yet.'}

Repository: ${session.repo ? `${session.repo.owner}/${session.repo.name} (${session.repo.branch})` : 'Not connected'}

Instructions:
- Write clean, production-ready code
- Include file paths in code blocks: \`\`\`typescript:src/file.ts
- Explain your changes briefly
- Follow best practices`;

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...session.conversation.slice(-10).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: input.trim() },
          ],
        }),
      });

      const data = await response.json();
      const content = data.content || data.message || '';
      const codeBlocks = parseCodeBlocks(content);

      const assistantMessage: CodeMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        code_blocks: codeBlocks,
        timestamp: new Date(),
      };

      // Auto-create files from code blocks
      const newFiles: CodeFile[] = [];
      codeBlocks.forEach(block => {
        // Check for file path in language tag (e.g., typescript:src/file.ts)
        const [lang, path] = block.language.split(':');
        if (path) {
          newFiles.push({
            id: crypto.randomUUID(),
            path,
            content: block.code,
            language: lang,
            modified: true,
            created_at: new Date().toISOString(),
          });
          onCodeGenerated?.(block.code, lang);
        }
      });

      setSession(prev => ({
        ...prev,
        conversation: [...prev.conversation, assistantMessage],
        files: [...prev.files.filter(f => !newFiles.find(nf => nf.path === f.path)), ...newFiles],
      }));

    } catch (err) {
      console.error('Code generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to GitHub repo
  const connectRepo = async () => {
    if (!repoInput.trim() || !githubToken) return;

    const [owner, name] = repoInput.split('/');
    if (!owner || !name) return;

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
        headers: { Authorization: `token ${githubToken}` },
      });

      if (response.ok) {
        const repo = await response.json();
        setSession(prev => ({
          ...prev,
          repo: {
            owner,
            name,
            branch: repo.default_branch,
            connected: true,
          },
        }));
      }
    } catch (err) {
      console.error('GitHub connection error:', err);
    }
  };

  // Push to GitHub
  const pushToGitHub = async (file: CodeFile) => {
    if (!session.repo || !githubToken) return;

    try {
      // Get current file SHA if exists
      let sha: string | undefined;
      try {
        const getResponse = await fetch(
          `https://api.github.com/repos/${session.repo.owner}/${session.repo.name}/contents/${file.path}?ref=${session.repo.branch}`,
          { headers: { Authorization: `token ${githubToken}` } }
        );
        if (getResponse.ok) {
          const data = await getResponse.json();
          sha = data.sha;
        }
      } catch { /* File doesn't exist */ }

      // Create/update file
      await fetch(
        `https://api.github.com/repos/${session.repo.owner}/${session.repo.name}/contents/${file.path}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `token ${githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Update ${file.path} via MOTHER CODE`,
            content: btoa(file.content),
            branch: session.repo.branch,
            sha,
          }),
        }
      );

      // Mark as not modified
      setSession(prev => ({
        ...prev,
        files: prev.files.map(f => f.id === file.id ? { ...f, modified: false } : f),
      }));

      alert(`Pushed ${file.path} to GitHub!`);
    } catch (err) {
      console.error('GitHub push error:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full bg-[#04060a] rounded-xl border border-gray-800 overflow-hidden">
      {/* File Explorer */}
      {showFiles && (
        <div className="w-64 border-r border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Files</span>
            <button
              onClick={() => setSession(prev => ({
                ...prev,
                files: [...prev.files, {
                  id: crypto.randomUUID(),
                  path: `untitled-${prev.files.length + 1}.ts`,
                  content: '',
                  language: 'typescript',
                  modified: true,
                  created_at: new Date().toISOString(),
                }],
              }))}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              + New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {session.files.map(file => (
              <div
                key={file.id}
                onClick={() => setActiveFile(file)}
                className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer ${
                  activeFile?.id === file.id ? 'bg-cyan-500/20' : 'hover:bg-gray-800'
                }`}
              >
                <span className="text-xs text-gray-500">📄</span>
                <span className="text-sm text-gray-300 truncate flex-1">{file.path}</span>
                {file.modified && <span className="w-2 h-2 bg-yellow-500 rounded-full" />}
              </div>
            ))}
          </div>

          {/* GitHub Connection */}
          <div className="p-3 border-t border-gray-800">
            {session.repo?.connected ? (
              <div className="text-xs text-green-400">
                ✓ {session.repo.owner}/{session.repo.name}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="owner/repo"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                />
                <button
                  onClick={connectRepo}
                  disabled={!githubToken}
                  className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50"
                >
                  Connect
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFiles(!showFiles)}
              className="text-gray-400 hover:text-white"
            >
              📁
            </button>
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <h2 className="font-semibold text-white">MOTHER CODE</h2>
          </div>
          {activeFile && session.repo?.connected && (
            <button
              onClick={() => pushToGitHub(activeFile)}
              className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
            >
              Push to GitHub
            </button>
          )}
        </div>

        {/* Code Editor / Chat Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {session.conversation.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <p className="text-lg mb-2">💻 MOTHER CODE</p>
                  <p className="text-sm">Describe what you want to build...</p>
                </div>
              )}

              {session.conversation.map((msg) => (
                <div key={msg.id} className={`${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                  <div className={`max-w-[90%] rounded-xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-green-500/20 text-green-50'
                      : 'bg-gray-800 text-gray-100'
                  }`}>
                    {/* Render code blocks specially */}
                    {msg.code_blocks?.length ? (
                      <div className="space-y-3">
                        <p className="text-sm">{msg.content.split('```')[0]}</p>
                        {msg.code_blocks.map((block, i) => (
                          <div key={i} className="bg-black rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-1 bg-gray-900">
                              <span className="text-xs text-gray-500">{block.language}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(block.code)}
                                className="text-xs text-gray-400 hover:text-white"
                              >
                                Copy
                              </button>
                            </div>
                            <pre className="p-3 text-sm text-green-400 overflow-x-auto">
                              <code>{block.code}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-1 px-4 py-3 bg-gray-800 rounded-xl w-fit">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to code... (Ctrl+Enter to send)"
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-green-500"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {session.files.length} files | {session.conversation.length} messages
                </span>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>

          {/* Active File Preview */}
          {activeFile && (
            <div className="w-1/2 border-l border-gray-800 flex flex-col">
              <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                <span className="text-sm text-gray-400">{activeFile.path}</span>
                <button
                  onClick={() => setActiveFile(null)}
                  className="text-gray-500 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <pre className="flex-1 p-4 text-sm text-green-400 overflow-auto bg-black">
                <code>{activeFile.content}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MotherCODEShell;
