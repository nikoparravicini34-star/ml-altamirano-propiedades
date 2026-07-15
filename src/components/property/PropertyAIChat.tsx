import { useEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, User } from 'lucide-react';
import type { Property } from '../../types';
import {
  answerPropertyQuestion,
  SUGGESTED_QUESTIONS,
} from '../../lib/propertyAssistant';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface PropertyAIChatProps {
  property: Property;
}

export default function PropertyAIChat({ property }: PropertyAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hola, soy el asistente de esta publicación. Puedo responderte sobre "${property.title}" usando únicamente los datos reales de la ficha. ¿Qué te gustaría saber?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset chat when navigating to another property
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hola, soy el asistente de esta publicación. Puedo responderte sobre "${property.title}" usando únicamente los datos reales de la ficha. ¿Qué te gustaría saber?`,
      },
    ]);
    setInput('');
    setTyping(false);
  }, [property.id, property.title]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || typing) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: q,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Brief delay so the typing indicator feels natural
    await new Promise((r) => setTimeout(r, 450 + Math.min(q.length * 12, 600)));

    const answer = answerPropertyQuestion(property, q);
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: answer,
      },
    ]);
    setTyping(false);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="bg-graphite rounded-2xl shadow-soft border border-white/10 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-primary to-graphite">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary border border-accent/30 flex items-center justify-center shrink-0 shadow-soft">
            <Sparkles size={18} className="text-accent" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-white">
              Preguntale a la IA sobre esta propiedad
            </h2>
            <p className="text-sm text-text-light mt-1 leading-relaxed">
              Consultá en lenguaje natural. Las respuestas se basan solo en los datos de esta publicación.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="px-4 sm:px-6 py-5 h-[320px] overflow-y-auto space-y-3 bg-primary"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <m.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-graphite border border-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} className="text-accent" />
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gold-gradient text-[#1B1B1B] rounded-br-md'
                    : 'bg-graphite text-white border border-white/10 shadow-soft rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={14} className="text-accent" />
                </div>
              )}
            </m.div>
          ))}
        </AnimatePresence>

        {typing && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-full bg-graphite border border-accent/20 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-accent" />
            </div>
            <div className="bg-graphite border border-white/10 rounded-2xl rounded-bl-md px-4 py-3 shadow-soft">
              <p className="text-xs text-text-light flex items-center gap-2">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
                </span>
                La IA está escribiendo...
              </p>
            </div>
          </m.div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 sm:px-6 pb-3 flex flex-wrap gap-2 bg-primary">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void ask(q)}
              disabled={typing}
              className="text-[11px] px-3 py-1.5 rounded-full border border-white/15 bg-graphite text-white/80 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-4 sm:px-6 py-4 border-t border-white/10 bg-graphite flex gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribí tu pregunta sobre esta propiedad..."
          disabled={typing}
          className="flex-1 input-premium disabled:opacity-60"
          aria-label="Pregunta para la IA"
        />
        <button
          type="submit"
          disabled={typing || !input.trim()}
          className="btn-primary px-5 py-2.5 text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={16} />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </m.div>
  );
}
