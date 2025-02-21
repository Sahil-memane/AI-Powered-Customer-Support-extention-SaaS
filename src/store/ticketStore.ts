import { create } from 'zustand';
import { Ticket, AIAnalysis, FileAttachment } from '../types';
import { supabase, ensureConnection } from '../lib/supabase';
import * as tf from '@tensorflow/tfjs';
import { load as loadUSE } from '@tensorflow-models/universal-sentence-encoder';

interface TicketState {
  tickets: Ticket[];
  loading: boolean;
  model: any | null;
  connected: boolean;
  error: string | null;
  createTicket: (ticket: Partial<Ticket>) => Promise<void>;
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
  fetchTickets: () => Promise<void>;
  analyzeTicket: (text: string) => Promise<AIAnalysis>;
  initialize: () => Promise<void>;
  retryConnection: () => Promise<void>;
  uploadFile: (file: File, ticketId: string) => Promise<FileAttachment>;
  downloadFile: (path: string) => Promise<string>;
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  loading: true,
  model: null,
  connected: false,
  error: null,

  initialize: async () => {
    try {
      set({ loading: true, error: null });
      
      const isConnected = await ensureConnection();
      set({ connected: isConnected });

      if (!isConnected) {
        throw new Error('Failed to connect to Supabase');
      }

      // Create storage bucket if it doesn't exist
      const { data: buckets, error: bucketError } = await supabase
        .storage
        .listBuckets();

      if (!bucketError && !buckets?.find(b => b.name === 'ticket-attachments')) {
        await supabase
          .storage
          .createBucket('ticket-attachments', {
            public: false,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/*', 'application/pdf']
          });
      }

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
        throw error;
      }

      set({ tickets: data as Ticket[] });

      try {
        await tf.ready();
        const model = await loadUSE();
        set({ model });
      } catch (modelError) {
        console.warn('AI model failed to load:', modelError);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize';
      console.error('Failed to initialize store:', error);
      set({ error: errorMessage, tickets: [] });
    } finally {
      set({ loading: false });
    }
  },

  uploadFile: async (file: File, ticketId: string) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Validate file size and type
      if (file.size > 5242880) throw new Error('File size must be less than 5MB');
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        throw new Error('Only images and PDFs are allowed');
      }

      const timestamp = new Date().getTime();
      const filePath = `${user.id}/${ticketId}/${timestamp}-${file.name}`;

      const { error: uploadError, data } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;
      if (!data?.path) throw new Error('Upload failed - no path returned');

      const attachment: FileAttachment = {
        name: file.name,
        path: data.path,
        type: file.type,
        size: file.size
      };

      return attachment;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  },

  downloadFile: async (path: string) => {
    if (!path) throw new Error('File path is required');
    
    try {
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .createSignedUrl(path, 300); // URL valid for 5 minutes

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Failed to generate signed URL');

      return data.signedUrl;
    } catch (error) {
      console.error('Failed to get download URL:', error);
      throw error;
    }
  },

  retryConnection: async () => {
    const { initialize } = get();
    await initialize();
  },

  createTicket: async (ticket: Partial<Ticket>) => {
    try {
      await ensureConnection();
      const { data, error } = await supabase
        .from('tickets')
        .insert([{
          ...ticket,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating ticket:', error);
        throw error;
      }

      set((state) => ({
        tickets: [data as Ticket, ...state.tickets],
      }));
    } catch (error) {
      console.error('Failed to create ticket:', error);
      throw error;
    }
  },

  updateTicket: async (id: string, updates: Partial<Ticket>) => {
    try {
      await ensureConnection();
      const { error } = await supabase
        .from('tickets')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating ticket:', error);
        throw error;
      }

      set((state) => ({
        tickets: state.tickets.map((t) => 
          t.id === id 
            ? { ...t, ...updates, updated_at: new Date().toISOString() }
            : t
        ),
      }));
    } catch (error) {
      console.error('Failed to update ticket:', error);
      throw error;
    }
  },

  fetchTickets: async () => {
    try {
      await ensureConnection();
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
        throw error;
      }

      set({ tickets: data as Ticket[] });
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      throw error;
    }
  },

  analyzeTicket: async (text: string) => {
    const { model } = get();
    if (!model) {
      return {
        category: 'general',
        priority: 'medium',
        sentiment: 0,
      };
    }

    try {
      const embeddings = await model.embed(text);
      const features = await embeddings.array();
      const sentimentScore = features[0].reduce((a: number, b: number) => a + b, 0) / features[0].length;

      const categories = ['billing', 'technical', 'service', 'general'];
      const keywords = {
        billing: ['payment', 'invoice', 'charge', 'refund', 'price'],
        technical: ['error', 'bug', 'crash', 'not working', 'failed'],
        service: ['delivery', 'support', 'help', 'assistance', 'customer service'],
      };

      let category = 'general';
      let maxMatches = 0;

      for (const [cat, words] of Object.entries(keywords)) {
        const matches = words.filter(word => text.toLowerCase().includes(word)).length;
        if (matches > maxMatches) {
          maxMatches = matches;
          category = cat;
        }
      }

      const urgentWords = ['urgent', 'emergency', 'critical', 'immediately'];
      const hasUrgentWords = urgentWords.some(word => text.toLowerCase().includes(word));
      const priority = hasUrgentWords ? 'high' : sentimentScore < -0.3 ? 'high' : sentimentScore < 0 ? 'medium' : 'low';

      return {
        category,
        priority,
        sentiment: sentimentScore,
      };
    } catch (error) {
      console.error('Failed to analyze ticket:', error);
      return {
        category: 'general',
        priority: 'medium',
        sentiment: 0,
      };
    }
  },
}));