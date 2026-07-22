import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2, MessageSquare, Zap, User, Bot, Network } from 'lucide-react';
import AnswerRenderer from './AnswerRenderer';

// Generate a UUID v4 for session management
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ── Typing indicator ─────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center space-x-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#eab308]"
          style={{
            animation: 'bounce-dot 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

/* ── Single chat bubble ───────────────────────────────────────────── */
function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      {/* Avatar */}
      <div
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mb-1"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #eab308 0%, #d97706 100%)'
            : 'rgba(255,255,255,0.06)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {isUser
          ? <User className="w-3.5 h-3.5 text-black" />
          : <Bot className="w-3.5 h-3.5 text-[#eab308]" />}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[82%]`}>
        <div
          className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={isUser ? {
            background: 'linear-gradient(135deg, rgba(234,179,8,0.18) 0%, rgba(234,179,8,0.08) 100%)',
            border: '1px solid rgba(234,179,8,0.3)',
            color: '#f5f0e8',
            borderBottomRightRadius: '4px',
          } : {
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#d1d5db',
            borderBottomLeftRadius: '4px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
          }}
        >
          {isUser
            ? <p className="text-sm">{msg.content}</p>
            : <AnswerRenderer text={msg.content} />}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-[9px] text-gray-600 font-mono">{formatTime(msg.ts)}</span>
          {msg.latency && (
            <span className="flex items-center text-[9px] text-gray-600 space-x-0.5">
              <Zap className="w-2.5 h-2.5 text-[#eab308]" />
              <span>{(msg.latency / 1000).toFixed(2)}s</span>
            </span>
          )}
          {msg.nodes?.length > 0 && (
            <span className="flex items-center text-[9px] text-gray-600 space-x-0.5">
              <Network className="w-2.5 h-2.5 text-[#60a5fa]" />
              <span>{msg.nodes.length} nodes</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main ChatPanel ───────────────────────────────────────────────── */
export default function ChatPanel({ onNodesUpdate }) {
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [sessionId, setSessionId]   = useState(() => uuid());
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const listRef   = useRef(null);

  // Auto-scroll to bottom of the chat container when messages change (does not scroll window)
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch('https://et-hackathon-backend.vercel.app/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: trimmed, sessionId }),
      });

      const data = await resp.json();

      if (!resp.ok) throw new Error(data.error || 'Chat request failed');

      const aiMsg = {
        role:    'ai',
        content: data.answer,
        ts:      Date.now(),
        latency: data.latency,
        nodes:   data.retrievedNodes || [],
        links:   data.retrievedLinks || [],
      };

      setMessages(prev => [...prev, aiMsg]);
      if (onNodesUpdate && data.retrievedNodes?.length > 0) {
        onNodesUpdate(data.retrievedNodes, data.retrievedLinks);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role:    'ai',
        content: `⚠️ Error: ${err.message}`,
        ts:      Date.now(),
        error:   true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [loading, sessionId, onNodesUpdate]);

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };

  const handleNewChat = async () => {
    const newId = uuid();
    // Clear server-side history
    await fetch('https://et-hackathon-backend.vercel.app/api/chat/clear', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId }),
    }).catch(() => {});
    setSessionId(newId);
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  };

  const suggestedQuestions = [
    'How do open-loop servo feedback limitations cause joint jitter under load?',
    'What is the root cause of 403 Forbidden errors when loading Spline 3D assets?',
    'Explain inverse kinematics vs joint-angle control for 6DOF precision positioning.',
    'How does the Graph RAG engine resolve multi-hop entity relationships across P&IDs?',
  ];

  return (
    <div className="flex flex-col h-full min-h-[420px]" style={{ maxHeight: '600px' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[#eab308]/15 pb-3 mb-2 shrink-0">
        <span className="flex items-center space-x-1.5 text-xs font-mono tracking-widest text-gray-500 uppercase">
          <MessageSquare className="w-3.5 h-3.5 text-[#eab308]" />
          <span>Conversation</span>
          {messages.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#eab308]/10 text-[#eab308] text-[8px] font-bold">
              {Math.ceil(messages.length / 2)} turns
            </span>
          )}
        </span>
        <button
          onClick={handleNewChat}
          title="Start a new conversation"
          className="flex items-center space-x-1 text-[9px] font-mono text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded border border-transparent hover:border-red-500/20 hover:bg-red-500/5"
        >
          <Trash2 className="w-3 h-3" />
          <span>New Chat</span>
        </button>
      </div>

      {/* ── Message list ───────────────────────────────────────── */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-4 py-1"
        style={{ minHeight: 0 }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 py-6">
            <div className="w-12 h-12 rounded-2xl bg-[#eab308]/10 border border-[#eab308]/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-[#eab308]" />
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-mono mb-1">Graph-RAG Assistant ready</p>
              <p className="text-[10px] text-gray-600">Ask anything — I'll search the knowledge graph first.</p>
            </div>
            {/* Suggested questions */}
            <div className="flex flex-col w-full gap-2 mt-2 max-w-sm">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-[10px] text-left text-gray-400 px-3 py-2 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-[#eab308]/5 hover:border-[#eab308]/20 hover:text-gray-200 transition-all duration-200"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
            {loading && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-white/06 border border-white/10 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-[#eab308]" />
                </div>
                <div className="px-1 py-1 rounded-2xl bg-white/[0.03] border border-white/08" style={{ borderBottomLeftRadius: '4px' }}>
                  <TypingDots />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ──────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 mt-3 pt-3 border-t border-[#eab308]/10 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a follow-up question…"
          disabled={loading}
          className="flex-1 bg-white/[0.03] border border-[#eab308]/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#eab308]/50 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30"
          style={{
            background: input.trim() && !loading
              ? 'linear-gradient(135deg, #eab308 0%, #d97706 100%)'
              : 'rgba(255,255,255,0.05)',
          }}
        >
          <Send className="w-4 h-4" style={{ color: input.trim() && !loading ? '#000' : '#6b7280' }} />
        </button>
      </form>
    </div>
  );
}
