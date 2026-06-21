import React, { useState } from 'react';
import { X, ImagePlus, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Post } from '../types';
import { toast } from 'sonner';

interface EditPostModalProps {
  post: Post;
  onClose: () => void;
  onSaved: () => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({ post, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const { darkMode } = useAppContext();
  const { currentUser } = useAuth();

  const [content, setContent] = useState(post.content || '');
  const [image, setImage] = useState(post.image || '');
  const [price, setPrice] = useState(post.price?.toString() || '');
  const [location, setLocation] = useState(post.location || '');
  const [category, setCategory] = useState(post.category || '');
  const [paymentMethods, setPaymentMethods] = useState<string[]>(post.paymentMethods || []);
  const [saving, setSaving] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('createPost.imageSizeError'));
      return;
    }
    try {
      const result = await api.uploadImage(file);
      setImage(result.url);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error(t('createPost.shareThoughts'));
      return;
    }
    setSaving(true);
    try {
      const updateData: any = {
        content: content.trim(),
        image,
        location,
        category,
        payment_methods: paymentMethods,
      };
      if (post.type === 'ad' && price) {
        updateData.price = parseFloat(price) || 0;
      }
      await api.updatePost(post.id, updateData);
      toast.success(t('postCard.postUpdated'));
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    }
    setSaving(false);
  };

  const togglePaymentMethod = (method: string) => {
    setPaymentMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  // Categories list matching the interests
  const categories = [
    { id: 'phones', label: t('interests.phones') },
    { id: 'electronics', label: t('interests.electronics') },
    { id: 'games', label: t('interests.games') },
    { id: 'cars', label: t('interests.cars') },
    { id: 'realEstate', label: t('interests.realEstate') },
    { id: 'fashion', label: t('interests.fashion') },
    { id: 'beauty', label: t('interests.beauty') },
    { id: 'sports', label: t('interests.sports') },
    { id: 'food', label: t('interests.food') },
    { id: 'jobs', label: t('interests.jobs') },
    { id: 'services', label: t('interests.services') },
    { id: 'education', label: t('interests.education') },
    { id: 'books', label: t('interests.books') },
    { id: 'animals', label: t('interests.animals') },
    { id: 'travel', label: t('interests.travel') },
    { id: 'photography', label: t('interests.photography') },
    { id: 'health', label: t('interests.health') },
    { id: 'other', label: t('interests.other') },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
        dir={dir}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden max-h-[90vh] overflow-y-auto ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <h2 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {post.type === 'ad' ? t('postCard.editAd') : t('postCard.editPost')}
            </h2>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Content */}
            <div>
              <label className={`text-xs font-bold block mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('createPost.shareThoughts')}
              </label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={4}
                className={`w-full text-sm px-3 py-2 rounded-xl border outline-none transition-colors resize-none ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-orange-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-400'
                }`}
                placeholder={t('createPost.shareThoughts')}
              />
            </div>

            {/* Image */}
            <div>
              <label className={`text-xs font-bold block mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('createPost.addImage')}
              </label>
              {image ? (
                <div className="relative">
                  <img src={image} alt="" className="w-full h-40 object-cover rounded-xl" />
                  <button
                    onClick={() => setImage('')}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label htmlFor="fileInputRef-input" className={`w-full h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                    darkMode ? 'border-gray-600 hover:border-orange-500 text-gray-500' : 'border-gray-200 hover:border-orange-400 text-gray-400'
                  }`} style={{cursor:"pointer"}}>
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-xs font-bold">{t('createPost.addImageBtn')}</span>
                </label>
              )}
              <input type="file" ref={fileInputRef} accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tiff,.avif,.heic,.heif,.ico,.jfif" className="sr-only" onChange={handleImageUpload} />
            </div>

            {/* Ad-specific fields */}
            {post.type === 'ad' && (
              <>
                {/* Price */}
                <div>
                  <label className={`text-xs font-bold block mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('createPost.price')}
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className={`w-full text-sm px-3 py-2 rounded-xl border outline-none transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-orange-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-400'
                    }`}
                    placeholder={t('createPost.price')}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className={`text-xs font-bold block mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('createPost.category')}
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className={`w-full text-sm px-3 py-2 rounded-xl border outline-none transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-orange-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-orange-400'
                    }`}
                  >
                    <option value="">{t('createPost.category')}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Payment Methods */}
                <div>
                  <label className={`text-xs font-bold block mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('postCard.paymentAvailable')}
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {['vf_cash', 'instapay'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => togglePaymentMethod(method)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          paymentMethods.includes(method)
                            ? 'bg-orange-500 text-white border-orange-500'
                            : darkMode
                              ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-orange-500'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-400'
                        }`}
                      >
                        {method === 'vf_cash' ? t('postCard.vodafoneCash') : t('postCard.instaPay')}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Location */}
            <div>
              <label className={`text-xs font-bold block mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('createPost.location')}
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className={`w-full text-sm px-3 py-2 rounded-xl border outline-none transition-colors ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-orange-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-400'
                }`}
                placeholder={t('createPost.location')}
              />
            </div>
          </div>

          {/* Footer */}
          <div className={`flex items-center gap-3 p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <button
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('common.save')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
