import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip } from 'lucide-react';

interface User {
  id: number;
  anonName: string;
}

interface Message {
  id: number;
  content: string;
  createdAt: string;
  user: User | null;
}

interface ChatInterfaceProps {
  user: User;
  messages: Message[];
  onSendMessage: (content: string) => void;
  isConnected: boolean;
  onlineCount?: number;
}

export default function ChatInterface({ 
  user, 
  messages, 
  onSendMessage, 
  isConnected,
  onlineCount = 0
}: ChatInterfaceProps) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    const content = messageText.trim();
    if (!content || !isConnected) return;

    onSendMessage(content);
    setMessageText('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const getAvatarColor = (userId: number) => {
    const colors = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-teal-600',
      'from-red-500 to-pink-600',
      'from-yellow-500 to-orange-600',
      'from-indigo-500 to-purple-600',
      'from-pink-500 to-rose-600',
    ];
    return colors[userId % colors.length];
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="bg-destructive text-destructive-foreground text-center py-2 text-sm">
          <span>Соединение потеряно... Переподключение</span>
          <div className="inline-block w-4 h-4 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin ml-2"></div>
        </div>
      )}

      {/* Chat Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
            <span className="text-primary-foreground text-sm font-semibold">#</span>
          </div>
          <div>
            <h1 className="font-semibold text-card-foreground">Анонимный чат</h1>
            <p className="text-xs text-muted-foreground" data-testid="text-online-count">
              {onlineCount} участников
            </p>
          </div>
        </div>
        <button className="p-2 hover:bg-secondary rounded-full transition-colors">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
          </svg>
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              Добро пожаловать в анонимный чат!
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Общайтесь анонимно с другими участниками. Будьте взаимно вежливы.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.user?.id === user.id;
            
            return (
              <div 
                key={`${message.id}-${message.createdAt}`}
                className={`flex items-start space-x-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                data-testid={`message-${message.id}`}
              >
                <div className={`w-8 h-8 bg-gradient-to-br ${
                  isCurrentUser 
                    ? 'from-primary to-accent' 
                    : getAvatarColor(message.user?.id || 0)
                } rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs font-semibold">
                    {message.user ? getInitials(message.user.anonName) : '?'}
                  </span>
                </div>
                
                <div className={`flex-1 min-w-0 ${isCurrentUser ? 'text-right' : ''}`}>
                  <div className={`flex items-baseline space-x-2 mb-1 ${isCurrentUser ? 'justify-end' : ''}`}>
                    {isCurrentUser ? (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.createdAt)}
                        </span>
                        <span className="text-sm font-medium text-card-foreground">Вы</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-card-foreground">
                          {message.user?.anonName || 'Неизвестный'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.createdAt)}
                        </span>
                      </>
                    )}
                  </div>
                  
                  <div className={`rounded-lg px-3 py-2 ${
                    isCurrentUser 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-secondary/50 rounded-tl-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={messageText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Введите сообщение..."
              className="w-full resize-none bg-input border border-border rounded-2xl px-4 py-3 pr-12 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              rows={1}
              maxLength={1000}
              disabled={!isConnected}
              data-testid="input-message"
            />
            <button 
              className="absolute right-2 bottom-2 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
              data-testid="button-attach"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </div>
          
          <button 
            onClick={handleSend}
            disabled={!messageText.trim() || !isConnected}
            className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-2 text-right">
          <span className="text-xs text-muted-foreground" data-testid="text-char-counter">
            {messageText.length}/1000
          </span>
        </div>
      </div>
    </div>
  );
}
