import { useMemo } from 'react';
import { 
  Trophy, 
  Wrench, 
  Coffee, 
  Mic2, 
  Globe2, 
  Users, 
  Sparkles,
  Layers
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import type { EventType } from '../domain/types';

export interface CategoryRibbonProps {
  activeCategory?: EventType | 'all' | 'communities';
  onSelectCategory?: (category: EventType | 'all') => void;
  className?: string;
  showCommunities?: boolean;
}

interface CategoryItem {
  id: EventType | 'all' | 'communities';
  label: string;
  icon: typeof Trophy;
  colorClass: string;
  description: string;
  isCommunityLink?: boolean;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'all',
    label: 'All Formats',
    icon: Layers,
    colorClass: 'category-item--all',
    description: 'Explore all hyperlocal events across Bengaluru',
  },
  {
    id: 'hackathon',
    label: 'Hackathons',
    icon: Trophy,
    colorClass: 'category-item--hackathon',
    description: 'Build sprints, team prototypes & cash prizes',
  },
  {
    id: 'workshop',
    label: 'Workshops',
    icon: Wrench,
    colorClass: 'category-item--workshop',
    description: 'Hands-on code labs, bootcamps & skill masterclasses',
  },
  {
    id: 'meetup',
    label: 'Meetups',
    icon: Coffee,
    colorClass: 'category-item--meetup',
    description: 'Local developer circles, founder coffee & lightning talks',
  },
  {
    id: 'summit',
    label: 'Summits',
    icon: Globe2,
    colorClass: 'category-item--summit',
    description: 'Executive leadership panels & flagship industry summits',
  },
  {
    id: 'conference',
    label: 'Conferences',
    icon: Mic2,
    colorClass: 'category-item--conference',
    description: 'Multi-track tech conferences, keynotes & expos',
  },
  {
    id: 'communities',
    label: 'Communities',
    icon: Users,
    colorClass: 'category-item--community',
    description: 'Follow active tech organizers & return for what is next',
    isCommunityLink: true,
  },
];

export function CategoryRibbon({
  activeCategory,
  onSelectCategory,
  className = '',
  showCommunities = true,
}: CategoryRibbonProps) {
  const { data, filters, setFilters } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const currentSelection = activeCategory ?? (location.pathname === '/communities' ? 'communities' : filters.eventType);

  // Compute live event counts for each category
  const counts = useMemo(() => {
    const published = data.events.filter((e) => e.status !== 'cancelled');
    const result: Record<string, number> = {
      all: published.length,
      hackathon: 0,
      workshop: 0,
      meetup: 0,
      summit: 0,
      conference: 0,
      communities: 0,
    };

    published.forEach((e) => {
      if (result[e.eventType] !== undefined) {
        result[e.eventType]++;
      }
    });

    const uniqueCommunities = new Set(published.map((e) => e.communityId).filter(Boolean));
    result.communities = uniqueCommunities.size;

    return result;
  }, [data.events]);

  const handleCategoryClick = (cat: CategoryItem) => {
    if (cat.isCommunityLink) {
      navigate('/communities');
      return;
    }

    if (onSelectCategory) {
      onSelectCategory(cat.id as EventType | 'all');
      return;
    }

    // Default behavior: update filters and navigate to discovery if needed
    setFilters({ ...filters, eventType: cat.id as EventType | 'all' });
    if (location.pathname !== '/search') {
      navigate(cat.id === 'all' ? '/search' : `/search?type=${cat.id}`);
    }
  };

  const filteredCategories = showCommunities 
    ? CATEGORIES 
    : CATEGORIES.filter((c) => !c.isCommunityLink);

  return (
    <div className={`category-ribbon-container ${className}`}>
      <div className="category-ribbon-header">
        <div className="category-ribbon-title">
          <Sparkles size={14} className="category-sparkle-icon" />
          <span>Hyperlocal Event Formats</span>
        </div>
        <span className="category-ribbon-hint">Click any format to explore</span>
      </div>

      <div className="category-ribbon" role="tablist" aria-label="Event formats">
        {filteredCategories.map((cat) => {
          const Icon = cat.icon;
          const count = counts[cat.id] ?? 0;
          const isActive = currentSelection === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`category-chip ${cat.colorClass} ${isActive ? 'is-active' : ''}`}
              onClick={() => handleCategoryClick(cat)}
              title={cat.description}
            >
              <span className="category-chip__icon">
                <Icon size={16} />
              </span>
              <span className="category-chip__label">{cat.label}</span>
              {count > 0 && (
                <span className="category-chip__count">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

