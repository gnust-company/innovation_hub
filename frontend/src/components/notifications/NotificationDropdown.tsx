import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';
import { Avatar } from '@/components/ui/Avatar';
import { Popover } from '@/components/ui/Popover';
import type { Notification } from '@/types';

const EVENT_TITLE_SEPARATOR = ' · Event: ';

function splitEventIdeaTitle(title: string): { title: string; eventTitle: string } {
  if (!title.includes(EVENT_TITLE_SEPARATOR)) {
    return { title, eventTitle: '' };
  }
  const [ideaTitle, eventTitle] = title.split(EVENT_TITLE_SEPARATOR, 2);
  return { title: ideaTitle.trim(), eventTitle: eventTitle.trim() };
}

const NotificationItem: React.FC<{
  notification: Notification;
  onClick: (n: Notification) => void;
}> = ({ notification, onClick }) => {
  const { t } = useTranslation();

  const actorName = notification.actor?.full_name || notification.actor?.username || '?';
  const eventIdeaTitle = splitEventIdeaTitle(notification.target_title);
  const eventIdeaMessageKeys: Record<string, string> = {
    comment_added: 'notifications.comment_added_event_idea',
    event_scored: 'notifications.event_scored_event_idea',
  };
  const messageKey = notification.target_type === 'event_idea'
    && eventIdeaTitle.eventTitle
    && eventIdeaMessageKeys[notification.type]
      ? eventIdeaMessageKeys[notification.type]
      : `notifications.${notification.type}`;

  // Build translation params based on notification type
  const getTranslationParams = () => {
    const targetTypeLabel = notification.target_type === 'problem'
      ? t('notifications.target_problem')
      : notification.target_type === 'idea'
        ? t('notifications.target_idea')
        : notification.target_type === 'event_idea'
          ? t('notifications.target_event_idea')
          : t('notifications.target_event');
    const baseParams = {
      actor: actorName,
      title: eventIdeaTitle.title,
      event_title: eventIdeaTitle.eventTitle,
      target_type: targetTypeLabel,
    };

    switch (notification.type) {
      case 'comment_added':
        return {
          ...baseParams,
          detail: notification.action_detail || '',
        };
      case 'reaction_added': {
        const reactionEmojiMap: Record<string, string> = {
          like: '👍',
          dislike: '👎',
          insight: '💡',
        };
        return {
          ...baseParams,
          emoji: reactionEmojiMap[notification.action_detail || ''] || '👍',
        };
      }
      case 'vote_added':
        return {
          ...baseParams,
          stars: notification.action_detail || '?',
        };
      case 'status_changed': {
        const [oldStatus, newStatus] = (notification.action_detail || '').split(' → ');
        return {
          ...baseParams,
          old_status: oldStatus || '?',
          new_status: newStatus || '?',
        };
      }
      case 'room_idea_created':
        return baseParams;
      case 'event_join_request':
      case 'event_join_approved':
      case 'event_join_rejected':
        return { ...baseParams, team_name: notification.action_detail || '' };
      case 'event_idea_submitted':
        return { ...baseParams, idea_title: notification.action_detail || '' };
      case 'event_scored':
        return { ...baseParams, score_detail: notification.action_detail || '' };
      case 'event_created':
        return baseParams;
      case 'event_closed':
        return baseParams;
      case 'team_review_assigned':
        return { ...baseParams, team_name: notification.action_detail || '' };
      case 'team_disbanded':
        return { ...baseParams, team_name: notification.action_detail || '' };
      case 'team_lead_transferred':
        return { ...baseParams, new_leader: notification.action_detail || '' };
      default:
        return baseParams;
    }
  };

  const message = t(messageKey, getTranslationParams());

  const timeAgo = getTimeAgo(notification.created_at);

  return (
    <button
      onClick={() => onClick(notification)}
      className={`w-full text-left px-4 py-3 hover:bg-secondary transition-colors border-b border-border/50 last:border-b-0 ${
        !notification.is_read ? 'bg-primary-50/50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar
          src={notification.actor?.avatar_url}
          name={notification.actor?.full_name || notification.actor?.username}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-snug ${
              !notification.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'
            }`}
          >
            {message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
        </div>
        {!notification.is_read && (
          <span className="mt-1 h-2 w-2 rounded-full bg-primary-500 flex-shrink-0" />
        )}
      </div>
    </button>
  );
};

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString();
}

export const NotificationDropdown: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const bellRef = useRef<HTMLButtonElement>(null);

  const {
    notifications,
    unreadCount,
    total,
    isLoading,
    isDropdownOpen,
    toggleDropdown,
    closeDropdown,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
  } = useNotificationStore();

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      await markRead(n.id);
    }
    closeDropdown();
    if (n.target_type === 'problem') {
      navigate(`/problems/${n.target_id}`);
    } else if (n.target_type === 'event_idea') {
      navigate(`/events/${n.reference_id}/ideas/${n.target_id}`);
    } else if (n.target_type === 'idea') {
      navigate(`/ideas/${n.target_id}`);
    } else if (n.target_type === 'event') {
      // Route to correct tab based on notification type
      const teamTypes = ['event_join_request', 'event_join_approved', 'event_join_rejected', 'team_disbanded', 'team_lead_transferred'];
      const ideaTypes = ['team_review_assigned'];
      let tab = 'introduction';
      if (teamTypes.includes(n.type)) {
        tab = 'teams';
      } else if (ideaTypes.includes(n.type)) {
        tab = 'ideas';
      }
      navigate(`/events/${n.target_id}?tab=${tab}`);
    } else {
      navigate(`/ideas/${n.target_id}`);
    }
  };

  const handleViewMore = () => {
    const nextPage = Math.floor(notifications.length / 5) + 1;
    fetchNotifications(nextPage, 5);
  };

  return (
    <>
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={toggleDropdown}
        className="p-2 hover:bg-secondary rounded-lg relative transition-colors"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center bg-danger-500 text-white text-[10px] font-bold rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown via Popover (Portal) */}
      <Popover
        triggerRef={bellRef}
        open={isDropdownOpen}
        onClose={closeDropdown}
        align="right"
        gap={8}
        className="w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-border overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary">
          <h3 className="font-semibold text-foreground text-sm">
            {t('notifications.title')}
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t('notifications.mark_all_read')}
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t('notifications.no_notifications')}
            </div>
          ) : (
            <>
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClick={handleNotificationClick}
                />
              ))}
              {notifications.length < total && (
                <button
                  onClick={handleViewMore}
                  disabled={isLoading}
                  className="w-full py-3 text-sm text-primary-600 hover:text-primary-700 hover:bg-secondary font-medium transition-colors"
                >
                  {isLoading ? t('common.loading') : t('notifications.view_more')}
                </button>
              )}
            </>
          )}
        </div>
      </Popover>
    </>
  );
};
