// ─── Promotion Packages Data ──────────────────────────────────────
// Available promotion packages for boosting posts

export interface PromotionPackage {
  id: string;
  name: string;
  nameAr: string;
  duration: number; // days
  price: number; // EGP
  estimatedReach: number;
  features: string[];
  featuresAr: string[];
  tier: 'basic' | 'standard' | 'premium' | 'vip';
  color: string;
  icon: string;
}

// ─── City Tiers for Location-Based Pricing ───────────────────
export interface CityTier {
  id: string;
  name: string;
  nameAr: string;
  cities: string[]; // city IDs
  priceMultiplier: number; // multiplier on base package price
}

export const cityTiers: CityTier[] = [
  {
    id: 'tier1',
    name: 'Major Cities',
    nameAr: 'المدن الكبرى',
    cities: ['cairo', 'giza', 'alexandria', 'sharm', 'hurghada'],
    priceMultiplier: 1.0,
  },
  {
    id: 'tier2',
    name: 'Secondary Cities',
    nameAr: 'مدن الدرجة الثانية',
    cities: ['mansoura', 'tanta', 'zagazig', 'ismailia', 'suez', 'port_said', 'damietta', 'fayoum', 'beni_suef', 'minya'],
    priceMultiplier: 0.8,
  },
  {
    id: 'tier3',
    name: 'Other Cities',
    nameAr: 'مدن أخرى',
    cities: [],
    priceMultiplier: 0.6,
  },
];

/**
 * Get the city tier for a given city ID
 * Returns the CityTier object or the default (tier3) if not found
 */
export const getCityTier = (cityId: string): CityTier => {
  const tier = cityTiers.find(t => t.cities.includes(cityId));
  return tier || cityTiers[cityTiers.length - 1]; // default to last tier (cheapest)
};

export const promotionPackages: PromotionPackage[] = [
  {
    id: 'basic',
    name: 'Basic',
    nameAr: 'أساسي',
    duration: 3,
    price: 50,
    estimatedReach: 500,
    features: ['3-day boost', 'Basic analytics', 'Category targeting'],
    featuresAr: ['ترويج لمدة 3 أيام', 'إحصائيات أساسية', 'استهداف فئات'],
    tier: 'basic',
    color: 'from-blue-500 to-blue-600',
    icon: '🚀',
  },
  {
    id: 'standard',
    name: 'Standard',
    nameAr: 'قياسي',
    duration: 7,
    price: 120,
    estimatedReach: 2000,
    features: ['7-day boost', 'Detailed analytics', 'Category & location targeting', 'Priority in feed'],
    featuresAr: ['ترويج لمدة 7 أيام', 'إحصائيات مفصلة', 'استهداف فئات وموقع', 'أولوية في الخلاصة'],
    tier: 'standard',
    color: 'from-purple-500 to-purple-600',
    icon: '⭐',
  },
  {
    id: 'premium',
    name: 'Premium',
    nameAr: 'مميز',
    duration: 14,
    price: 250,
    estimatedReach: 5000,
    features: ['14-day boost', 'Advanced analytics', 'Full targeting', 'Priority in feed', 'Notification push'],
    featuresAr: ['ترويج لمدة 14 يوم', 'إحصائيات متقدمة', 'استهداف كامل', 'أولوية في الخلاصة', 'إشعار للمستخدمين'],
    tier: 'premium',
    color: 'from-orange-500 to-amber-600',
    icon: '👑',
  },
  {
    id: 'vip',
    name: 'VIP',
    nameAr: 'VIP',
    duration: 30,
    price: 500,
    estimatedReach: 15000,
    features: ['30-day boost', 'Premium analytics', 'Full targeting + AI', 'Top of feed', 'Notification push', 'Featured badge', 'Smart link'],
    featuresAr: ['ترويج لمدة 30 يوم', 'إحصائيات متميزة', 'استهداف كامل + ذكاء اصطناعي', 'أعلى الخلاصة', 'إشعار للمستخدمين', 'شارة مميزة', 'رابط ذكي'],
    tier: 'vip',
    color: 'from-amber-500 to-yellow-500',
    icon: '💎',
  },
];
