import React, { useState } from 'react';
import { Story, User } from '../types';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../contexts/AppContext';
import { useTranslation } from 'react-i18next';

interface StoriesProps {
  stories: Story[];
  currentUser: User | null;
}

export const Stories: React.FC<StoriesProps> = ({ stories, currentUser }) => {
  const { darkMode } = useAppContext();
  const { t } = useTranslation();
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);

  const handleStoryClick = (story: Story, index: number) => {
    setViewingStory(story);
    setStoryIndex(index);
  };

  const handleNextStory = () => {
    const nextIndex = storyIndex + 1;
    if (nextIndex < stories.length) {
      setStoryIndex(nextIndex);
      setViewingStory(stories[nextIndex]);
    } else {
      setViewingStory(null);
    }
  };

  const handlePrevStory = () => {
    const prevIndex = storyIndex - 1;
    if (prevIndex >= 0) {
      setStoryIndex(prevIndex);
      setViewingStory(stories[prevIndex]);
    }
  };

  const handleCreateStoryClick = () => {
    // This triggers the story creator in CreatePost via a custom event
    const event = new CustomEvent('openStoryCreator');
    window.dispatchEvent(event);
  };

  // Auto-advance story
  React.useEffect(() => {
    if (viewingStory) {
      const timer = setTimeout(() => {
        handleNextStory();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [viewingStory, storyIndex]);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto py-2 hide-scrollbar">
        {/* Create Story */}
        <div
          onClick={handleCreateStoryClick}
          className={`relative min-w-[80px] sm:min-w-[110px] h-36 sm:h-48 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm cursor-pointer group ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border`}
        >
          <div className="h-2/3 overflow-hidden">
            <img src={currentUser?.avatarBase64 || currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id || 'default'}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Me" />
          </div>
          <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-600 border-4 ${darkMode ? 'border-gray-800' : 'border-white'} flex items-center justify-center text-white`}>
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className={`h-1/3 flex items-end justify-center pb-1.5 sm:pb-2 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <span className={`text-[9px] sm:text-[11px] font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{t('stories.createStory')}</span>
          </div>
        </div>

        {/* User Stories */}
        {stories.map((story, index) => (
          <div
            key={story.id}
            onClick={() => handleStoryClick(story, index)}
            className={`relative min-w-[80px] sm:min-w-[110px] h-36 sm:h-48 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm cursor-pointer group ${darkMode ? 'border-gray-700' : 'border-gray-100'} border`}
          >
            {story.type === 'text' && story.backgroundColor ? (
              <div className={`w-full h-full bg-gradient-to-br ${story.backgroundColor} flex items-center justify-center p-2 sm:p-3`}>
                <p className="text-white text-xs sm:text-sm font-black text-center leading-tight" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  {story.text || story.user.name}
                </p>
              </div>
            ) : (
              <img src={story.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Story" />
            )}
            <div className="absolute inset-0 bg-black/20" />
            <div className={`absolute top-1.5 sm:top-2 right-1.5 sm:right-2 w-7 h-7 sm:w-9 sm:h-9 rounded-full border-3 sm:border-4 p-0.5 ${darkMode ? 'bg-gray-800' : 'bg-white'} ${story.isSeen ? 'border-gray-300' : 'border-orange-600'}`}>
              <img src={story.user.avatar} className={`w-full h-full rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`} alt={story.user.name} />
            </div>
            <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 left-1.5 sm:left-2">
              <span className="text-white text-[9px] sm:text-[11px] font-bold leading-tight block truncate" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                {story.user.name}
              </span>
            </div>
          </div>
        ))}
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
              {viewingStory.type === 'text' && viewingStory.backgroundColor ? (
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
            </div>
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
