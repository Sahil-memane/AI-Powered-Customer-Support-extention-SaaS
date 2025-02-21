import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Circle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Ticket } from '../types';
import { useTicketStore } from '../store/ticketStore';

interface Agent {
  id: string;
  email: string;
  last_seen: string;
  status: 'online' | 'offline' | 'away';
  resolvedTickets: Ticket[];
}

export default function ActiveAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const { updateTicket } = useTicketStore();

  useEffect(() => {
    const fetchAgentsAndTickets = async () => {
      try {
        // Fetch agents
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            user_id,
            role,
            users:user_id (
              email,
              last_sign_in_at
            )
          `)
          .eq('role', 'agent');

        if (profileError) throw profileError;

        // Fetch resolved tickets
        const { data: tickets, error: ticketError } = await supabase
          .from('tickets')
          .select('*')
          .eq('status', 'resolved')
          .order('updated_at', { ascending: false });

        if (ticketError) throw ticketError;

        const now = new Date();
        const agentData: Agent[] = profiles
          .filter(profile => profile.users)
          .map(profile => {
            const lastSeen = new Date(profile.users.last_sign_in_at);
            const minutesSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / 60000);
            
            let status: 'online' | 'offline' | 'away' = 'offline';
            if (minutesSinceLastSeen < 5) {
              status = 'online';
            } else if (minutesSinceLastSeen < 30) {
              status = 'away';
            }

            // Filter tickets resolved by this agent
            const resolvedTickets = tickets.filter(ticket => 
              ticket.agent_id === profile.user_id && 
              new Date(ticket.updated_at).toDateString() === now.toDateString()
            );

            return {
              id: profile.user_id,
              email: profile.users.email,
              last_seen: profile.users.last_sign_in_at,
              status,
              resolvedTickets
            };
          });

        setAgents(agentData);
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentsAndTickets();
    const interval = setInterval(fetchAgentsAndTickets, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleMarkCompleted = async (ticket: Ticket) => {
    try {
      await updateTicket(ticket.id, {
        ...ticket,
        status: 'completed'
      });
    } catch (error) {
      console.error('Failed to mark ticket as completed:', error);
    }
  };

  const statusColors = {
    online: 'text-green-500',
    away: 'text-yellow-500',
    offline: 'text-gray-400'
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Active Agents</h3>
      <div className="space-y-4">
        {agents.length === 0 ? (
          <p className="text-gray-500 text-sm">No agents available</p>
        ) : (
          agents.map(agent => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-100 p-2 rounded-full">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{agent.email}</p>
                    <p className="text-xs text-gray-500">
                      Last seen: {new Date(agent.last_seen).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Circle className={`h-3 w-3 ${statusColors[agent.status]}`} fill="currentColor" />
                  <span className="ml-2 text-sm capitalize text-gray-600">{agent.status}</span>
                </div>
              </div>

              {agent.resolvedTickets.length > 0 && (
                <div className="border-t border-gray-100">
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Resolved Tickets Today ({agent.resolvedTickets.length})
                    </h4>
                    <div className="space-y-2">
                      {agent.resolvedTickets.map(ticket => (
                        <div
                          key={ticket.id}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {ticket.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              Resolved at: {new Date(ticket.updated_at).toLocaleTimeString()}
                            </p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleMarkCompleted(ticket)}
                            className="ml-4 px-3 py-1 text-sm font-medium text-green-600 hover:text-green-700 flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete
                          </motion.button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
