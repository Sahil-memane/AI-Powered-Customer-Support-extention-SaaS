export interface User {
  id: string;
  email: string;
  role: 'admin' | 'agent' | 'customer';
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  category: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  agent_id?: string;
  channel: 'email' | 'web' | 'social' | 'voice';
  sentiment_score?: number;
  satisfaction_score?: number;
  attachments?: FileAttachment[];
  ai_summary?: string;
  ai_category?: string;
  response_time?: number;
}

export interface FileAttachment {
  name: string;
  path: string;
  type: string;
  size: number;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  avgResponseTime: number;
  satisfactionScore: number;
}

export interface AIAnalysis {
  category: string;
  priority: 'high' | 'medium' | 'low';
  sentiment: number;
  suggestedResponse?: string;
}
