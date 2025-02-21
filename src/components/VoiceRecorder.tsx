import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Upload } from 'lucide-react';
import { useTicketStore } from '../store/ticketStore';
import { useAuthStore } from '../store/authStore';

interface VoiceRecorderProps {
  onClose: () => void;
}

export default function VoiceRecorder({ onClose }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const { createTicket, analyzeTicket } = useTicketStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleUpload = async () => {
    if (!audioBlob || !user) return;

    setLoading(true);
    try {
      // In a real implementation, you would:
      // 1. Upload the audio to storage
      // 2. Use a speech-to-text service
      // For now, we'll create a placeholder ticket
      const dummyTranscription = "Voice ticket placeholder";
      const analysis = await analyzeTicket(dummyTranscription);
      
      await createTicket({
        title: 'Voice Ticket',
        description: dummyTranscription,
        category: analysis.category,
        priority: analysis.priority,
        status: 'open',
        user_id: user.id,
        channel: 'voice',
        sentiment_score: analysis.sentiment,
      });

      onClose();
    } catch (error) {
      console.error('Failed to process voice ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
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
          className="relative w-full max-w-md rounded-lg bg-white shadow-lg"
        >
          <div className="p-6">
            <div className="flex flex-col items-center space-y-6">
              <motion.div
                animate={isRecording ? { scale: [1, 1.2, 1], transition: { repeat: Infinity } } : {}}
                className={`p-8 rounded-full ${isRecording ? 'bg-red-100' : 'bg-blue-100'}`}
              >
                <Mic className={`h-12 w-12 ${isRecording ? 'text-red-500' : 'text-blue-500'}`} />
              </motion.div>

              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {isRecording ? 'Recording...' : audioBlob ? 'Recording Complete' : 'Start Recording'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {isRecording ? 'Click stop when finished' : audioBlob ? 'Ready to upload' : 'Click to start recording'}
                </p>
              </div>

              <div className="flex space-x-4">
                {!audioBlob ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`px-4 py-2 rounded-md text-white ${
                      isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Square className="h-4 w-4 inline mr-2" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 inline mr-2" />
                        Start
                      </>
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUpload}
                    disabled={loading}
                    className="px-4 py-2 rounded-md text-white bg-green-500 hover:bg-green-600 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 inline mr-2" />
                    {loading ? 'Processing...' : 'Upload'}
                  </motion.button>
                )}
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="px-4 py-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}