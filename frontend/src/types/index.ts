// User Types
export interface User {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  team: string | null;
  role: 'member' | 'admin';
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface UserRegister {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
  team?: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Shared User Types
export interface SharedUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

// Problem Types
export type ProblemStatus = 'open' | 'discussing' | 'brainstorming' | 'solved' | 'closed';
export type ProblemCategory = 'process' | 'technical' | 'people' | 'tools' | 'patent';
export type ProblemVisibility = 'public' | 'private';

export interface ProblemAuthor {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface ProblemRoomSummary {
  id: string;
  name: string;
  status: string;
}

export interface Problem {
  id: string;
  title: string;
  summary?: string;
  content: TipTapContent;
  status: ProblemStatus;
  category: ProblemCategory;
  visibility: ProblemVisibility;
  shared_user_ids: string[];
  shared_users: SharedUser[];
  author_id: string;
  author: ProblemAuthor | null;
  room_id: string | null;
  rooms: ProblemRoomSummary[];
  created_at: string;
  updated_at: string | null;
  likes_count: number;
  dislikes_count: number;
  insights_count: number;
  comments_count: number;
  user_reaction: string | null;
}

export interface CreateProblem {
  title: string;
  summary?: string;
  content: TipTapContent;
  category: ProblemCategory;
  visibility?: ProblemVisibility;
  shared_user_ids?: string[];
}

export interface UpdateProblem {
  title?: string;
  summary?: string;
  content?: TipTapContent;
  status?: ProblemStatus;
  category?: ProblemCategory;
  visibility?: ProblemVisibility;
  shared_user_ids?: string[];
}

// Comment Types
export interface CommentAuthor {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Comment {
  id: string;
  target_id: string;
  target_type: 'problem' | 'idea' | 'event_idea';
  content: string;
  author_id: string;
  author: CommentAuthor | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateComment {
  target_id: string;
  target_type: 'problem' | 'idea' | 'event_idea';
  content: string;
  parent_id?: string;
}

// Room Types
export type RoomStatus = 'active' | 'archived';

export interface RoomCreator {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Room {
  id: string;
  name: string;
  description: string | null;
  status: RoomStatus;
  visibility: ProblemVisibility;
  shared_user_ids: string[];
  shared_users: SharedUser[];
  problem_id: string | null;
  created_by: string;
  creator: RoomCreator | null;
  created_at: string;
  updated_at: string | null;
  idea_count: number;
}

export interface CreateRoom {
  name: string;
  description?: string;
  problem_id?: string;
  visibility?: ProblemVisibility;
  shared_user_ids?: string[];
}

export interface UpdateRoom {
  name?: string;
  description?: string;
  status?: RoomStatus;
  visibility?: ProblemVisibility;
  shared_user_ids?: string[];
}

// Idea Types
export type IdeaStatus = 'draft' | 'refining' | 'reviewing' | 'submitted' | 'closed';

export interface IdeaAuthor {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface UserVote {
  stars: number;
}

export interface Idea {
  id: string;
  room_id: string;
  title: string;
  description: TipTapContent;
  summary: string | null;
  status: IdeaStatus;
  author_id: string;
  author: IdeaAuthor | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string | null;
  vote_avg: number;
  vote_count: number;
  likes_count: number;
  dislikes_count: number;
  insights_count: number;
  comments_count: number;
  user_reaction: string | null;
  user_vote: UserVote | null;
}

export interface CreateIdea {
  room_id: string;
  title: string;
  description: TipTapContent;
  summary?: string;
}

export interface UpdateIdea {
  title?: string;
  description?: TipTapContent;
  summary?: string;
  status?: IdeaStatus;
  is_pinned?: boolean;
}

// Vote Types
export interface Vote {
  id: string;
  idea_id: string;
  user_id: string;
  stars: number;
  created_at: string;
  updated_at: string | null;
}

export interface CreateVote {
  stars: number;
}

// Reaction Types
export type ReactionType = 'like' | 'dislike' | 'insight';

export interface Reaction {
  id: string;
  target_id: string;
  target_type: 'problem' | 'idea' | 'event_idea';
  type: ReactionType;
  user_id: string;
  created_at: string;
}

// Dashboard Types
export interface DashboardStats {
  total_problems: number;
  total_ideas: number;
  total_comments: number;
  total_rooms: number;
  interaction_rate: number;
  resolved_problems: number;
  problems_by_status: Record<string, number>;
  ideas_by_status: Record<string, number>;
}

export interface TopContributor {
  user: User;
  problems_count: number;
  ideas_count: number;
}

export interface DailyActivity {
  date: string;
  day_name: string;
  problems: number;
  ideas: number;
  comments: number;
}

export interface ActivityActor {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface ActivityItem {
  id: string;
  type: string;
  actor: ActivityActor;
  target_title: string;
  target_id: string;
  target_type: 'problem' | 'idea' | 'room';
  created_at: string;
  extra?: Record<string, unknown> | null;
}

// Notification Types
export type NotificationType = 'comment_added' | 'reaction_added' | 'vote_added' | 'status_changed'
  | 'room_idea_created'
  | 'event_join_request' | 'event_join_approved' | 'event_join_rejected' | 'event_idea_submitted' | 'event_scored'
  | 'event_created' | 'event_closed' | 'team_review_assigned' | 'team_disbanded' | 'team_lead_transferred';

export interface NotificationActor {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  actor: NotificationActor | null;
  type: NotificationType;
  target_id: string;
  target_type: 'problem' | 'idea' | 'event' | 'event_idea';
  target_title: string;
  action_detail: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  unread_count: number;
}

// Filter Types
export interface ProblemFilters {
  search?: string;
  status?: ProblemStatus;
  category?: ProblemCategory;
  author_id?: string;
  sort?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface CommentFilters {
  target_id?: string;
  target_type?: string;
  page?: number;
  limit?: number;
}

// Event Types
export type EventStatus = 'draft' | 'active' | 'closed';
export type IntroductionType = 'editor' | 'embed';
export type EventCriteriaGroup = 'problem' | 'solution';

export interface EventObject {
  id: string;
  title: string;
  description: TipTapContent | null;
  introduction_type: IntroductionType;
  embed_url: string | null;
  status: EventStatus;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  creator: User | null;
  team_count: number;
  idea_count: number;
  created_at: string;
  updated_at: string | null;
  closed_at: string | null;
}

export interface CreateEvent {
  title: string;
  description?: TipTapContent;
  embed_url?: string;
  introduction_type?: IntroductionType;
  status?: EventStatus;
  start_date?: string;
  end_date?: string;
}

export interface UpdateEvent {
  title?: string;
  description?: TipTapContent;
  embed_url?: string;
  introduction_type?: IntroductionType;
  status?: EventStatus;
  start_date?: string;
  end_date?: string;
}

export interface EventFilters {
  status?: EventStatus;
  page?: number;
  limit?: number;
}

// Event Team Types
export interface EventTeamObject {
  id: string;
  event_id: string;
  name: string;
  slogan: string | null;
  leader_id: string;
  leader: User | null;
  assigned_to_team_id: string | null;
  assigned_to_team: { id: string; name: string } | null;
  member_count: number;
  idea_count: number;
  created_at: string;
}

export interface CreateEventTeam {
  name: string;
  slogan?: string;
}

export interface EventTeamMemberObject {
  id: string;
  team_id: string;
  user_id: string;
  user: User | null;
  status: 'pending' | 'active';
  joined_at: string;
}

export interface TransferLeadDTO {
  new_leader_id: string;
}

export interface AssignReviewDTO {
  target_team_id: string | null;
}

export interface UpdateMemberStatusDTO {
  status: 'active' | 'rejected';
}

// TipTap Content Type (JSON object or HTML string)
export type TipTapContent = Record<string, unknown> | string;

// Event Idea Types
export interface EventIdeaObject {
  id: string;
  event_id: string;
  team_id: string;
  team: { id: string; name: string; slogan: string | null } | null;
  title: string;
  user_problem: TipTapContent | null;
  user_scenarios: TipTapContent | null;
  user_expectation: TipTapContent | null;
  research: TipTapContent | null;
  solution: TipTapContent;
  source_type: 'manual' | 'linked';
  source_problem_id: string | null;
  source_room_id: string | null;
  source_idea_id: string | null;
  author_id: string;
  author: User | null;
  total_score: number | null;
  score_count: number;
  can_score: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CreateEventIdea {
  title: string;
  user_problem?: TipTapContent;
  user_scenarios?: TipTapContent;
  user_expectation?: TipTapContent;
  research?: TipTapContent;
  solution: TipTapContent;
  source_type?: 'manual';
}

export interface UpdateEventIdea {
  title?: string;
  user_problem?: TipTapContent;
  user_scenarios?: TipTapContent;
  user_expectation?: TipTapContent;
  research?: TipTapContent;
  solution?: TipTapContent;
}

export interface CreateEventIdeaFromRoom {
  room_id: string;
  idea_id: string;
}

export interface EventIdeaFilters {
  team_id?: string;
  sort?: 'score' | 'newest';
  page?: number;
  limit?: number;
}

// Event Scoring Types
export interface EventScoringCriteriaObject {
  id: string;
  event_id: string;
  group: EventCriteriaGroup;
  name: string;
  description: string | null;
  weight: number;
  max_score: number;
  sort_order: number;
  created_at: string;
}

export interface EventScoreObject {
  id: string;
  event_idea_id: string;
  scorer_team_id: string;
  scorer_team: { id: string; name: string } | null;
  criteria_scores: Record<string, number>;
  criteria_notes: Record<string, string | null> | null;
  total_score: number;
  created_at: string;
  updated_at: string | null;
}

export interface ScoreInputDTO {
  criteria_scores: Record<string, number>;
  criteria_notes?: Record<string, string | null>;
}

export interface ScoreListResponse {
  idea_id: string;
  scores: EventScoreObject[];
  summary: {
    total_avg: number;
    criteria_avg: Record<string, number>;
  };
}

// Event FAQ Types
export interface FAQObject {
  id: string;
  event_id: string;
  question: string;
  answer: TipTapContent;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string | null;
}

export interface CreateFAQ {
  question: string;
  answer?: TipTapContent;
  sort_order?: number;
}

export interface UpdateFAQ {
  question?: string;
  answer?: TipTapContent;
  sort_order?: number;
}

// Event Dashboard Types
export interface EventDashboardIdea {
  id: string;
  title: string;
  team: { id: string; name: string } | null;
  author: User | null;
  total_score: number | null;
  score_count: number;
  criteria_breakdown: Record<string, number>;
  created_at: string;
}

export interface EventDashboardTeam {
  team: { id: string; name: string; slogan: string | null };
  idea_count: number;
  avg_score: number | null;
  total_score: number;
  members: User[];
}

export interface AssignmentsResponse {
  assignments: {
    team: { id: string; name: string };
    reviews: { id: string; name: string };
  }[];
}

// Event Award Types
export interface EventAwardTeam {
  team_id: string;
  team_name: string;
  team_slogan: string | null;
  leader_id: string;
  leader_name: string | null;
  leader_avatar_url: string | null;
}

export interface EventAward {
  id: string;
  event_id: string;
  name: string;
  rank_order: number;
  teams: EventAwardTeam[];
  created_at: string;
  updated_at: string | null;
}

// UI Types
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface ModalState {
  isOpen: boolean;
  type: string;
  data?: unknown;
}

export type { ChatSession, ChatMessage, StreamEvent, StreamEventType, StreamingStep } from './chat';
