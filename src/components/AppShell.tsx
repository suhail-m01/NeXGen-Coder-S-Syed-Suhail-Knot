import { Bell, Bookmark, CalendarDays, ChevronDown, CircleUserRound, Compass, Home, Info, LayoutDashboard, LogOut, Map, Menu, Plus, Search, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { Logo } from './Logo';
import { canReviewSubmissions } from '../domain/permissions';

export function AppShell() {
  const { currentUser, data, markNotificationsRead, signOut, cloudStatus, cloudError, cloudMutationError } = useApp();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const location = useLocation();
  const notifications = currentUser ? data.notifications.filter((item) => item.userId === currentUser.id && (!item.deliverAt || new Date(item.deliverAt).getTime() <= now)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('main-content')?.focus({ preventScroll: true });
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!notificationsOpen && !menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setNotificationsOpen(false); setMenuOpen(false); } };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [notificationsOpen, menuOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className={`workspace-notice ${cloudStatus === 'error' ? 'workspace-notice--error' : ''}`}><Info size={14} /><span>{cloudStatus === 'local' ? <><strong>Local product workspace.</strong> Sample events are labelled. Your changes stay in this browser.</> : cloudStatus === 'loading' ? <><strong>Loading Supabase workspace.</strong> Public and authorized private data are being reconciled.</> : cloudStatus === 'ready' ? <><strong>Supabase cloud workspace.</strong> Sample events stay labelled; private state is authorized per account.</> : <><strong>Cloud workspace unavailable.</strong> {cloudError || 'No local fallback is substituted.'}</>}</span></div>
      {cloudMutationError && <div className="workspace-notice workspace-notice--error" role="alert"><Info size={14} /><span>{cloudMutationError}</span></div>}
      <header className="site-header">
        <div className="site-header__inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Main navigation">
            <NavLink to="/search">Discover</NavLink>
            <NavLink to="/search?view=map">Map</NavLink>
            <NavLink to="/add">Instant Add</NavLink>
            {currentUser && <NavLink to="/organizer">For organizers</NavLink>}
            {canReviewSubmissions(currentUser) && <NavLink to="/admin">Review</NavLink>}
          </nav>
          <div className="header-actions">
            <Link to="/publish" className="button button--primary button--small header-publish"><Plus size={16} /> Publish event</Link>
            {currentUser ? <>
              <button className="icon-button notification-button" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label={`${unreadCount} unread notifications`} aria-expanded={notificationsOpen}>
                <Bell size={20} />{unreadCount > 0 && <span>{unreadCount}</span>}
              </button>
              <Link to="/profile" className="avatar" aria-label="Open your profile">{currentUser.name.slice(0, 1).toUpperCase()}</Link>
            </> : <Link to="/auth" className="account-link"><CircleUserRound size={19} /> <span>Sign in</span></Link>}
            <button className="icon-button mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen} aria-controls="mobile-navigation">{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
        {menuOpen && <nav id="mobile-navigation" className="mobile-menu" aria-label="Mobile navigation">
          <NavLink to="/search"><Search size={18} /> Discover events</NavLink>
          <NavLink to="/search?view=map"><Map size={18} /> Map view</NavLink>
          <NavLink to="/add"><Plus size={18} /> Instant Add</NavLink>
          <NavLink to="/publish"><CalendarDays size={18} /> Publish or host</NavLink>
          {currentUser && <NavLink to="/organizer"><LayoutDashboard size={18} /> Organizer dashboard</NavLink>}
          {canReviewSubmissions(currentUser) && <NavLink to="/admin"><ShieldCheck size={18} /> Review & sources</NavLink>}
          {currentUser && <button onClick={signOut}><LogOut size={18} /> Sign out</button>}
        </nav>}
      </header>

      <main id="main-content" tabIndex={-1}><Outlet /></main>

      <footer className="site-footer">
        <div className="site-footer__top">
          <div><Logo inverse /><p>Find your people. Find your next event.<br />Participation with context, not just another event list.</p></div>
          <div className="footer-links"><div><strong>Discover</strong><Link to="/search">All events</Link><Link to="/search?view=map">Map</Link><Link to="/add">Add an event</Link></div><div><strong>Participate</strong><Link to="/plan">My plan</Link><Link to="/publish">Publish or host</Link><Link to="/profile">Preferences</Link></div></div>
        </div>
        <div className="site-footer__bottom"><span>40 geocoded Bengaluru localities + 13 labelled India city anchors</span><span>{cloudStatus === 'local' ? 'Local repository v1' : `Supabase provider · ${cloudStatus}`}</span></div>
      </footer>

      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        <NavLink to="/"><Home size={20} /><span>Home</span></NavLink>
        <NavLink to="/search"><Compass size={20} /><span>Discover</span></NavLink>
        <NavLink to="/add" className="mobile-add"><Plus size={22} /><span>Add</span></NavLink>
        <NavLink to="/plan"><Bookmark size={20} /><span>My plan</span></NavLink>
        <NavLink to="/profile"><CircleUserRound size={20} /><span>Profile</span></NavLink>
      </nav>

      {notificationsOpen && <div className="drawer-backdrop" onClick={() => setNotificationsOpen(false)}>
        <aside className="notification-drawer" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Notifications">
          <div className="drawer-header"><div><span className="eyebrow">Your updates</span><h2>Notifications</h2></div><button className="icon-button" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}><X /></button></div>
          {notifications.length === 0 ? <div className="drawer-empty"><Bell size={28} /><h3>All quiet for now</h3><p>Registration updates and material event changes will appear here.</p></div> : <>
            <button className="text-button" onClick={markNotificationsRead}>Mark all as read</button>
            <div className="notification-list">{notifications.map((notification) => <Link to={notification.eventId ? `/events/${notification.eventId}` : '/plan'} key={notification.id} onClick={() => setNotificationsOpen(false)} className={`notification-item ${!notification.readAt ? 'notification-item--unread' : ''}`}>
              <span className="notification-item__dot" /><div><strong>{notification.title}</strong><p>{notification.body}</p><small>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(notification.createdAt))}</small></div><ChevronDown size={16} />
            </Link>)}</div>
          </>}
        </aside>
      </div>}
    </div>
  );
}
