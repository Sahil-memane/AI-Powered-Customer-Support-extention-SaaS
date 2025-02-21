import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, MessageSquare, Tag, User, Globe, Mic, Share2, CheckCircle } from 'lucide-react';
import { Ticket } from '../types';
import { useTicketStore } from '../store/ticketStore';
import { useAuthStore } from '../store/authStore';
import TicketDetails from './TicketDetails';

interface TicketListProps {
  tickets: Ticket[];
}

const priorityColors = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  resolved: 'bg-gray-100 text-gray-800',
  completed: 'bg-green-100 text-green-800',
};

const channelIcons = {
  email: MessageSquare,
  web: Globe,
  voice: Mic,
  social: Share2,
};

export default function TicketList({ tickets }: TicketListProps) {
  const { updateTicket } = useTicketStore();
  const { user } = useAuthStore();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleResolveQuery = async (ticket: Ticket) => {
    try {
      await updateTicket(ticket.id, {
        ...ticket,
        status: 'resolved',
        agent_id: user?.id,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to resolve query:', error);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Open Queries</h3>
          <p className="mt-1 text-sm text-gray-500">
            View and manage all active support queries
          </p>
        </div>
        <div className="border-t border-gray-200">
          <ul role="list" className="divide-y divide-gray-200">
            {tickets.map((ticket) => (
              <motion.li
                key={ticket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {ticket.title}
                      </p>
                      <div className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[ticket.priority]}`}>
                        {ticket.priority}
                      </div>
                      <div className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[ticket.status]}`}>
                        {ticket.status}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {ticket.status === 'open' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolveQuery(ticket);
                          }}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </motion.button>
                      )}
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{formatDate(ticket.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {ticket.description}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Tag className="h-4 w-4 mr-1" />
                        {ticket.category}
                      </div>
                      {ticket.sentiment_score != null && (
                        <div className="flex items-center text-sm">
                          <span className={`flex items-center ${
                            ticket.sentiment_score > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Sentiment: {ticket.sentiment_score.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <User className="h-4 w-4" />
                      <span>ID: {ticket.user_id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      {selectedTicket && (
        <TicketDetails
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </>
  );
}