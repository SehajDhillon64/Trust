import React, { useMemo, useState } from 'react';
import { useOmIntentExecutor } from '../hooks/useOmIntentExecutor';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function OmChatbot() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { execute } = useOmIntentExecutor();

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  async function onSend() {
    if (!canSend) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const reply = await execute(userMsg.content);
    const asst: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: reply };
    setMessages(prev => [...prev, asst]);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">OM Chatbot</h2>
        <div className="text-sm text-gray-500">Ask about balances, transactions, batches, and cash box</div>
      </div>
      <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-sm text-gray-600">Try questions like: What is balance in 'John Doe' account? Recent 5 transactions in 'Jane Smith' account. All transactions in haircare or miscellaneous batch. Recent online transactions for this month. Recent deposit batch transactions. Recent cash box transactions.</div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`whitespace-pre-wrap ${m.role === 'user' ? 'text-gray-900' : 'text-gray-800'}`}>
              <div className="text-xs uppercase text-gray-500 mb-1">{m.role === 'user' ? 'You' : 'Assistant'}</div>
              <div className="rounded-lg border px-3 py-2 bg-gray-50">{m.content}</div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-gray-200 flex items-center space-x-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Type a question..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          className="bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}

