import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Compass,
  LayoutDashboard,
  MapPin,
  Mail,
  Bell,
  User,
  Plus,
  Search,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Settings,
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Check
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import CreateTripModal from '../trips/CreateTripModal';
import tripService from '../../services/tripService';

export function DashboardLayout({ children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const searchInputRef = React.useRef(null);

  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Keyboard shortcut listener for search (⌘K or /) and Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNotificationsOpen(false);
        setMobileSidebarOpen(false);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof tripService?.getMyInvitations === 'function') {
      tripService.getMyInvitations()
        .then((res) => {
          if (res?.success && typeof res.count === 'number') {
            setInvitationCount(res.count);
          }
        })
        .catch(() => {});
    }

    if (typeof tripService?.getNotifications === 'function') {
      tripService.getNotifications({ limit: 5 })
        .then((res) => {
          if (res?.success) {
            setUnreadNotifCount(res.unreadCount || 0);
            setRecentNotifs(res.notifications || []);
          }
        })
        .catch(() => {});
    }
  }, [location.pathname]);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Trips', href: '/trips', icon: MapPin },
    { name: 'AI Trip Planner', href: '/ai-trip-planner', icon: Sparkles, badge: 'AI' },
    { name: 'Invitations', href: '/invitations', icon: Mail, badge: invitationCount > 0 ? String(invitationCount) : null },
    { name: 'Notifications', href: '/notifications', icon: Bell, badge: unreadNotifCount > 0 ? String(unreadNotifCount) : null },
    { name: 'Profile', href: '/profile', icon: User },
  ];


  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/trips?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleMarkAllNotificationsRead = async (e) => {
    e?.stopPropagation?.();
    try {
      await tripService.markAllNotificationsRead();
      setUnreadNotifCount(0);
      setRecentNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    setNotificationsOpen(false);
    if (!notif.isRead) {
      try {
        await tripService.markNotificationRead(notif._id);
        setUnreadNotifCount((prev) => Math.max(0, prev - 1));
        setRecentNotifs((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    }
    if (notif.link) {
      navigate(notif.link);
    } else {
      navigate('/notifications');
    }
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'TT';

  return (
    <div className="min-h-screen bg-ivory-100 text-charcoal-900 flex flex-col md:flex-row">
      
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col justify-between border-r border-ivory-300 bg-white/90 backdrop-blur-md p-6 sticky top-0 h-screen shrink-0">
        <div className="space-y-8">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 rounded-xl p-1">
            <div className="w-10 h-10 rounded-xl bg-forest-600 flex items-center justify-center text-ivory-50 shadow-soft group-hover:bg-forest-700 transition-colors">
              <Compass className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-forest-900 font-display">
                  Trip<span className="text-terracotta-500">Tally</span>
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-terracotta-500" />
              </div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-charcoal-400 block">
                Travel & Tally Hub
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-forest-50 text-forest-800 border border-forest-200/80 shadow-soft-sm'
                      : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-ivory-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-forest-600' : 'text-charcoal-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <Badge variant={isActive ? 'forest' : 'neutral'} size="sm">
                      {item.badge}
                    </Badge>
                  )}
                  {item.indicator && (
                    <span className="w-2 h-2 rounded-full bg-terracotta-500" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="pt-6 border-t border-ivory-200 space-y-3">
          <div className="flex items-center justify-between p-2 rounded-2xl bg-ivory-50 border border-ivory-200">
            <Link to="/profile" className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-xl bg-forest-600 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-charcoal-900 truncate">{user?.name}</p>
                <p className="text-[10px] text-charcoal-400 font-mono truncate">{user?.email}</p>
              </div>
            </Link>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </aside>

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 w-full border-b border-ivory-300/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          
          {/* Mobile hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl text-charcoal-700 hover:bg-ivory-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-forest-600 flex items-center justify-center text-white text-xs">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-bold text-base font-display">TripTally</span>
            </Link>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search destinations, trips, or companions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-ivory-100 text-charcoal-900 placeholder:text-charcoal-400 text-xs rounded-xl border border-ivory-300 hover:border-ivory-400 focus:border-forest-600 focus:bg-white focus:ring-2 focus:ring-forest-100/80 h-9 pl-9 pr-12 transition-all outline-none"
            />
            <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded bg-ivory-200 border border-ivory-300 text-[10px] font-mono text-charcoal-400 pointer-events-none shadow-soft-sm">
              ⌘K
            </kbd>
          </form>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3 ml-auto">
            
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl text-charcoal-600 hover:text-forest-800 hover:bg-ivory-100 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-terracotta-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-soft-sm">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-soft-xl border border-ivory-300 p-3.5 space-y-3 z-50 animate-fadeIn text-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-charcoal-900 text-sm font-display">Notifications</span>
                      {unreadNotifCount > 0 ? (
                        <Badge variant="terracotta" size="sm">
                          {unreadNotifCount} New
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-charcoal-400 font-medium">All caught up</span>
                      )}
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[11px] font-semibold text-forest-700 hover:text-forest-900 flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        <span>Mark read</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                    {recentNotifs.length === 0 ? (
                      <div className="py-6 text-center text-charcoal-400">
                        <Bell className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-charcoal-400" />
                        <p className="text-xs">No notifications yet</p>
                      </div>
                    ) : (
                      recentNotifs.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                            !n.isRead
                              ? 'bg-forest-50/50 border-forest-200/80 hover:bg-forest-50'
                              : 'bg-ivory-50/60 border-ivory-200 hover:bg-ivory-100/60'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                              !n.isRead ? 'bg-terracotta-500' : 'bg-transparent'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-charcoal-900 text-xs truncate">
                              {n.title}
                            </p>
                            <p className="text-[11px] text-charcoal-500 line-clamp-2 mt-0.5 leading-snug">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-ivory-200 text-center">
                    <Link
                      to="/notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs font-bold text-forest-700 hover:text-forest-900 transition-colors inline-flex items-center gap-1"
                    >
                      <span>View all notifications</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Create Trip Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateTripOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Create Trip</span>
              <span className="sm:hidden">New</span>
            </Button>

            {/* User Avatar link */}
            <Link to="/profile" className="hidden sm:block">
              <div className="w-8 h-8 rounded-xl bg-forest-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden border border-ivory-300 shadow-soft-sm">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
            </Link>

          </div>

        </header>

        {/* Page Content Slot */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children || <Outlet context={{ openCreateTrip: () => setCreateTripOpen(true) }} />}
        </main>

      </div>

      {/* 3. Mobile Navigation Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-charcoal-950/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[80%] bg-white p-6 flex flex-col justify-between shadow-soft-xl border-r border-ivory-300 animate-slideRight">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-ivory-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-forest-600 text-white flex items-center justify-center text-xs">
                    <Compass className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-base text-forest-900 font-display">TripTally</span>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-lg text-charcoal-400 hover:bg-ivory-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                        isActive
                          ? 'bg-forest-50 text-forest-800 border border-forest-200'
                          : 'text-charcoal-600 hover:bg-ivory-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && <Badge variant="forest" size="sm">{item.badge}</Badge>}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-ivory-200">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center text-rose-600 border-rose-200"
                onClick={() => {
                  setMobileSidebarOpen(false);
                  logout();
                }}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={createTripOpen}
        onClose={() => setCreateTripOpen(false)}
        onTripCreated={(newTrip) => {
          // If on dashboard, navigate to trips or trip details
          navigate(`/trips/${newTrip._id}`);
        }}
      />

    </div>
  );
}

export default DashboardLayout;
