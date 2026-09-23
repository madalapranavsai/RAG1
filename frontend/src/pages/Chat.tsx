import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  BrainCircuit,
  User,
  Sparkles,
  ChevronRight,
  Search,
  Copy,
  Check,
  CornerDownLeft,
} from 'lucide-react';
import { api } from '../api/client';
import type { ChatSession, ChatMessage, A2UIPayload } from '../types';
import { A2UIRenderer } from '../components/a2ui/A2UIRenderer';
import { MermaidWidget } from '../components/a2ui/MermaidWidget';
import { CitationCardWidget } from '../components/a2ui/CitationCardWidget';

export const Chat: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputContent, setInputContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    try {
      const res = await api.chat.listSessions();
      const list = res.chats || [];
      setSessions(list);
      if (list.length > 0 && !activeSessionId) {
        setActiveSessionId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const loadMessages = async (chatId: string) => {
    try {
      const res = await api.chat.getMessages(chatId);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleCreateSession = async () => {
    try {
      const res = await api.chat.createSession();
      const newSession = res.chat;
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
    } catch (err: any) {
      alert(`Could not create session: ${err?.message}`);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation dossier?')) return;
    try {
      await api.chat.deleteSession(id);
      const remaining = sessions.filter((s) => s.id !== id);
      setSessions(remaining);
      if (activeSessionId === id) {
        setActiveSessionId(remaining[0]?.id || null);
      }
    } catch (err: any) {
      alert(`Delete failed: ${err?.message}`);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputContent).trim();
    if (!text || loading) return;

    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      try {
        const newSessionRes = await api.chat.createSession();
        targetSessionId = newSessionRes.chat.id;
        setSessions((prev) => [newSessionRes.chat, ...prev]);
        setActiveSessionId(targetSessionId);
      } catch (err: any) {
        alert(`Failed to start session: ${err?.message}`);
        return;
      }
    }

    const tempUserMsg: ChatMessage = {
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputContent('');
    setLoading(true);

    try {
      const res = await api.chat.sendMessage(targetSessionId, text);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.response,
        citations: res.citations || [],
        follow_up_questions: res.follow_up_questions || [],
        a2ui_payload: res.a2ui_payload as A2UIPayload | null,
        crag_status: (res as any).crag_status || null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      // Update session title locally if it was "New Chat"
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId && s.title === 'New Chat'
            ? { ...s, title: text.slice(0, 35) + '...' }
            : s
        )
      );
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `**Error:** ${err?.message || 'Failed to generate response.'}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAssistantMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#faf9f5]">
      {/* Left Archival Thread Index */}
      <div className="hidden md:flex w-72 flex-col border-r border-[#e5e3dc] bg-[#f4f3ee] p-3">
        <button
          onClick={handleCreateSession}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1c1917] hover:bg-[#292524] text-white px-3 py-2.5 text-xs font-semibold shadow-sm transition-all interactive-press mb-3"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>New Inquiry Thread</span>
        </button>

        <div className="flex-1 overflow-y-auto space-y-1">
          <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-mono font-semibold text-[#78716c] uppercase tracking-wider">
            <span>Dossier Index</span>
            <span>({sessions.length})</span>
          </div>

          {sessionsLoading ? (
            <p className="px-2 py-3 text-xs text-[#a8a29e] font-mono">Loading archive...</p>
          ) : sessions.length === 0 ? (
            <p className="px-2 py-3 text-xs text-[#a8a29e]">No inquiry sessions yet.</p>
          ) : (
            sessions.map((session, sIdx) => {
              const isActive = activeSessionId === session.id;
              const indexStr = String(sIdx + 1).padStart(2, '0');

              return (
                <div
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-white text-[#1c1917] border border-[#d5d2c7] font-medium shadow-sm'
                      : 'text-[#57534e] hover:bg-[#eae8e1] hover:text-[#1c1917]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="font-mono text-[10px] text-[#a8a29e] shrink-0">{indexStr}</span>
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#1c1917]' : 'text-[#a8a29e]'}`} />
                    <span className="truncate">{session.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    title="Delete thread"
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#a8a29e] hover:text-rose-600 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Dossier Stream */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Editorial Masthead */}
        <div className="flex h-14 items-center justify-between border-b border-[#e5e3dc] bg-white px-6">
          <div className="flex items-center gap-2">
            <span className="font-editorial text-sm font-semibold text-[#1c1917] truncate max-w-sm">
              {sessions.find((s) => s.id === activeSessionId)?.title || 'Research Dossier Assistant'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="stamp-badge font-mono text-[10px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Gemini 2.5 Flash · Grounded
            </span>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-[#e5e3dc] text-[#1c1917] mb-4 shadow-sm">
                <BrainCircuit className="h-6 w-6 text-[#1c1917]" />
              </div>
              <h3 className="font-editorial text-xl font-semibold text-[#1c1917] tracking-tight">
                Begin Workspace Inquiry
              </h3>
              <p className="text-xs text-[#57534e] mt-1.5 mb-6 max-w-md leading-relaxed">
                Query your isolated document repository. Every synthesis includes verifiable
                citations, grounded excerpts, and generative analytical figures.
              </p>

              <div className="w-full space-y-2 text-left">
                {[
                  'What are the core conclusions and findings in our documents?',
                  'Can you summarize the timeline of key operational milestones?',
                  'Generate a structured comparative table of reported metrics.',
                ].map((promptText, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(promptText)}
                    className="w-full text-left p-3.5 rounded-lg bg-white hover:bg-[#faf9f5] border border-[#e5e3dc] hover:border-[#1c1917] text-xs text-[#44403c] transition-all flex items-center justify-between group shadow-sm interactive-press"
                  >
                    <span>{promptText}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#a8a29e] group-hover:text-[#1c1917] transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-3xl ${
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                      isUser
                        ? 'bg-[#1c1917] text-white'
                        : 'bg-white text-[#1c1917] border border-[#e5e3dc]'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                  </div>

                  {/* Bubble Container */}
                  <div
                    className={`flex flex-col min-w-0 ${
                      isUser ? 'items-end' : 'items-start'
                    } max-w-2xl`}
                  >
                    <div
                      className={`rounded-xl p-4 sm:p-5 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-[#1c1917] text-[#faf9f5] shadow-sm'
                          : 'paper-sheet border border-[#e5e3dc] text-[#292524] bg-white'
                      }`}
                    >
                      {/* Top Action Header on Assistant Response */}
                      {!isUser && (
                        <div className="flex items-center justify-between border-b border-[#e5e3dc] pb-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#78716c]">
                              DocuMind Archive // Synthesis
                            </span>
                            {msg.crag_status && msg.crag_status.rewritten && (
                              <span className="inline-flex items-center gap-1 rounded bg-[#f4f3ee] border border-[#e5e3dc] px-1.5 py-0.5 text-[9px] text-[#44403c] font-mono">
                                <Search className="w-2.5 h-2.5 text-[#78716c] shrink-0" />
                                <span>CRAG Rewritten</span>
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleCopyAssistantMessage(msg.content, idx)}
                            title="Copy response text"
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-[#78716c] hover:text-[#1c1917] hover:bg-[#f4f3ee] transition-colors"
                          >
                            {copiedMsgIdx === idx ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700 font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Markdown body with dynamic A2UI & Mermaid block execution */}
                      <div className={`prose ${isUser ? 'text-white' : 'prose-stone'} max-w-none text-xs leading-relaxed`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: ({ node, className, children, ...props }) => {
                              const match = /language-(\w+)/.exec(className || '');
                              const lang = match ? match[1] : '';

                              if (lang === 'a2ui') {
                                try {
                                  const parsed = JSON.parse(String(children).trim());
                                  return <A2UIRenderer payload={parsed} />;
                                } catch {
                                  return null;
                                }
                              }

                              if (lang === 'mermaid') {
                                return <MermaidWidget definition={String(children).trim()} />;
                              }

                              return (
                                <code className={`${className} font-mono text-[11px]`} {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* Generative A2UI Widget if not already inlined in the markdown */}
                      {msg.a2ui_payload &&
                        !msg.content.includes('```a2ui') &&
                        !msg.content.includes('```mermaid') && (
                          <A2UIRenderer payload={msg.a2ui_payload} />
                        )}

                      {/* Grounded Citations Drawer */}
                      {msg.citations && msg.citations.length > 0 && (
                        <CitationCardWidget citations={msg.citations} />
                      )}
                    </div>

                    {/* Follow-up Question Suggestions */}
                    {msg.follow_up_questions && msg.follow_up_questions.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {msg.follow_up_questions.map((fq, fqIdx) => (
                          <button
                            key={fqIdx}
                            onClick={() => handleSendMessage(fq)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e5e3dc] px-3 py-1 text-[11px] font-medium text-[#44403c] hover:border-[#1c1917] hover:text-[#1c1917] transition-all shadow-sm interactive-press"
                          >
                            <Sparkles className="w-3 h-3 text-[#78716c]" />
                            <span>{fq}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex gap-3 max-w-3xl mr-auto">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#1c1917] border border-[#e5e3dc]">
                <BrainCircuit className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="paper-sheet rounded-xl p-4 border border-[#e5e3dc] text-xs text-[#57534e] flex items-center gap-2 bg-white">
                <span className="w-2 h-2 rounded-full bg-[#1c1917] animate-ping" />
                <span>Retrieving workspace documents and synthesizing dossier response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer */}
        <div className="border-t border-[#e5e3dc] bg-white p-4">
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="relative flex items-center">
              <textarea
                rows={1}
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask an analytical question regarding your uploaded documents..."
                className="w-full resize-none rounded-xl bg-[#faf9f5] border border-[#d5d2c7] pl-4 pr-12 py-3 text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917] focus:bg-white transition-all shadow-inner"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputContent.trim() || loading}
                className="absolute right-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[#1c1917] hover:bg-[#292524] text-white disabled:opacity-30 disabled:hover:bg-[#1c1917] transition-all shadow-sm interactive-press"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#a8a29e] px-1 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-[#f4f3ee] border border-[#e5e3dc] text-[#57534e]">
                  Enter
                </span>
                <span>to send</span>
                <span className="mx-0.5">·</span>
                <span className="px-1.5 py-0.5 rounded bg-[#f4f3ee] border border-[#e5e3dc] text-[#57534e]">
                  Shift + Enter
                </span>
                <span>for newline</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[#78716c]">
                <CornerDownLeft className="w-3 h-3 text-[#a8a29e]" />
                <span>DocuMind Grounded RAG</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
