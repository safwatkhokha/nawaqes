// ─── API Service Layer ──────────────────────────────────────────────
// Central API client that handles all HTTP requests to the backend

import i18n from '../i18n';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('nawaqes_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('nawaqes_token', token);
    } else {
      localStorage.removeItem('nawaqes_token');
    }
  }

  getToken() { return this.token; }

  private async request<T>(endpoint: string, options: RequestInit = {}, skipAuthExpired = false): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Capture the token used for this specific request to detect race conditions
    const requestToken = this.token;
    if (requestToken) {
      headers['Authorization'] = `Bearer ${requestToken}`;
    }

    let res: Response;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    } catch (err) {
      throw new Error(i18n.t('api.networkError'));
    }

    if (res.status === 401) {
      // Race condition protection: only clear the token if it hasn't changed
      // since this request was made. If a new token was set (e.g., after login),
      // don't wipe it just because a stale request returned 401.
      const currentToken = this.token;
      if (requestToken && currentToken === requestToken) {
        // Token is the same as when the request was made — it's genuinely stale
        this.setToken(null);
        if (!skipAuthExpired) {
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
      } else if (requestToken && currentToken && currentToken !== requestToken) {
        // Token changed since this request — a new login happened.
        // Don't clear the new token; this 401 is from a stale request.
        // Don't dispatch auth:expired either.
      } else if (!requestToken && !currentToken) {
        // No token was used and none exists now — nothing to do
      }
      throw new Error(i18n.t('api.sessionExpired'));
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: i18n.t('api.networkError') }));
      throw new Error(data.error || i18n.t('api.unexpectedError'));
    }

    // Handle empty response body (e.g., res.json(undefined) in Express)
    const text = await res.text();
    if (!text || text.trim() === '') {
      return {} as T;
    }
    return JSON.parse(text) as T;
  }

  // ─── Auth ──────────────────────────────────────────────────────────
  // Use skipAuthExpired=true for login/register so that a stale token
  // sent in the Authorization header doesn't trigger auth:expired.
  // These endpoints don't require auth, so 401 here is a real login failure.
  async login(email: string, password: string) {
    // Clear any stale token BEFORE making the login request to avoid
    // sending a bad Authorization header that could confuse things
    const staleToken = this.token;
    this.token = null;
    try {
      const data = await this.request<{ user: any; token: string }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }, true);
      this.setToken(data.token);
      return data;
    } catch (err) {
      // Restore stale token on failure so other requests don't break
      if (staleToken && !this.token) this.token = staleToken;
      throw err;
    }
  }

  async register(name: string, email: string, password: string, interests?: string[], phone?: string, gender?: 'male' | 'female', dateOfBirth?: string) {
    // Clear any stale token BEFORE making the register request
    const staleToken = this.token;
    this.token = null;
    try {
      const data = await this.request<{ user: any; token: string }>('/auth/register', {
        method: 'POST', body: JSON.stringify({ name, email, password, interests, phone, gender, dateOfBirth }),
      }, true);
      this.setToken(data.token);
      return data;
    } catch (err) {
      if (staleToken && !this.token) this.token = staleToken;
      throw err;
    }
  }

  async getMe() {
    // Use skipAuthExpired=true to avoid triggering logout toast on session check
    return this.request<any>('/auth/me', {}, true);
  }

  async updateProfile(updates: Record<string, any>) {
    return this.request<any>('/auth/profile', {
      method: 'PUT', body: JSON.stringify(updates),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // ─── Forgot / Reset Password ───────────────────────────────────────
  async forgotPassword(email: string) {
    return this.request<{ message: string; resetCode?: string }>('/auth/forgot-password', {
      method: 'POST', body: JSON.stringify({ email }),
    }, true);
  }

  async resetPassword(code: string, newPassword: string) {
    return this.request<{ message: string; user: any; token: string }>('/auth/reset-password', {
      method: 'POST', body: JSON.stringify({ code, newPassword }),
    }, true);
  }

  // ─── Posts ─────────────────────────────────────────────────────────
  async getPosts(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ posts: any[]; total: number; page: number }>(`/posts${query}`);
  }

  async getPromotedPosts(limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<{ posts: any[] }>(`/posts/promoted${query}`);
  }

  async getPost(id: string) {
    return this.request<any>(`/posts/${id}`);
  }

  async createPost(data: any) {
    return this.request<any>('/posts', {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  async updatePost(id: string, data: any) {
    return this.request<any>(`/posts/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    });
  }

  async deletePost(id: string) {
    return this.request<{ message: string }>(`/posts/${id}`, { method: 'DELETE' });
  }

  async likePost(id: string) {
    return this.request<{ likes: number; liked: boolean }>(`/posts/${id}/like`, { method: 'POST' });
  }

  async commentPost(id: string, content: string, parentId?: string, imageUrl?: string) {
    return this.request<any>(`/posts/${id}/comment`, {
      method: 'POST', body: JSON.stringify({ content, parentId: parentId || undefined, imageUrl: imageUrl || undefined }),
    });
  }

  async likeComment(postId: string, commentId: string) {
    return this.request<any>(`/posts/${postId}/comment/${commentId}/like`, { method: 'POST' });
  }

  async deleteComment(postId: string, commentId: string) {
    return this.request<{ message: string }>(`/posts/${postId}/comment/${commentId}`, { method: 'DELETE' });
  }

  async getComments(postId: string) {
    return this.request<any[]>(`/posts/${postId}/comments`);
  }

  // ─── Chat ──────────────────────────────────────────────────────────
  async getChatContacts() {
    return this.request<any[]>('/chat/contacts');
  }

  async getChatMessages(contactId: string, params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/chat/messages/${contactId}${query}`);
  }

  async sendMessage(receiverId: string, text: string, postId?: string, messageType?: string, imageUrl?: string, replyToId?: string) {
    return this.request<any>('/chat/send', {
      method: 'POST', body: JSON.stringify({ receiverId, text, postId, messageType, imageUrl, replyToId }),
    });
  }

  async deleteMessage(messageId: string) {
    return this.request<{ message: string }>(`/chat/messages/${messageId}`, { method: 'DELETE' });
  }

  async reactToMessage(messageId: string, emoji: string) {
    return this.request<{ message: string; reactions: Record<string, string> }>(`/chat/messages/${messageId}/react`, {
      method: 'POST', body: JSON.stringify({ emoji }),
    });
  }

  async uploadChatImage(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}/chat/upload-image`, {
      method: 'POST', headers, body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Image upload failed' }));
      throw new Error(data.error);
    }
    return res.json();
  }

  // ─── Wallet ────────────────────────────────────────────────────────
  async getWalletBalance() {
    return this.request<{ balance: number }>('/wallet/balance');
  }

  async getTransactions() {
    return this.request<any[]>('/wallet/transactions');
  }

  async chargeRequest(amount: number, method: string, receiptImage?: string, additionalPhone?: string) {
    return this.request<{ message: string }>('/wallet/charge-request', {
      method: 'POST', body: JSON.stringify({ amount, method, receiptImage, additionalPhone }),
    });
  }

  // ─── Admin ─────────────────────────────────────────────────────────
  async getAdminStats() {
    return this.request<any>('/admin/stats');
  }

  async getAdminChart() {
    return this.request<any[]>('/admin/chart');
  }

  async getPromotionRequests() {
    return this.request<any[]>('/admin/promotion-requests');
  }

  async approvePromotion(id: string) {
    return this.request<{ message: string }>(`/admin/promotion-requests/${id}/approve`, { method: 'POST' });
  }

  async rejectPromotion(id: string) {
    return this.request<{ message: string }>(`/admin/promotion-requests/${id}/reject`, { method: 'POST' });
  }

  async getChargingRequests() {
    return this.request<any[]>('/wallet/admin/charging-requests');
  }

  async approveCharging(id: string) {
    return this.request<{ message: string }>(`/wallet/admin/charging-requests/${id}/approve`, { method: 'POST' });
  }

  async rejectCharging(id: string) {
    return this.request<{ message: string }>(`/wallet/admin/charging-requests/${id}/reject`, { method: 'POST' });
  }

  async getAdminUsers() {
    return this.request<any[]>('/admin/users');
  }

  async createAlert(title: string, content: string, source?: string) {
    return this.request<any>('/admin/alerts', {
      method: 'POST', body: JSON.stringify({ title, content, source }),
    });
  }

  async deleteAlert(id: string) {
    return this.request<{ message: string }>(`/admin/alerts/${id}`, { method: 'DELETE' });
  }

  // ─── General ───────────────────────────────────────────────────────
  async getCategories() { return this.request<any[]>('/categories'); }
  async getNews() { return this.request<any[]>('/news'); }
  async getStories() { return this.request<any[]>('/stories'); }
  async getTrends(category?: string) { return this.request<any[]>(category ? `/trends?category=${category}` : '/trends'); }
  async refreshTrends() { return this.request<{ message: string; trends: any[] }>('/trends/refresh', { method: 'POST' }); }
  async getOpportunities(limit?: number) { return this.request<any[]>(limit ? `/opportunities?limit=${limit}` : '/opportunities'); }
  async getMarketPulseOverview() { return this.request<any>('/market-pulse/overview'); }
  async getNotifications() { return this.request<any[]>('/notifications'); }
  async markNotificationsRead() { return this.request<{ message: string }>('/notifications/mark-read', { method: 'POST' }); }
  async markNotificationRead(id: string) { return this.request<{ message: string }>(`/notifications/${id}/mark-read`, { method: 'POST' }); }
  async deleteNotification(id: string) { return this.request<{ message: string }>(`/notifications/${id}`, { method: 'DELETE' }); }
  async getUserProfile(id: string) { return this.request<any>(`/users/${id}`); }
  async requestPromotion(data: any) { return this.request<any>('/promotions', { method: 'POST', body: JSON.stringify(data) }); }
  async getMyPromotionRequests() { return this.request<any[]>('/promotions/my-requests'); }
  async createStory(data: any) { return this.request<any>('/stories', { method: 'POST', body: JSON.stringify(data) }); }
  async getFriendRequests() { return this.request<any[]>('/friends/requests'); }
  async getSentFriendRequests() { return this.request<any[]>('/friends/sent'); }
  async getFriendsList() { return this.request<any[]>('/friends/list'); }
  async getFriendSuggestions() { return this.request<any[]>('/friends/suggestions'); }
  async sendFriendRequest(userId: string) { return this.request<{ message: string }>('/friends/request', { method: 'POST', body: JSON.stringify({ userId }) }); }
  async acceptFriendRequest(id: string) { return this.request<{ message: string }>(`/friends/accept/${id}`, { method: 'POST' }); }
  async rejectFriendRequest(id: string) { return this.request<{ message: string }>(`/friends/reject/${id}`, { method: 'POST' }); }
  async cancelSentFriendRequest(id: string) { return this.request<{ message: string }>(`/friends/cancel/${id}`, { method: 'POST' }); }
  async unfriend(friendshipId: string) { return this.request<{ message: string }>(`/friends/unfriend/${friendshipId}`, { method: 'POST' }); }
  async getFriendshipStatus(userId: string) { return this.request<{ friendshipStatus: string | null; lastSeenAt?: string | null }>(`/friends/status/${userId}`); }
  async notifyFriendsLivestream(streamTitle: string) { return this.request<{ success: boolean; notifiedFriends: number }>('/livestream/notify-friends', { method: 'POST', body: JSON.stringify({ streamTitle }) }); }
  async getActiveLivestreams() { return this.request<any[]>('/livestream/active'); }
  async searchUsers(query: string) { return this.request<any[]>(`/users/search?q=${encodeURIComponent(query)}`); }
  async getSmartReachStats() { return this.request<any>('/smart-reach/stats'); }
  async getSmartReachPromotionAnalytics(id: string) { return this.request<any>(`/smart-reach/promotion/${id}/analytics`); }
  async getSmartReachSuggestions() { return this.request<any>('/smart-reach/suggestions'); }
  async getSmartReachCompare() { return this.request<any>('/smart-reach/compare'); }
  async getSmartReachRealtime() { return this.request<any>('/smart-reach/realtime'); }
  async trackImpressions(postIds: string[]) { return this.request<{ tracked: number }>('/posts/track-impressions', { method: 'POST', body: JSON.stringify({ postIds }) }); }
  async trackClick(postId: string) { return this.request<{ clicks: number }>(`/posts/${postId}/click`, { method: 'POST' }); }

  // ─── File Upload ───────────────────────────────────────────────────
  async uploadImage(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: i18n.t('api.imageUploadFailed') }));
      throw new Error(data.error);
    }

    return res.json();
  }

  // ─── Admin: Toggle User Verification ───────────────────────────────
  async toggleUserVerification(userId: string): Promise<{ id: string; is_verified: boolean; message: string }> {
    return this.request(`/admin/users/${userId}/verify`, { method: 'PATCH' });
  }

  // ─── Admin: Delete User ────────────────────────────────────────────
  async deleteUser(userId: string): Promise<{ message: string }> {
    return this.request(`/admin/users/${userId}`, { method: 'DELETE' });
  }

  // ─── Admin: Toggle Admin Status ──────────────────────────────────
  async toggleUserAdmin(userId: string) {
    return this.request<any>(`/admin/users/${userId}/toggle-admin`, { method: 'PATCH' });
  }

  // ─── Admin: Toggle User Active/Deactivated ────────────────────────
  async toggleUserActive(userId: string) {
    return this.request<any>(`/admin/users/${userId}/toggle-active`, { method: 'PATCH' });
  }

  // ─── Admin: Adjust User Wallet ────────────────────────────────────
  async adjustUserWallet(userId: string, amount: number, reason: string) {
    return this.request<any>(`/admin/users/${userId}/adjust-wallet`, {
      method: 'POST', body: JSON.stringify({ amount, reason }),
    });
  }

  // ─── Admin: Get Reports ───────────────────────────────────────────
  async getAdminReports() {
    return this.request<any[]>('/admin/reports');
  }

  // ─── Admin: Dismiss Report ────────────────────────────────────────
  async dismissReport(id: string) {
    return this.request<{ message: string }>(`/admin/reports/${id}/dismiss`, { method: 'DELETE' });
  }

  // ─── Admin: Category CRUD ─────────────────────────────────────────
  async addCategory(name: string, icon: string, sort?: number) {
    return this.request<any>('/admin/categories', {
      method: 'POST', body: JSON.stringify({ name, icon, sort }),
    });
  }

  async updateCategory(id: string, data: { name?: string; icon?: string; sort?: number }) {
    return this.request<any>(`/admin/categories/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string) {
    return this.request<{ message: string }>(`/admin/categories/${id}`, { method: 'DELETE' });
  }

  // ─── Admin: Feature/Unfeature Post ────────────────────────────────
  async featurePost(id: string) {
    return this.request<any>(`/admin/posts/${id}/feature`, { method: 'PUT' });
  }

  async unfeaturePost(id: string) {
    return this.request<any>(`/admin/posts/${id}/feature`, { method: 'DELETE' });
  }

  // ─── Admin: Flag Post ─────────────────────────────────────────────
  async flagPost(id: string) {
    return this.request<any>(`/admin/posts/${id}/flag`, { method: 'PATCH' });
  }

  // ─── Admin: News CRUD ─────────────────────────────────────────────
  async addNews(data: { title: string; content: string; source: string; category: string; isAlert?: boolean }) {
    return this.request<any>('/admin/news', {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  async updateNews(id: string, data: { title?: string; content?: string; source?: string; category?: string; isAlert?: boolean }) {
    return this.request<any>(`/admin/news/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    });
  }

  async deleteNews(id: string) {
    return this.request<{ message: string }>(`/admin/news/${id}`, { method: 'DELETE' });
  }

  // ─── Admin: Settings ──────────────────────────────────────────────
  async getAdminSettings() {
    return this.request<any>('/admin/settings');
  }

  async updateAdminSettings(settings: Record<string, any>) {
    return this.request<any>('/admin/settings', {
      method: 'PUT', body: JSON.stringify(settings),
    });
  }

  // ─── Admin: Detailed Stats ────────────────────────────────────────
  async getAdminDetailedStats() {
    return this.request<any>('/admin/detailed-stats');
  }

  // ─── Market Live ─────────────────────────────────────────────────────
  async getMarketLiveFeed(category?: string, page?: number, limit?: number) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (page !== undefined) params.set('page', page.toString());
    if (limit !== undefined) params.set('limit', limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ videos: any[]; total: number; page: number; hasMore: boolean }>(`/market/market-live/feed${query}`);
  }

  async marketLiveInteract(videoId: string, interactionType: 'like' | 'save' | 'share' | 'view') {
    return this.request<{ message: string; action: string }>('/market/market-live/interact', {
      method: 'POST', body: JSON.stringify({ videoId, interactionType }),
    });
  }

  async uploadVideo(file: File): Promise<{ url: string; filename: string; size: number }> {
    const formData = new FormData();
    formData.append('video', file);

    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}/videos/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Video upload failed' }));
      throw new Error(data.error);
    }

    return res.json();
  }

  async linkVideo(postId: string, videoUrl: string, thumbnailUrl?: string, duration?: number) {
    return this.request<any>('/market-live/link-video', {
      method: 'POST', body: JSON.stringify({ postId, videoUrl, thumbnailUrl, duration }),
    });
  }

  async getMarketLiveStats() {
    return this.request<any>('/market/market-live/stats');
  }

  async getMyVideos() {
    return this.request<any[]>('/market-live/my-videos');
  }

  // ─── Share Tracking ────────────────────────────────────────────────
  async trackShare(postId: string, platform: string) {
    return this.request<{ message: string; totalShares: number }>(`/posts/${postId}/share`, {
      method: 'POST', body: JSON.stringify({ platform }),
    });
  }

  async getShareStats(postId: string) {
    return this.request<{ total: number; byPlatform: Record<string, number>; recentShares: any[] }>(`/posts/${postId}/share-stats`);
  }

  // ─── Smart Link Enhanced ───────────────────────────────────────────
  async generateSmartLink(postId: string, alias: string) {
    return this.request<{ url: string; alias: string }>(`/smart-link/generate`, {
      method: 'POST', body: JSON.stringify({ postId, alias }),
    });
  }

  async getSmartLinkStats(postId: string) {
    return this.request<{ totalVisits: number; uniqueVisitors: number; visitsByDate: any[]; recentVisitors: any[] }>(`/smart-link/${postId}/stats`);
  }

  // ─── Admin: Transactions ──────────────────────────────────────────
  async getAdminTransactions(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ transactions: any[]; total: number; page: number; totalPages: number }>(`/admin/transactions${query}`);
  }

  // ─── Admin: Stories ───────────────────────────────────────────────
  async getAdminStories() {
    return this.request<any[]>('/admin/stories');
  }

  async deleteAdminStory(id: string) {
    return this.request<{ message: string }>(`/admin/stories/${id}`, { method: 'DELETE' });
  }

  // ─── Admin: Chat Messages ─────────────────────────────────────────
  async getAdminChatMessages(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/admin/chat-messages${query}`);
  }

  async deleteAdminChatMessage(id: string) {
    return this.request<{ message: string }>(`/admin/chat-messages/${id}`, { method: 'DELETE' });
  }

  // ─── Admin: Activity Log ──────────────────────────────────────────
  async getAdminActivityLog(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/admin/activity-log${query}`);
  }

  // ─── Admin: Database Info ─────────────────────────────────────────
  async getAdminDatabaseInfo() {
    return this.request<{ tables: Record<string, number>; totalTables: number; dbSize: number; dbSizeFormatted: string }>('/admin/database-info');
  }

  // ─── Admin: Broadcast ─────────────────────────────────────────────
  async adminBroadcast(data: { title: string; message: string; type: string }) {
    return this.request<{ count: number }>('/admin/broadcast', {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  // ─── Admin: Cleanup ───────────────────────────────────────────────
  async adminCleanup(action: string) {
    return this.request<{ message: string; deletedCount?: number }>('/admin/cleanup', {
      method: 'POST', body: JSON.stringify({ action }),
    });
  }

  // ─── Admin: User Details ──────────────────────────────────────────
  async getAdminUserDetails(userId: string) {
    return this.request<any>(`/admin/user-details/${userId}`);
  }

  // ─── Admin: Report Action ─────────────────────────────────────────
  async adminReportAction(reportId: string, action: string) {
    return this.request<{ message: string }>(`/admin/reports/${reportId}/action`, {
      method: 'POST', body: JSON.stringify({ action }),
    });
  }

  // ─── Admin: Smart Links Overview ──────────────────────────────────
  async getAdminSmartLinks() {
    return this.request<{ totalLinks: number; totalVisits: number; uniqueVisitors: number; topLinks: any[]; visitsByDate: any[] }>('/admin/smart-links');
  }

  // ─── Admin: Comments ──────────────────────────────────────────────
  async getAdminComments(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/admin/comments${query}`);
  }

  async deleteAdminComment(id: string) {
    return this.request<{ message: string }>(`/admin/comments/${id}`, { method: 'DELETE' });
  }

  // ─── Admin: Toggle Trusted ────────────────────────────────────────
  async toggleUserTrusted(userId: string) {
    return this.request<{ id: string; is_trusted: boolean; message: string }>(`/admin/users/${userId}/toggle-trusted`, { method: 'PATCH' });
  }

  // ─── Admin: Send Warning ──────────────────────────────────────────
  async sendUserWarning(userId: string, reason: string) {
    return this.request<{ message: string }>(`/admin/users/${userId}/send-warning`, {
      method: 'POST', body: JSON.stringify({ reason }),
    });
  }

  // ─── Admin: Realtime Stats ────────────────────────────────────────
  async getAdminRealtimeStats() {
    return this.request<{ onlineUsers: number; newPostsToday: number; newUsersToday: number; pendingItems: number; recentActivity: any[] }>('/admin/dashboard/realtime');
  }

  // ─── Smart Market ──────────────────────────────────────────────────
  async getMarketListings(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ listings: any[]; total: number; page: number; categories: any[] }>(`/market/listings${query}`);
  }

  async getMarketListing(id: string) {
    return this.request<any>(`/market/listings/${id}`);
  }

  async createMarketListing(data: any) {
    return this.request<any>('/market/listings', {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  async updateMarketListing(id: string, data: any) {
    return this.request<any>(`/market/listings/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    });
  }

  async deleteMarketListing(id: string) {
    return this.request<{ message: string }>(`/market/listings/${id}`, { method: 'DELETE' });
  }

  async toggleSaveMarketListing(id: string) {
    return this.request<{ saved: boolean; savesCount: number }>(`/market/listings/${id}/save`, { method: 'POST' });
  }

  async getSavedMarketListings() {
    return this.request<any[]>('/market/saved');
  }

  async getMyMarketListings() {
    return this.request<any[]>('/market/my-listings');
  }

  async inquireMarketListing(id: string) {
    return this.request<{ inquiriesCount: number }>(`/market/listings/${id}/inquire`, { method: 'POST' });
  }

  async requestMarketPromotion(data: any) {
    return this.request<any>('/market/promote', {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  async getMyMarketPromotions() {
    return this.request<any[]>('/market/my-promotions');
  }

  async getMarketStats() {
    return this.request<{ totalListings: number; totalSellers: number; averagePrice: number; newToday: number; categoryBreakdown: any[] }>('/market/stats');
  }

  async getMarketCategories() {
    return this.request<any[]>('/market/categories');
  }

  // ─── Admin: Market Promotion Requests ─────────────────────────────
  async getMarketPromotionRequests(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<any[]>(`/admin/market-promotion-requests${query}`);
  }

  async approveMarketPromotion(id: string) {
    return this.request<{ message: string }>(`/admin/market-promotion-requests/${id}/approve`, { method: 'POST' });
  }

  async rejectMarketPromotion(id: string) {
    return this.request<{ message: string }>(`/admin/market-promotion-requests/${id}/reject`, { method: 'POST' });
  }

  // ─── AI Promotion Intelligence ────────────────────────────────────
  async aiAutoTarget(data: { postId?: string; content?: string; category?: string; price?: number; location?: string }) {
    return this.request<{ success: boolean; data: any }>('/ai/auto-target', {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  async aiReviewPromotion(data: { postId?: string; content?: string; category?: string; price?: number }) {
    return this.request<{ success: boolean; data: any }>('/ai/review-promotion', {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  async aiAssistant(message: string, userId?: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>) {
    return this.request<{ success: boolean; reply: string; fallback?: boolean }>('/ai/assistant', {
      method: 'POST', body: JSON.stringify({ message, userId, history }),
    });
  }

  async aiBudgetSuggestion(data: { budget?: number; category?: string; price?: number; goal?: string }) {
    return this.request<{ success: boolean; data: any }>('/ai/budget-suggestion', {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  async aiInsights() {
    return this.request<{ success: boolean; data: any }>('/ai/insights');
  }

  async aiEnhanceContent(data: { content: string; category?: string; price?: number }) {
    return this.request<{ success: boolean; data: any }>('/ai/enhance-content', {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  async aiAnalyzeMyPosts() {
    return this.request<{ success: boolean; data: any }>('/ai/analyze-my-posts', {
      method: 'POST', body: JSON.stringify({}),
    });
  }

  // ─── AI Smart Placement ─────────────────────────────────────────────
  async aiSmartPlacement(data: {
    promotedPosts: any[];
    totalPosts: number;
    feedType: 'home' | 'market' | 'matches';
    userInterests?: string[];
  }) {
    return this.request<{
      success: boolean;
      positions: { postIndex: number; feedPosition: number; reason: string }[];
      strategy: string;
      peakPositions: number[];
      avoidPositions: number[];
      reasoning: string;
      confidence: number;
      fromCache?: boolean;
    }>('/ai/smart-placement', {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  // ─── AI Engagement Tracking ─────────────────────────────────────────
  async aiTrackEngagement(events: {
    postId: string;
    feedPosition: number;
    feedType: 'home' | 'market' | 'matches';
    action: 'impression' | 'click' | 'view' | 'scroll_past';
    timeOnScreen?: number;
    scrollDepth?: number;
  }[]) {
    return this.request<{ tracked: number }>('/ai/track-engagement', {
      method: 'POST', body: JSON.stringify({ events }),
    });
  }

  // ─── AI Placement Analytics ─────────────────────────────────────────
  async aiPlacementAnalytics(feedType?: string, days?: number) {
    const params = new URLSearchParams();
    if (feedType) params.set('feedType', feedType);
    if (days !== undefined) params.set('days', days.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ success: boolean; data: any }>(`/ai/placement-analytics${query}`);
  }
}

export const api = new ApiClient();
export default api;
