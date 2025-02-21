import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTicketStore } from '../store/ticketStore';
import { motion } from 'framer-motion';
import { LogOut, Inbox, Users, BarChart, Plus, Mic, Upload, MessageSquare, Globe, Share2, RefreshCw, AlertCircle } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import NewTicketModal from '../components/NewTicketModal';
import VoiceRecorder from '../components/VoiceRecorder';
import FileUploader from '../components/FileUploader';
import TicketList from '../components/TicketList';
import Chatbot from '../components/Chatbot';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const { user, signOut } = useAuthStore();
  const { tickets, loading, error, initialize, connected } = useTicketStore();
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await initialize();
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !connected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">
            {error || "Unable to connect to the server. Please try again."}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRetry}
            disabled={retrying}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Retrying...' : 'Retry Connection'}
          </motion.button>
        </div>
      </div>
    );
  }

  // Calculate active agents (simulated for demo)
  const activeAgents = 8;

  const stats = [
    {
      name: 'Open Tickets',
      value: tickets.filter(t => t.status === 'open').length,
      icon: Inbox,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Agents',
      value: activeAgents,
      icon: Users,
      color: 'bg-green-500',
    },
    {
      name: 'Resolved Today',
      value: tickets.filter(t => 
        t.status === 'resolved' && 
        new Date(t.updated_at).toDateString() === new Date().toDateString()
      ).length,
      icon: BarChart,
      color: 'bg-purple-500',
    },
  ];

  // Calculate ticket trends by priority
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(today.getDate() - (6 - i));
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  });

  const ticketsByPriority = {
    high: Array(7).fill(0),
    medium: Array(7).fill(0),
    low: Array(7).fill(0),
  };

  tickets.forEach(ticket => {
    const ticketDate = new Date(ticket.created_at);
    const dayIndex = Math.floor((today.getTime() - ticketDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dayIndex >= 0 && dayIndex < 7) {
      ticketsByPriority[ticket.priority][6 - dayIndex]++;
    }
  });

  const chartData = {
    labels: last7Days,
    datasets: [
      {
        label: 'High Priority',
        data: ticketsByPriority.high,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.1,
      },
      {
        label: 'Medium Priority',
        data: ticketsByPriority.medium,
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.5)',
        tension: 0.1,
      },
      {
        label: 'Low Priority',
        data: ticketsByPriority.low,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        tension: 0.1,
      },
    ],
  };

  const openTickets = tickets.filter(t => t.status === 'open')
    .sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-500" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">Support Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.email}</span>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-3"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.name}
                whileHover={{ scale: 1.02 }}
                className="bg-white overflow-hidden shadow rounded-lg"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {stat.name}
                        </dt>
                        <dd className="text-3xl font-semibold text-gray-900">
                          {stat.value}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900">Ticket Trends by Priority</h3>
                <div className="mt-4 h-64">
                  <Line data={chartData} options={{ 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        }
                      }
                    }
                  }} />
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center p-4 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100"
                    onClick={() => setShowNewTicket(true)}
                  >
                    <Plus className="h-6 w-6 mr-2" />
                    New Ticket
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                    onClick={() => setShowVoiceRecorder(true)}
                  >
                    <Mic className="h-6 w-6 mr-2" />
                    Voice Ticket
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center p-4 bg-purple-50 rounded-lg text-purple-700 hover:bg-purple-100"
                    onClick={() => setShowFileUploader(true)}
                  >
                    <Upload className="h-6 w-6 mr-2" />
                    Upload Files
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <TicketList tickets={openTickets} />
          </div>
        </div>
      </main>

      {showNewTicket && (
        <NewTicketModal
          isOpen={showNewTicket}
          onClose={() => setShowNewTicket(false)}
        />
      )}

      {showVoiceRecorder && (
        <VoiceRecorder
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}

      {showFileUploader && (
        <FileUploader
          onClose={() => setShowFileUploader(false)}
        />
      )}

      <Chatbot />
    </div>
  );
}

export default Dashboard;
