import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  MessageCircle,
  Star,
  Edit,
  Trash2,
  MoreVertical,
  Pin,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { ideasApi } from '@/api/ideas';
import { commentsApi } from '@/api/comments';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Popover } from '@/components/ui/Popover';
import { TipTapRenderer } from '@/components/ui/TipTapRenderer';
import { IDEA_STATUSES } from '@/utils/constants';
import { timeAgo, classNames } from '@/utils/helpers';
import { Avatar } from '@/components/ui/Avatar';
import type { Idea, Comment, ReactionType, IdeaStatus } from '@/types';

export const IdeaDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useUIStore();

  const [idea, setIdea] = useState<Idea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLButtonElement>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vote state
  const [hoverStars, setHoverStars] = useState(0);

  useEffect(() => {
    if (id) {
      fetchIdea();
      fetchComments();
    }
  }, [id]);

  const fetchIdea = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await ideasApi.getById(id);
      setIdea(data);
    } catch {
      showToast({ type: 'error', message: t('ideas.load_error') });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    try {
      const response = await commentsApi.list({ target_id: id, target_type: 'idea' });
      setComments(response.items || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const canModify = user && idea && (
    user.id === idea.author_id || user.role === 'admin'
  );

  const handleReaction = async (type: ReactionType) => {
    if (!id || !idea) return;
    try {
      if (idea.user_reaction === type) {
        await ideasApi.removeReaction(id);
      } else {
        await ideasApi.addReaction(id, type);
      }
      const updated = await ideasApi.getById(id);
      setIdea(updated);
    } catch {
      showToast({ type: 'error', message: t('ideas.reaction_error') });
    }
  };

  const handleVote = async (stars: number) => {
    if (!id || !idea) return;
    try {
      if (idea.user_vote?.stars === stars) {
        await ideasApi.removeVote(id);
      } else {
        await ideasApi.vote(id, { stars });
      }
      const updated = await ideasApi.getById(id);
      setIdea(updated);
    } catch {
      showToast({ type: 'error', message: t('ideas.vote_error') });
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;
    try {
      await commentsApi.create({ target_id: id, target_type: 'idea', content: newComment });
      showToast({ type: 'success', message: t('comments.added') });
      setNewComment('');
      await fetchComments();
      const updated = await ideasApi.getById(id);
      setIdea(updated);
    } catch {
      showToast({ type: 'error', message: t('comments.add_error') });
    }
  };

  const handleStatusChange = async (newStatus: IdeaStatus) => {
    if (!id || !canModify) return;
    try {
      const updated = await ideasApi.update(id, { status: newStatus });
      setIdea(updated);
      showToast({ type: 'success', message: t('ideas.status_updated') });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast({ type: 'error', message: detail || t('ideas.status_error') });
    }
    setShowActions(false);
  };

  const openEditPage = () => {
    navigate(`/ideas/${id}/edit`);
    setShowActions(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await ideasApi.delete(id);
      showToast({ type: 'success', message: t('ideas.deleted_success') });
      setIsDeleteModalOpen(false);
      navigate(-1);
    } catch {
      showToast({ type: 'error', message: t('ideas.delete_error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePin = async () => {
    if (!id || !idea || user?.role !== 'admin') return;
    try {
      const updated = await ideasApi.update(id, { is_pinned: !idea.is_pinned });
      setIdea(updated);
      showToast({ type: 'success', message: idea.is_pinned ? t('ideas.unpin_success') : t('ideas.pin_success') });
    } catch {
      showToast({ type: 'error', message: t('ideas.pin_error') });
    }
    setShowActions(false);
  };

  if (isLoading || !idea) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const status = IDEA_STATUSES.find((s) => s.value === idea.status);
  const authorName = idea.author?.full_name || idea.author?.username || 'Unknown User';
  const authorAvatar = idea.author?.avatar_url;
  const isTerminal = ['submitted', 'closed'].includes(idea.status);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to={`/rooms/${idea.room_id}`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('ideas.back_to_room')}
      </Link>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-section-heading font-bold text-foreground min-w-0 break-words">{idea.title}</h1>
            {canModify && (
              <>
                <button
                  ref={actionsRef}
                  onClick={() => setShowActions(!showActions)}
                  className="p-2 hover:bg-secondary rounded-lg"
                >
                  <MoreVertical className="h-5 w-5 text-muted-foreground" />
                </button>
                <Popover
                  triggerRef={actionsRef}
                  open={showActions}
                  onClose={() => setShowActions(false)}
                  align="right"
                  className="w-48 bg-white rounded-lg shadow-lg border border-border py-1"
                >
                  <button
                    onClick={openEditPage}
                    className="w-full px-4 py-2 text-left text-sm text-foreground/70 hover:bg-secondary flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    {t('ideas.edit_idea')}
                  </button>

                  {user?.role === 'admin' && (
                    <button
                      onClick={handlePin}
                      className="w-full px-4 py-2 text-left text-sm text-foreground/70 hover:bg-secondary flex items-center gap-2"
                    >
                      <Pin className="h-4 w-4" />
                      {idea.is_pinned ? t('ideas.unpin') : t('ideas.pin_to_top')}
                    </button>
                  )}

                  {!isTerminal && (
                    <>
                      <div className="border-t border-border my-1" />
                      <p className="px-4 py-1 text-xs text-muted-foreground font-medium">{t('ideas.change_status')}</p>
                      {IDEA_STATUSES.filter((s) => s.value !== idea.status).map((s) => (
                        <button
                          key={s.value}
                          onClick={() => handleStatusChange(s.value as IdeaStatus)}
                          className="w-full px-4 py-2 text-left text-sm text-foreground/70 hover:bg-secondary flex items-center gap-2"
                        >
                          <Badge className={classNames(s.color, 'text-xs')}>{s.label}</Badge>
                        </button>
                      ))}
                    </>
                  )}

                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => { setShowActions(false); setIsDeleteModalOpen(true); }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('ideas.delete_idea')}
                  </button>
                </Popover>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {idea.summary && (
            <div className="mt-4 mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-1">{t('ideas.summary')}</p>
              <p className="text-green-700">{idea.summary}</p>
            </div>
          )}

          <div className="text-foreground/70 rich-content">
            <TipTapRenderer content={idea.description} />
          </div>

          {/* Author + Tags row */}
          <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar src={authorAvatar} name={authorName} size="lg" />
              <div>
                <p className="text-sm font-medium text-foreground">{authorName}</p>
                <p className="text-xs text-muted-foreground">Posted {timeAgo(idea.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status && <Badge className={status.color}>{status.label}</Badge>}
              {idea.is_pinned && (
                <Badge className="bg-amber-100 text-amber-800">
                  <Pin className="h-3 w-3 mr-1" /> Pinned
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vote Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground/70">{t('ideas.rate_idea')}</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleVote(star)}
                    onMouseEnter={() => setHoverStars(star)}
                    onMouseLeave={() => setHoverStars(0)}
                    className="p-1 transition-colors"
                  >
                    <Star
                      className={classNames(
                        'h-6 w-6',
                        (hoverStars || idea.user_vote?.stars || 0) >= star
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      )}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm text-muted-foreground ml-2">
                {t('ideas.avg_votes', { avg: idea.vote_avg.toFixed(1), count: idea.vote_count })}
              </span>
            </div>

            {/* Reactions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleReaction('like')}
                className={classNames(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  idea.user_reaction === 'like' ? 'bg-primary-100 text-primary-700' : 'hover:bg-secondary text-muted-foreground'
                )}
              >
                <ThumbsUp className="h-4 w-4" />
                <span>{idea.likes_count || 0}</span>
              </button>
              <button
                onClick={() => handleReaction('insight')}
                className={classNames(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  idea.user_reaction === 'insight' ? 'bg-yellow-100 text-yellow-700' : 'hover:bg-secondary text-muted-foreground'
                )}
              >
                <Lightbulb className="h-4 w-4" />
                <span>{idea.insights_count || 0}</span>
              </button>
              <button
                onClick={() => handleReaction('dislike')}
                className={classNames(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  idea.user_reaction === 'dislike' ? 'bg-red-100 text-red-700' : 'hover:bg-secondary text-muted-foreground'
                )}
              >
                <ThumbsDown className="h-4 w-4" />
                <span>{idea.dislikes_count || 0}</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-feature-title font-semibold text-foreground">{t('comments.title', { count: comments.length })}</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={t('ideas.delete_idea')}>
        <div className="space-y-4">
          <p className="text-muted-foreground">{t('ideas.delete_confirm')}</p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? t('common.deleting') : t('common.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
