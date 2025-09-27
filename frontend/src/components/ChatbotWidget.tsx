import React, { useMemo, useRef, useState } from 'react';
import { createChatBotMessage, Chatbot } from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import { useOmIntentExecutor } from '../hooks/useOmIntentExecutor';

function ActionProvider({ createChatBotMessage, setState, children }: any) {
  const { execute } = useOmIntentExecutor();
  const pendingRef = useRef<Promise<void> | null>(null);

  const handleUserMessage = async (message: string) => {
    const reply = await execute(message);
    const botMessage = createChatBotMessage(reply);
    setState((prev: any) => ({ ...prev, messages: [...prev.messages, botMessage] }));
  };

  return React.Children.map(children, (child: any) => {
    return React.cloneElement(child, {
      actions: {
        handleUserMessage,
      },
    });
  });
}

function MessageParser({ children, actions }: any) {
  const parse = (message: string) => {
    actions.handleUserMessage(message);
  };
  return React.Children.only(React.cloneElement(children, { parse, actions }));
}

function BotAvatar() {
  return (
    <div style={{ background: '#2563eb', color: 'white', width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
      OM
    </div>
  );
}

export default function ChatbotWidget() {
  const config = useMemo(() => ({
    initialMessages: [createChatBotMessage('Hi! Ask me about balances, transactions, batches, cash box. Examples: balance in "John Doe" account; recent 5 transactions in "Jane Smith" account; all transactions in haircare or miscellaneous batch; online transactions this month; cash box transactions')],
    botName: 'OM Assistant',
    customComponents: {
      botAvatar: (props: any) => <BotAvatar />,
    },
    customStyles: {
      botMessageBox: { backgroundColor: '#2563eb' },
      chatButton: { backgroundColor: '#2563eb' },
    },
  }), []);

  return (
    <div style={{ width: 360, maxWidth: '90vw' }}>
      <Chatbot config={config as any} messageParser={MessageParser as any} actionProvider={ActionProvider as any} placeholderText="Type here..." />
    </div>
  );
}

