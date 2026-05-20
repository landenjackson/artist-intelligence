'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget({ artist }: { artist: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hey — I have data on ' + artist + '. Ask me anything: top tracks, albums, tour dates, fan stats, genre, or their story.' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg }]);
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist, message: userMsg }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.response || 'Something went wrong.' }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Failed to get a response. Try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setMessages([{ role: 'assistant', content: 'Alright, fresh start. Ask me anything about ' + artist + '.' }]);
  };

  return (
    <div className="chat-wrap">
      <div className="chat-header">
        <div className="chat-header-dot" />
        <span className="chat-header-title">Chat with {artist}</span>
        <button onClick={reset} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--steel)', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
          /reset
        </button>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => <div key={i} className={'msg ' + m.role}>{m.content}</div>)}
        {isLoading && <div className="msg assistant">Thinking...</div>}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input-row" onSubmit={send}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder={'Ask about ' + artist + '...'} disabled={isLoading} />
        <button type="submit" className="chat-send" disabled={isLoading || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
