import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ConversationWithDetails } from '@/types/chat';

interface ConversationItemProps {
  conversation: ConversationWithDetails;
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  const navigate = useNavigate();

  const fieldName = conversation.fields?.name || 'Terrain';
  const bookingDate = conversation.bookings?.booking_date
    ? format(new Date(conversation.bookings.booking_date), 'dd MMM', { locale: fr })
    : '';
  const bookingTime = conversation.bookings?.start_time?.slice(0, 5) || '';

  const otherName = conversation.other_participant?.full_name || 'Propriétaire';
  const initials = otherName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const lastMessagePreview = conversation.last_message?.body
    ? conversation.last_message.body.slice(0, 50) + (conversation.last_message.body.length > 50 ? '...' : '')
    : 'Aucun message';

  const lastMessageTime = conversation.last_message?.created_at
    ? format(new Date(conversation.last_message.created_at), 'HH:mm', { locale: fr })
    : '';

  const hasUnread = conversation.unread_count > 0;

  return (
    <div
      onClick={() => navigate(`/conversation/${conversation.id}`)}
      className={cn(
        'flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b',
        hasUnread && 'bg-primary/5'
      )}
    >
      <Avatar className="w-12 h-12 flex-shrink-0">
        <AvatarImage src={conversation.other_participant?.avatar_url || undefined} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn('font-medium truncate', hasUnread && 'font-semibold')}>
            {fieldName}
          </h3>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {lastMessageTime}
          </span>
        </div>

        <p className="text-sm text-muted-foreground truncate">
          {otherName}
        </p>

        <div className="flex items-center justify-between gap-2 mt-1">
          <p className={cn(
            'text-sm truncate',
            hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
          )}>
            {lastMessagePreview}
          </p>
          {hasUnread && (
            <Badge variant="default" className="flex-shrink-0 h-5 min-w-5 flex items-center justify-center">
              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          Réservation: {bookingDate} à {bookingTime}
        </p>
      </div>
    </div>
  );
}
