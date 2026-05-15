import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Lightbulb, Plus, Import, SortAsc, SortDesc, ChevronLeft, ChevronRight,
  Loader2, FileText, Sparkles
} from 'lucide-react';
import { eventsApi } from '@/api/events';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { IdeaCard } from './IdeaCard';
import { IdeaFormModal } from './IdeaFormModal';
import { ImportFromRoomModal } from './ImportFromRoomModal';
import type {
  EventObject, EventIdeaObject, EventTeamObject, EventIdeaFilters,
} from '@/types';

type FilterTab = 'my_team' | 'review_team' | 'all';

interface IdeasTabProps {
  event: EventObject;
}

export const IdeasTab: React.FC<IdeasTabProps> = ({ event }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const isActive = event.status === 'active';

  // Ideas state
  const [ideas, setIdeas] = useState<EventIdeaObject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'newest' | 'score'>('newest');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  // Team context
  const [teams, setTeams] = useState<EventTeamObject[]>([]);
  const [myTeam, setMyTeam] = useState<EventTeamObject | null>(null);
  const [reviewTeam, setReviewTeam] = useState<EventTeamObject | null>(null);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState<EventIdeaObject | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const limit = 12;

  const fetchTeamsCounter = useRef(0);
  const fetchIdeasCounter = useRef(0);

  // Fetch teams for context
  const fetchTeams = useCallback(async () => {
    const thisRequest = ++fetchTeamsCounter.current;
    try {
      const result = await eventsApi.listTeams(event.id, 1, 100);
      if (thisRequest !== fetchTeamsCounter.current) return;
      setTeams(result.items);

      if (user) {
        // Find user's team by checking leader_id
        const found = result.items.find(t => t.leader_id === user.id);
        if (found) {
          setMyTeam(found);
          if (found.assigned_to_team_id) {
            const assigned = result.items.find(t => t.id === found.assigned_to_team_id);
            setReviewTeam(assigned || null);
          }
          return;
        }
      }
    } catch { /* silent */ }
  }, [event.id, user]);

  // Check membership for non-leader users
  useEffect(() => {
    if (!user || teams.length === 0 || myTeam) return;
    const checkMembership = async () => {
      for (const team of teams) {
        if (team.leader_id === user?.id) continue; // already checked
        try {
          const result = await eventsApi.listTeamMembers(event.id, team.id);
          const isMember = result.items.some(m => m.user_id === user.id && m.status === 'active');
          if (isMember) {
            setMyTeam(team);
            if (team.assigned_to_team_id) {
              const assigned = teams.find(t => t.id === team.assigned_to_team_id);
              setReviewTeam(assigned || null);
            }
            return;
          }
        } catch { /* continue */ }
      }
    };
    checkMembership();
  }, [user, teams, event.id, myTeam]);

  // Fetch ideas
  const fetchIdeas = useCallback(async () => {
    const thisRequest = ++fetchIdeasCounter.current;
    setLoading(true);
    try {
      const filters: EventIdeaFilters = { sort, page, limit };

      if (filterTab === 'my_team' && myTeam) {
        filters.team_id = myTeam.id;
      } else if (filterTab === 'review_team' && reviewTeam) {
        filters.team_id = reviewTeam.id;
      }

      const result = await eventsApi.listIdeas(event.id, filters);
      if (thisRequest === fetchIdeasCounter.current) {
        setIdeas(result.items);
        setTotal(result.total);
      }
    } catch {
      // handled by empty state
    } finally {
      if (thisRequest === fetchIdeasCounter.current) {
        setLoading(false);
      }
    }
  }, [event.id, sort, page, filterTab, myTeam, reviewTeam]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);
  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);

  useEffect(() => { setPage(1); }, [filterTab, sort]);

  const totalPages = Math.ceil(total / limit);

  const handleIdeaCreated = () => {
    setShowFormModal(false);
    setEditingIdea(null);
    fetchIdeas();
  };

  const handleImported = () => {
    setShowImportModal(false);
    fetchIdeas();
  };

  const handleEdit = (idea: EventIdeaObject) => {
    setEditingIdea(idea);
    setShowFormModal(true);
  };

  const canSubmitIdea = isActive && myTeam;

  const filterTabs: { key: FilterTab; label: string; icon: React.ReactNode; disabled: boolean }[] = [
    { key: 'all', label: t('events.ideas.filter_all'), icon: <FileText className="h-3.5 w-3.5" />, disabled: false },
    { key: 'my_team', label: t('events.ideas.filter_my_team'), icon: <Lightbulb className="h-3.5 w-3.5" />, disabled: !myTeam },
    { key: 'review_team', label: t('events.ideas.filter_review'), icon: <Sparkles className="h-3.5 w-3.5" />, disabled: !reviewTeam },
  ];

  return (
    <div>
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-feature-title font-semibold text-foreground">
          {t('events.ideas.title')}
          {!loading && <span className="text-muted-foreground font-normal ml-2">({total})</span>}
        </h2>
        <div className="flex items-center gap-2">
          {canSubmitIdea && (
            <>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Import className="h-4 w-4" />}
                onClick={() => setShowImportModal(true)}
              >
                {t('events.ideas.import_from_room')}
              </Button>
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => { setEditingIdea(null); setShowFormModal(true); }}
              >
                {t('events.ideas.submit_idea')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter tabs + Sort */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {filterTabs.map(ft => (
            <button
              key={ft.key}
              onClick={() => !ft.disabled && setFilterTab(ft.key)}
              disabled={ft.disabled}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterTab === ft.key
                  ? 'bg-primary-100 text-primary-700'
                  : ft.disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground/70'
              }`}
            >
              {ft.icon}
              {ft.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSort(s => s === 'newest' ? 'score' : 'newest')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground/70 transition-colors"
        >
          {sort === 'newest' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
          {t(`events.ideas.sort_${sort}`)}
        </button>
      </div>

      {/* Ideas list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-muted-foreground">
            {filterTab === 'all'
              ? t('events.ideas.no_ideas')
              : t('events.ideas.no_ideas_filter')
            }
          </h3>
          {canSubmitIdea && filterTab === 'all' && (
            <p className="text-sm text-muted-foreground mt-1">{t('events.ideas.no_ideas_submit')}</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideas.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onClick={() => navigate(`/events/${event.id}/ideas/${idea.id}`)}
                canEdit={isActive && (
                  isAdmin ||
                  idea.author_id === user?.id ||
                  (myTeam?.leader_id === user?.id && idea.team_id === myTeam?.id)
                )}
                onEdit={handleEdit}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                {t('common.previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                {t('common.next')}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Idea Form Modal (Create/Edit) */}
      <IdeaFormModal
        event={event}
        idea={editingIdea}
        myTeam={myTeam}
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingIdea(null); }}
        onSaved={editingIdea ? () => { setShowFormModal(false); setEditingIdea(null); fetchIdeas(); } : handleIdeaCreated}
      />

      {/* Import from Room Modal */}
      <ImportFromRoomModal
        event={event}
        myTeam={myTeam}
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={handleImported}
      />
    </div>
  );
};
