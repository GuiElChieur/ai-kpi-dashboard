import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Sparkles, AlertTriangle, TrendingUp, MessageSquare, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };

const QUICK_PROMPTS = [
  { label: 'Détecter les anomalies', icon: AlertTriangle, prompt: 'Analyse les données et détecte toutes les anomalies critiques : OT en retard, écarts de charge, dérives budget, problèmes d\'approvisionnement.' },
  { label: 'Résumé du projet', icon: Sparkles, prompt: 'Fais un résumé complet de l\'état du projet avec les points clés, risques et recommandations.' },
  { label: 'Prédictions', icon: TrendingUp, prompt: 'Quelles sont tes prédictions sur l\'évolution du projet ? Y a-t-il des risques de retard ?' },
  { label: 'Chat libre', icon: MessageSquare, prompt: '' },
];

interface AIChatProps {
  kpiSummary: string;
}

export function AIChat({ kpiSummary }: AIChatProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Msg = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-kpi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages, kpiSummary }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(err.error || `Erreur ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantSoFar += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${e instanceof Error ? e.message : 'Erreur de communication avec l\'IA'}` }]);
    }

    setIsLoading(false);
  }, [messages, isLoading, kpiSummary]);

  return (
    <div className="space-y-4 animate-fade-in">
      {messages.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_PROMPTS.map((qp) => (
            <Card
              key={qp.label}
              className="glass-card cursor-pointer hover:shadow-lg transition-all hover:border-primary/30 group"
              onClick={() => qp.prompt && sendMessage(qp.prompt)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <qp.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{qp.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bot className="h-4 w-4" /> Analyse IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    )}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez une question sur vos données..."
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          disabled={isLoading}
          className="bg-card"
        />
        <Button onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
