import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  MessageCircle,
  BrainCircuit,
  Edit,
  Trash2,
  MoreVertical,
  Circle,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProblemStore } from '@/stores/problemStore';
import { useUIStore } from '@/stores/uiStore';
import { problemsApi } from '@/api/problems';
import { commentsApi } from '@/api/comments';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Popover } from '@/components/ui/Popover';
import { TipTapRenderer } from '@/components/ui/TipTapRenderer';
import { SharedUsersDisplay } from '@/components/ui/SharedUsersDisplay';
import { PROBLEM_CATEGORIES, PROBLEM_STATUSES } from '@/utils/constants';
import { timeAgo, classNames } from '@/utils/helpers';
import { Avatar } from '@/components/ui/Avatar';
import { RoomFormModal } from '@/pages/IdeaLab/RoomFormModal';
import type { Comment, ReactionType, ProblemStatus } from '@/types';

export const ProblemDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedProblem, isLoading } = useProblemStore();
  const { showToast } = useUIStore();
  const [accessError, setAccessError] = useState<'forbidden' | 'not_found' | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  // Delete states
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLButtonElement>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBrainstormModalOpen, setIsBrainstormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      setAccessError(null);
      problemsApi.getById(id)
        .then((data) => {
          useProblemStore.setState({ selectedProblem: data, isLoading: false });
        })
        .catch((err) => {
          if (err?.response?.status === 403) {
            setAccessError('forbidden');
          } else {
            setAccessError('not_found');
          }
          useProblemStore.setState({ isLoading: false });
        });
      fetchComments();
    }
  }, [id]);

  // Check if user can modify (owner or admin)
  const canModify = user && selectedProblem && (
    user.id === selectedProblem.author_id || user.role === 'admin'
  );

  const fetchComments = async () => {
    if (!id) return;
    try {
      const response = await commentsApi.list({ target_id: id, target_type: 'problem' });
      setComments(response.items || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleReaction = async (type: ReactionType) => {
    if (!id || !selectedProblem) return;
    try {
      if (selectedProblem.user_reaction === type) {
        await problemsApi.removeReaction(id);
      } else {
        await problemsApi.addReaction(id, type);
      }
      const updated = await problemsApi.getById(id);
      useProblemStore.setState({ selectedProblem: updated });
    } catch {
      showToast({ type: 'error', message: t('problems.reaction_error') });
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;

    try {
      await commentsApi.create({ target_id: id, target_type: 'problem', content: newComment });
      showToast({ type: 'success', message: t('comments.added') });
      setNewComment('');
      await fetchComments();
      const updated = await problemsApi.getById(id);
      useProblemStore.setState({ selectedProblem: updated });
    } catch {
      showToast({ type: 'error', message: t('comments.add_error') });
    }
  };

  const handleStatusChange = async (newStatus: ProblemStatus) => {
    if (!id || !canModify) return;
    try {
      const updated = await problemsApi.update(id, { status: newStatus });
      useProblemStore.setState({ selectedProblem: updated });
      showToast({ type: 'success', message: t('problems.status_changed', { status: newStatus }) });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast({ type: 'error', message: detail || t('problems.update_error') });
    }
    setShowActions(false);
  };

  const openEditPage = () => {
    navigate(`/problems/${id}/edit`);
    setShowActions(false);
  };

  const handleDelete = async () => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      await problemsApi.delete(id);
      showToast({ type: 'success', message: t('problems.deleted_success') });
      setIsDeleteModalOpen(false);
      navigate('/problems');
    } catch {
      showToast({ type: 'error', message: t('problems.delete_error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (accessError) {
    return (
      <div className="text-center py-12">
        <ShieldAlert className={`h-12 w-12 mx-auto mb-4 ${accessError === 'forbidden' ? 'text-amber-500' : 'text-muted-foreground'}`} />
        <h2 className="text-card-heading font-semibold text-foreground/70 mb-2">
          {accessError === 'forbidden' ? t('errors.forbidden_title') : t('errors.not_found_title')}
        </h2>
        <p className="text-muted-foreground mb-4">
          {accessError === 'forbidden' ? t('errors.forbidden_desc') : t('errors.not_found_desc')}
        </p>
        <Link to="/problems" className="text-primary-600 hover:text-primary-700">
          {t('problems.back_to_problems')}
        </Link>
      </div>
    );
  }

  if (isLoading || !selectedProblem) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const category = PROBLEM_CATEGORIES.find((c) => c.value === selectedProblem.category);
  const status = PROBLEM_STATUSES.find((s) => s.value === selectedProblem.status);
  const authorName = selectedProblem.author?.full_name || selectedProblem.author?.username || 'Unknown User';
  const authorAvatar = selectedProblem.author?.avatar_url;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        to="/problems"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('problems.back_to_problems')}
      </Link>

      {/* Problem Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <h1 className="text-section-heading font-bold text-foreground min-w-0 flex-1 break-words">
              {selectedProblem.title}
            </h1>
            {/* Actions Dropdown for Owner/Admin */}
            {canModify && (
              <div className="shrink-0">
                <button
                  ref={actionsRef}
                  onClick={() => setShowActions(!showActions)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
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
                    {t('problems.edit_problem')}
                  </button>

                  <div className="border-t border-border my-1" />

                  {(() => {
                    const current = selectedProblem.status;
                    const terminal = ['solved', 'closed'];
                    if (terminal.includes(current)) return null;
                    const order = ['open', 'discussing', 'brainstorming', 'solved', 'closed'];
                    const currentIdx = order.indexOf(current);
                    const options = PROBLEM_STATUSES.filter((s) => {
                      const targetIdx = order.indexOf(s.value);
                      return targetIdx > currentIdx && terminal.includes(s.value);
                    });
                    if (options.length === 0) return null;
                    return (<>
                  <p className="px-4 py-1 text-xs text-muted-foreground font-medium">{t('problems.change_status')}</p>
                  {options.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => handleStatusChange(s.value as ProblemStatus)}
                      className="w-full px-4 py-2 text-left text-sm text-foreground/70 hover:bg-secondary flex items-center gap-2"
                    >
                      <Circle className="h-4 w-4" />
                      {s.label}
                    </button>
                  ))}
                    </>);
                  })()}

                  <div className="border-t border-border my-1" />

                  <button
                    onClick={() => {
                      setShowActions(false);
                      setIsDeleteModalOpen(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('problems.delete_problem')}
                  </button>
                </Popover>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="text-foreground/70 rich-content">
            <TipTapRenderer content={selectedProblem.content} />
          </div>

          {/* Author + Tags row */}
          <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar src={authorAvatar} name={authorName} size="lg" />
              <div>
                <p className="text-sm font-medium text-foreground">{authorName}</p>
                <p className="text-xs text-muted-foreground">{t('problems.posted_time', { time: timeAgo(selectedProblem.created_at) })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {category && (
                <Badge variant="info" size="sm">{category.label}</Badge>
              )}
              {selectedProblem.visibility === 'private' && (
                <Badge variant="warning" size="sm">
                  <Lock className="h-3 w-3 mr-1" />
                  {t('problems.private_badge')}
                </Badge>
              )}
              {status && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
                  {status.label}
                </span>
              )}
            </div>
          </div>

          {/* Shared users */}
          {selectedProblem.visibility === 'private' && selectedProblem.shared_users?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <SharedUsersDisplay
                users={selectedProblem.shared_users}
                label={t('problems.shared_with')}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brainstorming Rooms Section */}
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary-600" />
            <h3 className="font-semibold text-foreground">{t('problems.brainstorming_rooms')}</h3>
            {selectedProblem.rooms?.length > 0 && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                {selectedProblem.rooms.length}
              </span>
            )}
          </div>
          {!['solved', 'closed'].includes(selectedProblem.status) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsBrainstormModalOpen(true);
              }}
            >
              {selectedProblem.rooms?.length > 0 ? t('problems.add_room') : t('problems.brainstorm_solutions')}
            </Button>
          )}
        </div>
        {selectedProblem.rooms?.length > 0 ? (
          <div className="mt-3 space-y-2 max-h-[180px] overflow-y-auto">
            {selectedProblem.rooms.map((room) => (
              <Link
                key={room.id}
                to={`/rooms/${room.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary transition-colors"
              >
                <BrainCircuit className="h-4 w-4 text-primary-600 shrink-0" />
                <span className="text-sm font-medium text-foreground/80 truncate">{room.name}</span>
                <span className={classNames(
                  'ml-auto text-xs px-2 py-0.5 rounded-full shrink-0',
                  room.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                )}>
                  {room.status}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t('problems.no_rooms')}</p>
        )}
      </div>

      {/* Reactions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleReaction('like')}
              className={classNames(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                selectedProblem.user_reaction === 'like'
                  ? 'bg-primary-100 text-primary-700'
                  : 'hover:bg-secondary text-muted-foreground'
              )}
            >
              <ThumbsUp className="h-5 w-5" />
              <span>{selectedProblem.likes_count || 0}</span>
            </button>
            <button
              onClick={() => handleReaction('insight')}
              className={classNames(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                selectedProblem.user_reaction === 'insight'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'hover:bg-secondary text-muted-foreground'
              )}
            >
              <Lightbulb className="h-5 w-5" />
              <span>{selectedProblem.insights_count || 0}</span>
            </button>
            <button
              onClick={() => handleReaction('dislike')}
              className={classNames(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                selectedProblem.user_reaction === 'dislike'
                  ? 'bg-red-100 text-red-700'
                  : 'hover:bg-secondary text-muted-foreground'
              )}
            >
              <ThumbsDown className="h-5 w-5" />
              <span>{selectedProblem.dislikes_count || 0}</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-feature-title font-semibold text-foreground">
              {t('comments.title', { count: comments.length })}
            </h2>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Add Comment */}
          <form onSubmit={handleSubmitComment} className="space-y-3">
            <Textarea
              placeholder={t('comments.add_placeholder')}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!newComment.trim()}>
                {t('comments.post')}
              </Button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {t('comments.no_comments')}
              </p>
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
                        <span className="font-medium text-foreground">
                          {commentAuthorName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(comment.created_at)}
                        </span>
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('problems.delete_problem')}
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            {t('problems.delete_confirm')}
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? t('common.deleting') : t('common.delete')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Brainstorm Room Modal */}
      <RoomFormModal
        isOpen={isBrainstormModalOpen}
        onClose={() => setIsBrainstormModalOpen(false)}
        mode="create-from-problem"
        problemId={selectedProblem.id}
        problemTitle={selectedProblem.title}
        onSuccess={async () => {
          setIsBrainstormModalOpen(false);
          const updated = await problemsApi.getById(id!);
          useProblemStore.setState({ selectedProblem: updated });
        }}
      />
    </div>
  );
};