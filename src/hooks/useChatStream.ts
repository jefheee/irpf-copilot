import { useState } from 'react';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    // Add user message to UI immediately
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setIsLoading(true);
    setError(null);

    // Prepare assistant message placeholder in UI
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userText,
          contextData: { status: "Aguardando upload de documentos na próxima iteração" }
        })
      });

      if (!response.ok) {
        throw new Error('Falha na comunicação com a IA.');
      }

      if (!response.body) {
        throw new Error('ReadableStream não suportado na resposta.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunkValue = decoder.decode(value, { stream: true });
          
          // Regex blindagem que remove caracteres invisíveis de controle (0x00 a 0x1F), 
          // EXCETO line feed (\n = 0x0A) e carriage return (\r = 0x0D).
          // Garantimos que a formatação em Markdown seja preservada perfeitamente.
          const cleanChunk = chunkValue.replace(/[\x00-\x09\x0b\x0c\x0e-\x1f]+/g, '');

          // Update the last message (the assistant placeholder)
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            
            if (newMessages[lastIndex].role === 'assistant') {
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                content: newMessages[lastIndex].content + cleanChunk
              };
            }
            return newMessages;
          });
        }
      }
    } catch (err: any) {
      console.error('SSE Error:', err);
      setError(err.message || 'Ocorreu um erro inesperado.');
      
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: `🚨 **Erro Crítico:** ${err.message || 'Falha na comunicação'}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage
  };
}
