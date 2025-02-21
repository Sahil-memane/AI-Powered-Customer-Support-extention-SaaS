import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Bot, User, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTicketStore } from '../store/ticketStore';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ text: string; isBot: boolean; priority?: string }>>([
    { text: "Hi! I'm your support assistant. How can I help you today?", isBot: true }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { analyzeTicket, createTicket } = useTicketStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getResponseByCategory = (category: string, sentiment: number) => {
    const responses = {
      billing: [
        "I understand you have a billing concern. Let me help you with that.",
        "I'll create a ticket for our billing team to assist you.",
        "Our billing specialists will review your case promptly."
      ],
      technical: [
        "I see you're experiencing technical difficulties. Let's get that sorted out.",
        "I'll create a ticket for our technical team to investigate.",
        "Our technical experts will look into this right away."
      ],
      service: [
        "Thank you for reaching out about our service.",
        "I'll make sure our service team addresses your concern.",
        "We'll have our service team review your request."
      ],
      general: [
        "I understand your concern. Let me help you with that.",
        "I'll make sure the right team assists you with this.",
        "We'll look into this matter for you."
      ]
    };

    const categoryResponses = responses[category as keyof typeof responses] || responses.general;
    return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
  };

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setIsTyping(true);

    try {
      const analysis = await analyzeTicket(userMessage);
      const baseResponse = getResponseByCategory(analysis.category, analysis.sentiment);
      
      // Create a ticket for the query
      await createTicket({
        title: userMessage.slice(0, 50) + '...',
        description: userMessage,
        category: analysis.category,
        priority: analysis.priority,
        status: 'open',
        user_id: user.id,
        channel: 'web',
        sentiment_score: analysis.sentiment,
      });

      const priorityMessage = analysis.priority === 'high' 
        ? "I've marked this as high priority and our team will address it urgently."
        : analysis.priority === 'medium'
        ? "I've created a ticket with medium priority for our team to assist you."
        : "I've logged this request and our team will help you soon.";

      setMessages(prev => [...prev, {
        text: `${baseResponse} ${priorityMessage}`,
        isBot: true,
        priority: analysis.priority
      }]);

    } catch (error) {
      console.error('Failed to process message:', error);
      setMessages(prev => [...prev, {
        text: "I'm sorry, I encountered an error. Please try again or contact support directly.",
        isBot: true
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg"
      >
        <MessageSquare className="h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-25"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-lg shadow-xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center">
                  <Bot className="h-6 w-6 text-blue-500 mr-2" />
                  <h3 className="text-lg font-medium">Support Assistant</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 h-96 overflow-y-auto">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start mb-4 ${message.isBot ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`flex items-center ${message.isBot ? 'mr-2' : 'ml-2'}`}>
                      {message.isBot ? (
                        <Bot className="h-8 w-8 text-blue-500" />
                      ) : (
                        <User className="h-8 w-8 text-gray-500" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                          message.isBot
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        {message.text}
                      </div>
                      {message.priority && (
                        <div className={`mt-1 text-xs ${
                          message.priority === 'high' ? 'text-red-600' :
                          message.priority === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          {message.priority} priority
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center text-gray-500"
                  >
                    <Bot className="h-8 w-8 mr-2" />
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      Typing...
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}