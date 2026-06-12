# Task: Fix and Enhance AI System in nawaqes-project

## Summary of Changes

### 1. GlobalAIAssistant.tsx - Complete Overhaul

**Fix: Quick Action Response Handling**
- Added comprehensive `formatAIResponse()` function that properly handles all API response formats:
  - `res.reply` (string) → returned directly
  - `res.data.suggestions` array → formatted as numbered bullet list with motivation message, best time, etc.
  - `res.data.bestTimes` array → formatted as time list with labels and reasons
  - `res.data.hotTopics` array → formatted as trending topics with growth percentages
  - `res.data.suggestedPrice` / `priceRange` → formatted with price info, competitiveness, tips
  - `res.data.recommendedPackage` / `recommended` → formatted with package details, best value, affordable options
  - `res.data.enhancedContent` → formatted with title, hashtags, call-to-action, score improvement
  - `res.data.improvedDescription` → formatted with improved title, hashtags, tips
  - `res.data.posts` (analyze-my-posts) → formatted with overall strategy, top pick, budget recommendations
  - `res.data.walletBalance` → formatted with balance, charging needs, tips
  - Generic objects → key-value formatting with Arabic key translation

**Fix: Conversation Context**
- `sendMessage` now uses `api.aiGlobalAssistant()` instead of `api.aiAssistant()` for context-aware chat
- Sends `currentPage`, `conversationHistory` (last 6 messages), and `userId`
- Better AI responses that understand the conversation flow

**Feature: Smart Search Integration**
- Added `searchMode` state toggle
- "بحث ذكي" button in quick actions bar
- Search hint bar appears when search mode is active with contextual hints per page
- Different input placeholder and submit behavior in search mode
- Send button changes to Wand2 icon in search mode (fuchsia gradient)

**Feature: Auto-Improve Ad Description**
- New quick action "✨ تحسين الوصف تلقائياً" on `/market` and `/create` pages
- Uses `needsInput: true` flag to trigger input-first flow
- When clicked, prompts user to type their current ad description
- Submits to `/api/ai/improve-description` endpoint
- Results styled with fuchsia border and "تم التحسين بالذكاء الاصطناعي" badge

**Fix: Better Proactive Messages**
- More contextual and helpful messages per page with emoji indicators
- e.g., "🛒 في السوق الذكي! يمكنني تحسين وصف منتجك..." for market page
- Added `searchHint` per page for contextual search guidance

**Fix: Mobile Floating Button Position**
- Changed from `bottom-20` to `bottom-24` on mobile (`isMobile ? 'bottom-24' : 'bottom-20'`)
- Avoids overlap with MobileBottomNav which is at `bottom-0 z-[100]`

### 2. ai.ts Routes

**Updated: `/global-assistant` route (section 17)**
- Now accepts `conversationHistory` from request body
- Builds messages array with: system prompt → conversation history (last 6) → current user message
- Added instruction in system prompt: "إذا سأل المستخدم عن بحث أو منتج، ساعده باقتراحات بحثية ذكية"

**New: `/improve-description` route (section 18)**
- Accepts `{ title?, description?, category? }`
- Uses `tryAICompletion` with professional ad improvement prompt
- Returns `{ improvedDescription, improvedTitle, hashtags, callToAction, tips, originalLength, improvedLength }`
- Has comprehensive fallback when AI is unavailable (basic text cleanup + smart tips)
- Uses `optionalAuth` for public access
- Error handling returns safe fallback data instead of error responses

**Renumbered:** Context Help route is now section 19 (was 18)

### 3. api.ts Service

**Updated: `aiGlobalAssistant` method**
- Now accepts `conversationHistory?: { role: string; content: string }[]`

**New: `aiImproveDescription` method**
- Calls `/ai/improve-description` with `{ title?, description?, category? }`
- Returns `{ success: boolean; data: any }`
