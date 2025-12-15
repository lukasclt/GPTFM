import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon } from 'lucide-react';
import { ChatMessage, User } from '../types';

interface ChatWindowProps {
  user: User;
  onSendMessage: (text: string) => void;
  messages: ChatMessage[];
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ user, onSendMessage, messages }) => {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/90 rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-3 border-b border-white/10 bg-black/40">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Chat da Estação</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.userId === user.id ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.isSystem ? 'bg-green-500/20 text-green-500' : 'bg-gray-700'}`}>
              {msg.isSystem ? <span className="text-xs font-bold">IA</span> : <UserIcon className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] flex flex-col ${msg.userId === user.id ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-gray-500 mb-1 block">{msg.username}</span>
              <div className={`px-3 py-2 rounded-2xl text-sm ${
                msg.isSystem 
                  ? 'bg-green-900/20 text-green-200 border border-green-500/20' 
                  : msg.userId === user.id 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-800 text-gray-200'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-black/40 border-t border-white/10">
        <div className="relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite algo..."
            className="w-full bg-gray-800 border-none rounded-full py-2 pl-4 pr-10 text-sm text-white focus:ring-1 focus:ring-green-500"
          />
          <button 
            type="submit" 
            disabled={!text.trim()}
            className="absolute right-1 top-1 p-1.5 bg-green-500 text-black rounded-full hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </form>
    </div>
  );
};