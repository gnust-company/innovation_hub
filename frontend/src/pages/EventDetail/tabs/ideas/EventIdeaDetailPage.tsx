import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Edit2, Star, Trophy, Link as LinkIcon, Trash2,
  MessageCircle, ChevronDown, ChevronRight,
  AlertCircle, BookOpen, Target, FlaskConical, Lightbulb,
} from 'lucide-react';
import { eventsApi } from '@/api/events';
import { commentsApi } from '@/api/comments';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Avatar } from '@/components/ui/Avatar';
import { TipTapRenderer } from '@/components/ui/TipTapRenderer';
import { ScoringPanel } from './ScoringPanel';
import { IdeaFormModal } from './IdeaFormModal';
import { formatDate, timeAgo } from '@/utils/helpers';
import type { EventObject, EventIdeaObject, EventTeamObject, Comment as CommentType } from '@/types';

interface EventIdeaDetailPageProps {
  event: EventObject;
  myTeam: EventTeamObject | null;
}

export const EventIdeaDetailPage: React.FC<EventIdeaDetailPageProps> = ({ event, myTeam }) => {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [idea, setIdea] = useState<EventIdeaObject | null>(null);
  const [loading, setLoading] = useState(true);

  // Comments
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');

  // Edit modal
  const [showEditForm, setShowEditForm] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Collapsible fields
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({
    user_problem: true,
    user_scenarios: true,
    user_expectation: true,
    research: true,
    solution: true,
  });

  const fetchIdea = useCallback(async () => {
    if (!ideaId) return;
    setLoading(true);
    try {
      const data = await eventsApi.getIdea(event.id, ideaId);
      setIdea(data);
    } catch {
      navigate(`/events/${event.id}?tab=ideas`, { replace: true });
    } finally {
      setLoading(false);
    }
  }, [event.id, ideaId, navigate]);

  useEffect(() => { fetchIdea(); }, [fetchIdea]);

  const fetchComments = useCallback(async () => {
    if (!ideaId) return;
    try {
      const response = await commentsApi.list({ target_id: ideaId, target_type: 'event_idea' });
      setComments(response.items || []);
    } catch { /* silent */ }
  }, [ideaId]);

  useEffect(() => { if (idea) fetchComments(); }, [idea, fetchComments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaId || !newComment.trim()) return;
    try {
      await commentsApi.create({ target_id: ideaId, target_type: 'event_idea', content: newComment });
      setNewComment('');
      await fetchComments();
    } catch { /* silent */ }
  };

  const isActive = event.status === 'active';
  const canEdit = isActive && idea && (
    isAdmin ||
    idea.author_id === user?.id ||
    (myTeam?.leader_id === user?.id && idea.team_id === myTeam?.id)
  );
  const canDelete = isActive && idea && (
    isAdmin ||
    idea.author_id === user?.id ||
    (myTeam?.leader_id === user?.id && idea.team_id === myTeam?.id)
  );

  const handleDelete = async () => {
    if (!idea) return;
    setDeleting(true);
    try {
      await eventsApi.deleteIdea(event.id, idea.id);
      navigate(`/events/${event.id}?tab=ideas`, { replace: true });
    } catch { /* silent */ }
    finally { setDeleting(false); }
  };

  const toggleField = (key: string) => {
    setExpandedFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const FIELD_META: {
    key: keyof Pick<EventIdeaObject, 'user_problem' | 'user_scenarios' | 'user_expectation' | 'research' | 'solution'>;
    icon: React.ElementType;
    color: string;
    borderColor: string;
    bgColor: string;
  }[] = [
    { key: 'user_problem', icon: AlertCircle, color: 'text-red-600', borderColor: 'border-red-200', bgColor: 'bg-red-50' },
    { key: 'user_scenarios', icon: BookOpen, color: 'text-blue-600', borderColor: 'border-blue-200', bgColor: 'bg-blue-50' },
    { key: 'user_expectation', icon: Target, color: 'text-purple-600', borderColor: 'border-purple-200', bgColor: 'bg-purple-50' },
    { key: 'research', icon: FlaskConical, color: 'text-teal-600', borderColor: 'border-teal-200', bgColor: 'bg-teal-50' },
    { key: 'solution', icon: Lightbulb, color: 'text-amber-600', borderColor: 'border-amber-200', bgColor: 'bg-amber-50' },
  ];

  const renderCollapsibleField = (
    fieldKey: string,
    meta: typeof FIELD_META[number],
    content: unknown,
  ) => {
    const isExpanded = expandedFields[fieldKey] !== false;
    const Icon = meta.icon;
    const label = t(`events.ideas.fields.${fieldKey}`);

    return (
      <div key={fieldKey} className={`border ${meta.borderColor} rounded-lg overflow-hidden mb-4`}>
        <button
          type="button"
          onClick={() => toggleField(fieldKey)}
          className={`w-full flex items-center justify-between px-4 py-3 ${meta.bgColor} hover:opacity-80 transition-opacity`}
        >
          <div className="flex items-center gap-2">
            {isExpanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />
            }
            <Icon className={`h-4.5 w-4.5 ${meta.color}`} />
            <h4 className={`text-sm font-bold ${meta.color}`}>{label}</h4>
          </div>
          {!content && (
            <span className="text-xs text-muted-foreground italic">{t('events.ideas.fields.empty')}</span>
          )}
        </button>
        {isExpanded && (
          <div className="p-4">
            {content
              ? <TipTapRenderer content={content as Parameters<typeof TipTapRenderer>[0]['content']} />
              : <p className="text-sm text-muted-foreground italic">{t('events.ideas.fields.no_content')}</p>
            }
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="px-4 py-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-6" />
        <div className="h-40 bg-muted rounded-lg mb-4" />
        <div className="h-40 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!idea) return null;

  return (
    <div className="px-4 py-6">
      {/* Back button */}
      <button
        onClick={() => navigate(`/events/${event.id}?tab=ideas`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground/70 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('events.ideas.back_to_list')}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-section-heading font-bold text-foreground break-words">{idea.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Avatar
                src={idea.author?.avatar_url}
                name={idea.author?.full_name || idea.author?.username}
                size="sm"
              />
              {idea.author?.full_name || idea.author?.username}
            </span>
            {idea.team && (
              <span className="flex items-center gap-1 bg-muted px-2.5 py-0.5 rounded-full">
                <Trophy className="h-3 w-3" />
                {idea.team.name}
                {idea.team.slogan && (
                  <span className="text-muted-foreground italic ml-1">"{idea.team.slogan}"</span>
                )}
              </span>
            )}
            <span>{formatDate(idea.created_at)}</span>
            {idea.source_type === 'linked' && (
              <span className="flex items-center gap-1 text-blue-500">
                <LinkIcon className="h-3.5 w-3.5" />
                {t('events.ideas.linked')}
              </span>
            )}
            {idea.total_score !== null && (
              <span className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 px-2.5 py-0.5 rounded-full">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-yellow-700">{idea.total_score.toFixed(1)}</span>
                <span className="text-yellow-500">({idea.score_count})</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Edit2 className="h-4 w-4" />}
              onClick={() => setShowEditForm(true)}
            >
              {t('events.ideas.edit')}
            </Button>
          )}
          {canDelete && !showDeleteConfirm && (
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              {t('events.ideas.delete')}
            </Button>
          )}
          {showDeleteConfirm && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">{t('events.ideas.delete_confirm')}</span>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleting}
                onClick={handleDelete}
              >
                {t('common.confirm')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Linked source info */}
      {idea.source_type === 'linked' && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mb-6">
          {t('events.ideas.linked_source')}
        </div>
      )}

      {/* Content fields */}
      {FIELD_META.map(meta => renderCollapsibleField(meta.key, meta, idea[meta.key]))}

      {/* Scoring panel — editable for reviewers, read-only for viewers */}
      <ScoringPanel
        event={event}
        idea={idea}
        readOnly={!(idea.can_score && isActive)}
        onScoreUpdated={() => fetchIdea()}
      />

      {/* Comments */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-feature-title font-semibold text-foreground">
              {t('comments.title', { count: comments.length })}
            </h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isActive && (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <Textarea
                placeholder={t('comments.add_placeholder')}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={!newComment.trim()}>{t('comments.post')}</Button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">{t('comments.no_comments')}</p>
            ) : (
              comments.map((comment) => {
                const commentAuthorName = comment.author?.full_name || comment.author?.username || 'Unknown';
                const isOwnComment = user?.id === comment.author_id;
                return (
                  <div
                    key={comment.id}
                    className={`flex gap-3 p-4 rounded-lg ${
                      isOwnComment ? 'bg-primary-50' : 'bg-secondary'
                    }`}
                  >
                    <Avatar src={comment.author?.avatar_url} name={commentAuthorName} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">{commentAuthorName}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
                      </div>
                      <div className="whitespace-pre-wrap break-words text-foreground/70">
                        {comment.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showEditForm && idea && (
        <IdeaFormModal
          event={event}
          idea={idea}
          isOpen={showEditForm}
          onClose={() => setShowEditForm(false)}
          onSaved={() => { setShowEditForm(false); fetchIdea(); }}
        />
      )}
    </div>
  );
};

