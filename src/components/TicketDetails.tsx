import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, MessageSquare, Tag, User, Globe, Mic, Share2, AlertCircle, Eye, FileText } from 'lucide-react';
import { Ticket, FileAttachment } from '../types';
import { useTicketStore } from '../store/ticketStore';
import FileViewer from './FileViewer';

interface TicketDetailsProps {
  ticket: Ticket;
  onClose: () => void;
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
};

const channelIcons = {
  email: MessageSquare,
  web: Globe,
  voice: Mic,
  social: Share2,
};

export default function TicketDetails({ ticket, onClose }: TicketDetailsProps) {
  const { downloadFile } = useTicketStore();
  const [selectedFile, setSelectedFile] = React.useState<FileAttachment | null>(null);
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);
  const [viewError, setViewError] = React.useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleView = async (attachment: FileAttachment) => {
    try {
      setViewError(null);
      const url = await downloadFile(attachment.path);
      setFileUrl(url);
      setSelectedFile(attachment);
    } catch (error) {
      console.error('Failed to view file:', error);
      setViewError('Failed to load file for viewing. Please try again.');
    }
  };

  const ChannelIcon = channelIcons[ticket.channel];

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-25"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Query Details</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-medium text-gray-900">{ticket.title}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors[ticket.priority]}`}>
                        {ticket.priority} priority
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[ticket.status]}`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                  <p className="text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Category</h4>
                    <div className="flex items-center">
                      <Tag className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-900">{ticket.category}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Channel</h4>
                    <div className="flex items-center">
                      <ChannelIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-900 capitalize">{ticket.channel}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Created</h4>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-900">{formatDate(ticket.created_at)}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">User ID</h4>
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-900 font-mono">{ticket.user_id}</span>
                    </div>
                  </div>
                </div>

                {ticket.sentiment_score != null && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Sentiment Analysis</h4>
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
                      <div className={`flex items-center ${
                        ticket.sentiment_score > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Score: {ticket.sentiment_score.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Attachments</h4>
                    {viewError && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                        {viewError}
                      </div>
                    )}
                    <ul className="space-y-2 divide-y divide-gray-100">
                      {ticket.attachments.map((attachment, index) => (
                        <li key={index} className="pt-2 first:pt-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                              </div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleView(attachment)}
                              className="flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </motion.button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {selectedFile && fileUrl && (
          <FileViewer
            file={selectedFile}
            url={fileUrl}
            onClose={() => {
              setSelectedFile(null);
              setFileUrl(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}