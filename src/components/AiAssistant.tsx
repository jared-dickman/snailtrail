import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, X, Sparkles, Loader2 } from 'lucide-react';
import type { ServiceLocation } from '@/types/location';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AiAssistantProps {
  locations: ServiceLocation[];
  selectedLocation?: ServiceLocation | null;
}

export function AiAssistant({ locations, selectedLocation }: AiAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your FishTank AI assistant. Ask me about customers, schedules, tank care, or route optimization!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const context = buildContext(locations, selectedLocation);
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting. Make sure the API server is running!"
      }]);
    } finally {
      setLoading(false);
    }
  };

  const buildContext = (locs: ServiceLocation[], selected?: ServiceLocation | null) => {
    const overdueCount = locs.filter(l => {
      if (!l.nextService) return false;
      return new Date(l.nextService) < new Date();
    }).length;

    return {
      totalLocations: locs.length,
      overdueCount,
      selectedLocation: selected ? {
        name: selected.name,
        address: selected.address,
        tankType: selected.tankInfo?.type,
        tankSize: selected.tankInfo?.gallons,
        lastService: selected.lastService,
        nextService: selected.nextService,
        priority: selected.priority,
      } : null,
      locations: locs.map(l => ({
        name: l.name,
        status: l.status,
        priority: l.priority,
        tankType: l.tankInfo?.type,
      })),
    };
  };

  const quickPrompts = [
    "Which customers are overdue?",
    "Optimize today's route",
    "Tank care tips for reef",
    selectedLocation ? `Tell me about ${selectedLocation.name}` : "Summarize all customers",
  ];

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-4 h-14 w-14 rounded-full shadow-lg z-40"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-20 right-4 md:bottom-4 w-[340px] h-[480px] shadow-xl z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-semibold">FishTank AI</span>
          <Sparkles className="h-4 w-4" />
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Prompts */}
      {messages.length <= 2 && (
        <div className="px-3 py-2 border-t">
          <div className="flex flex-wrap gap-1">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => { setInput(prompt); }}
                className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about customers..."
            className="flex-1 h-10"
            disabled={loading}
          />
          <Button type="submit" size="icon" className="h-10 w-10" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
