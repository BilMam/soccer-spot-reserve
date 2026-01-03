import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';

const Conversation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { conversation, messages, isLoading, sendMessage, isSending, markAsRead } = useChat(id || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Marquer comme lu à l'ouverture
  useEffect(() => {
    if (id && user) {
      markAsRead();
    }
  }, [id, user]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Connexion requise</h2>
            <p className="text-muted-foreground mb-4">
              Veuillez vous connecter pour accéder à cette conversation
            </p>
            <Button onClick={() => navigate('/auth')}>Se connecter</Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Conversation introuvable</h2>
            <p className="text-muted-foreground mb-4">
              Cette conversation n'existe pas ou vous n'y avez pas accès
            </p>
            <Button onClick={() => navigate('/messages')}>Retour aux messages</Button>
          </Card>
        </div>
      </div>
    );
  }

  const fieldName = conversation.fields?.name || 'Terrain';
  const bookingDate = conversation.bookings?.booking_date
    ? format(new Date(conversation.bookings.booking_date), 'EEEE d MMMM yyyy', { locale: fr })
    : '';
  const bookingTime = conversation.bookings?.start_time?.slice(0, 5) || '';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 max-w-2xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/messages')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold truncate">{fieldName}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span className="truncate">{bookingDate}</span>
                <Clock className="w-3 h-3 ml-2" />
                <span>{bookingTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert système */}
      <div className="container mx-auto px-4 py-3 max-w-2xl">
        <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
            Les réservations PISport sont définitives et ne peuvent pas être annulées ou modifiées via le chat.
          </AlertDescription>
        </Alert>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Commencez la conversation en envoyant un message</p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isOwn={message.sender_id === user.id}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="container mx-auto max-w-2xl">
        <ChatInput
          onSend={sendMessage}
          isSending={isSending}
          disabled={conversation.status === 'closed'}
        />
      </div>
    </div>
  );
};

export default Conversation;
