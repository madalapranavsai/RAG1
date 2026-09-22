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
} from 'lucide-react';
import { api } from '../api/client';
import type { ChatSession, ChatMessage, A2UIPayload } from '../types';
import { A2UIRenderer } from '../components/a2ui/A2UIRenderer';
import { CitationCardWidget } from '../components/a2ui/CitationCardWidget';

export const Chat: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputContent, setInputContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);

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
    if (!window.confirm('Delete this conversation?')) return;
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950">
      {/* Left Chat Threads Sidebar */}
      <div className="hidden md:flex w-72 flex-col border-r border-slate-800 bg-slate-900/60 p-3">
        <button
          onClick={handleCreateSession}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2.5 text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all mb-3"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>

        <div className="flex-1 overflow-y-auto space-y-1">
          <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Recent Threads
          </p>
          {sessionsLoading ? (
            <p className="px-2 py-3 text-xs text-slate-500">Loading chats...</p>
          ) : sessions.length === 0 ? (
            <p className="px-2 py-3 text-xs text-slate-500">No chat sessions yet.</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition-all ${
                  activeSessionId === session.id
                    ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-medium'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                  <span className="truncate">{session.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  title="Delete thread"
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Conversation Stream */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white truncate max-w-sm">
              {sessions.find((s) => s.id === activeSessionId)?.title || 'DocuMind Assistant'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-[10px] font-mono text-indigo-300">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Gemini 2.5 Flash Grounded
            </span>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20">
                <BrainCircuit className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-white">How can I assist your team today?</h3>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Ask any question grounded in your uploaded workspace documents. DocuMind will provide
                accurate answers with citations and Generative A2UI widgets.
              </p>

              <div className="w-full space-y-2 text-left">
                {[
                  'What are the key takeaways from our uploaded documentation?',
                  'Can you compare the metrics in our quarterly report in a table?',
                  'Show a workflow diagram of our system architecture.',
                ].map((promptText, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(promptText)}
                    className="w-full text-left p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 transition-all flex items-center justify-between group"
                  >
                    <span>{promptText}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
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
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${
                      isUser
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-indigo-400 border border-slate-700'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
                  </div>

                  {/* Bubble Container */}
                  <div
                    className={`flex flex-col min-w-0 ${
                      isUser ? 'items-end' : 'items-start'
                    } max-w-2xl`}
                  >
                    <div
                      className={`rounded-2xl p-4 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                          : 'glass-card border border-slate-800 text-slate-200 shadow-lg'
                      }`}
                    >
                      {/* Markdown body (filtering out raw a2ui codeblock so clean widget takes its place) */}
                      <div className="prose prose-invert prose-xs max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: ({ node, className, children, ...props }) => {
                              const match = /language-(\w+)/.exec(className || '');
                              if (match && match[1] === 'a2ui') {
                                // Suppress raw codeblock rendering since A2UIRenderer handles it
                                return null;
                              }
                              return (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* Generative A2UI Widget */}
                      {msg.a2ui_payload && <A2UIRenderer payload={msg.a2ui_payload} />}

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
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 px-3 py-1 text-[11px] font-medium text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-400" />
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-indigo-400 border border-slate-700">
                <BrainCircuit className="w-4 h-4 animate-spin-slow" />
              </div>
              <div className="glass-card rounded-2xl p-4 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>DocuMind is retrieving workspace chunks and generating answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer */}
        <div className="border-t border-slate-800 bg-slate-900/70 p-4 backdrop-blur">
          <div className="max-w-3xl mx-auto relative flex items-center">
            <textarea
              rows={1}
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your workspace documents (e.g. 'Show comparison chart of revenues')..."
              className="w-full resize-none rounded-2xl bg-slate-950 border border-slate-700/80 pl-4 pr-12 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputContent.trim() || loading}
              className="absolute right-2.5 flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
