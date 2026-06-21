import React, { useState, useEffect, useRef } from 'react';
import { Story, User } from '../types';
import { Plus, X, ChevronLeft, ChevronRight, Send, Eye, Heart, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface StoriesProps {
  stories: Story[];
  currentUser: User | null;
}

const STORY_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👏'];

export const Stories: React.FC<StoriesProps> = ({ stories, currentUser }) => {
  const { darkMode } = useAppContext();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleStoryClick = async (story: Story, index: number) => {
    setViewingStory(story);
    setStoryIndex(index);
    setShowReactions(false);
    setReplyText('');
    // Mark story as viewed
    if (story.id && !viewedStories.has(story.id)) {
      try {
        await api.viewStory(story.id);
        setViewedStories(prev => new Set([...prev, story.id]));
      } catch {}
    }
  };

  const handleNextStory = () => {
    const nextIndex = storyIndex + 1;
    if (nextIndex < stories.length) {
      setStoryIndex(nextIndex);
      setViewingStory(stories[nextIndex]);
      setShowReactions(false);
      setReplyText('');
      // View next story
      const nextStory = stories[nextIndex];
      if (nextStory?.id && !viewedStories.has(nextStory.id)) {
        api.viewStory(nextStory.id).catch(() => {});
        setViewedStories(prev => new Set([...prev, nextStory.id]));
      }
    } else {
      setViewingStory(null);
    }
  };

  const handlePrevStory = () => {
    const prevIndex = storyIndex - 1;
    if (prevIndex >= 0) {
      setStoryIndex(prevIndex);
      setViewingStory(stories[prevIndex]);
      setShowReactions(false);
    }
  };

  const handleCreateStoryClick = () => {
    const event = new CustomEvent('openStoryCreator');
    window.dispatchEvent(event);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !viewingStory?.id) return;
    try {
      await api.replyToStory(viewingStory.id, replyText.trim());
      toast.success(t('stories.replySent', 'تم إرسال الرد'));
      setReplyText('');
    } catch (err: any) {
      toast.error(err.message || t('stories.replyFailed', 'فشل إرسال الرد'));
    }
  };

  const handleReact = async (emoji: string) => {
    if (!viewingStory?.id) return;
    try {
      await api.reactToStory(viewingStory.id, emoji);
      setShowReactions(false);
      toast.success(t('stories.reactionSent', 'تم إرسال التفاعل'));
    } catch {}
  };

  const handleShowViewers = async () => {
    if (!viewingStory?.id) return;
    try {
      const data = await api.getStoryViewers(viewingStory.id);
      setViewers(data);
      setShowViewers(true);
    } catch {}
  };

  // Auto-advance story
  useEffect(() => {
    if (viewingStory && !showViewers) {
      const isVideo = (viewingStory as any).videoUrl || (viewingStory as any).type === 'video';
      if (isVideo) return; // Video stories don't auto-advance
      const timer = setTimeout(() => {
        handleNextStory();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [viewingStory, storyIndex, showViewers]);

  // Clean up expired stories on mount
  useEffect(() => {
    api.deleteExpiredStories().catch(() => {});
  }, []);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto py-2 hide-scrollbar">
        {/* Create Story */}
        <div
          onClick={handleCreateStoryClick}
          className={`relative min-w-[110px] h-48 rounded-2xl overflow-hidden shadow-sm cursor-pointer group ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border`}
        >
          <div className="h-2/3 overflow-hidden">
            <img src={currentUser?.avatarBase64 || currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id || 'default'}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Me" />
          </div>
          <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className={`w-8 h-8 rounded-full bg-orange-600 border-4 ${darkMode ? 'border-gray-800' : 'border-white'} flex items-center justify-center text-white`}>
              <Plus className="w-5 h-5" />
            </div>
          </div>
          <div className={`h-1/3 flex items-end justify-center pb-2 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <span className={`text-[11px] font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{t('stories.createStory')}</span>
          </div>
        </div>

        {/* User Stories */}
        {stories.map((story, index) => {
          const isVideo = (story as any).videoUrl || (story as any).type === 'video';
          return (
            <div
              key={story.id}
              onClick={() => handleStoryClick(story, index)}
              className={`relative min-w-[110px] h-48 rounded-2xl overflow-hidden shadow-sm cursor-pointer group ${darkMode ? 'border-gray-700' : 'border-gray-100'} border`}
            >
              {story.type === 'text' && story.backgroundColor ? (
                <div className={`w-full h-full bg-gradient-to-br ${story.backgroundColor} flex items-center justify-center p-3`}>
                  <p className="text-white text-sm font-black text-center leading-tight" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    {story.text || story.user.name}
                  </p>
                </div>
              ) : (
                <img src={story.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Story" />
              )}
              {/* Video indicator */}
              {isVideo && (
                <div className="absolute top-2 left-2 bg-black/60 rounded-full px-1.5 py-0.5">
                  <span className="text-white text-[9px]">▶ {t('stories.video', 'فيديو')}</span>
                </div>
              )}
              {/* View count */}
              {(story as any).viewCount > 0 && (
                <div className="absolute bottom-8 left-2 flex items-center gap-0.5 bg-black/50 rounded-full px-1.5 py-0.5">
                  <Eye className="w-3 h-3 text-white" />
                  <span className="text-white text-[9px]">{(story as any).viewCount}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/20" />
              <div className={`absolute top-2 right-2 w-9 h-9 rounded-full border-4 p-0.5 ${darkMode ? 'bg-gray-800' : 'bg-white'} ${story.isSeen || viewedStories.has(story.id) ? 'border-gray-300' : 'border-orange-600'}`}>
                <img src={story.user.avatar} className={`w-full h-full rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`} alt={story.user.name} />
              </div>
              <div className="absolute bottom-2 right-2 left-2">
                <span className="text-white text-[11px] font-bold leading-tight block truncate" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  {story.user.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {viewingStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black flex items-center justify-center"
            onClick={() => setViewingStory(null)}
          >
            {/* Progress bar */}
            <div className="absolute top-4 left-4 right-4 z-10">
              <div className="flex gap-1">
                {stories.map((_, i) => (
                  <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-white rounded-full transition-all ${i < storyIndex ? 'w-full' : i === storyIndex ? 'w-full animate-progress' : 'w-0'}`}
                      style={i === storyIndex ? { animation: 'progress 5s linear' } : {}}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* User info */}
            <div className="absolute top-8 right-4 left-4 z-10 flex items-center justify-between">
              <button onClick={() => setViewingStory(null)} className="text-white p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                <img src={viewingStory.user.avatar} alt="" className="w-8 h-8 rounded-full border-2 border-white" />
                <div>
                  <span className="text-white font-bold text-sm">{viewingStory.user.name}</span>
                  <span className="text-white/60 text-[10px] block">{viewingStory.createdAt ? new Date(viewingStory.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : t('stories.now')}</span>
                </div>
              </div>
            </div>

            {/* Story content */}
            <div className="max-w-md max-h-[80vh] w-full mx-4 relative" onClick={e => e.stopPropagation()}>
              {(viewingStory as any).videoUrl ? (
                <video
                  ref={videoRef}
                  src={(viewingStory as any).videoUrl}
                  className="w-full h-[70vh] object-cover rounded-2xl"
                  autoPlay
                  controls
                  onEnded={handleNextStory}
                />
              ) : viewingStory.type === 'text' && viewingStory.backgroundColor ? (
                <div className={`w-full h-[70vh] bg-gradient-to-br ${viewingStory.backgroundColor} rounded-2xl flex items-center justify-center p-8`}>
                  <p className="text-white text-2xl font-black text-center leading-relaxed" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                    {viewingStory.text}
                  </p>
                </div>
              ) : (
                <img src={viewingStory.image} alt="Story" className="w-full h-[70vh] object-cover rounded-2xl" />
              )}

              {/* Navigation arrows */}
              {storyIndex > 0 && (
                <button onClick={handlePrevStory} className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30">
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
              {storyIndex < stories.length - 1 && (
                <button onClick={handleNextStory} className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Viewers button (only for own stories) */}
              {viewingStory.user.id === user?.id && (
                <button
                  onClick={handleShowViewers}
                  className="absolute top-4 left-4 flex items-center gap-1 bg-black/50 rounded-full px-3 py-1.5 hover:bg-black/70 transition-colors"
                >
                  <Eye className="w-4 h-4 text-white" />
                  <span className="text-white text-xs">{(viewingStory as any).viewCount || 0}</span>
                </button>
              )}
            </div>

            {/* Bottom bar: Reply + Reactions */}
            <div className="absolute bottom-6 left-4 right-4 z-10 flex items-center gap-2" onClick={e => e.stopPropagation()}>
              {/* Reaction button */}
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <Heart className="w-5 h-5" />
              </button>

              {/* Reply input */}
              <div className="flex-1 flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReply()}
                  placeholder={t('stories.replyPlaceholder', 'أرسل رد على القصة...')}
                  className="flex-1 bg-transparent text-white placeholder-white/50 text-sm outline-none"
                />
                {replyText.trim() && (
                  <button onClick={handleReply} className="text-orange-400 hover:text-orange-300">
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Reaction picker */}
            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/70 backdrop-blur-md rounded-full px-4 py-3"
                  onClick={e => e.stopPropagation()}
                >
                  {STORY_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      className="text-2xl hover:scale-125 transition-transform active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Viewers modal */}
            <AnimatePresence>
              {showViewers && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-20 left-4 right-4 z-20 bg-black/80 backdrop-blur-md rounded-2xl p-4 max-h-[40vh] overflow-y-auto"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold text-sm">
                      <Eye className="w-4 h-4 inline mr-1" />
                      {viewers.length} {t('stories.viewers', 'مشاهد')}
                    </h3>
                    <button onClick={() => setShowViewers(false)} className="text-white/60 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {viewers.length === 0 ? (
                    <p className="text-white/50 text-sm text-center py-4">{t('stories.noViewers', 'لا يوجد مشاهدين بعد')}</p>
                  ) : (
                    <div className="space-y-2">
                      {viewers.map((v: any) => (
                        <div key={v.id} className="flex items-center gap-3">
                          <img src={v.avatar} alt="" className="w-8 h-8 rounded-full" />
                          <span className="text-white text-sm">{v.name}</span>
                          <span className="text-white/40 text-xs mr-auto">{new Date(v.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes progress {
          from { width: 0; }
          to { width: 100%; }
        }
        .animate-progress {
          animation: progress 5s linear forwards;
        }
      `}</style>
    </>
  );
};
