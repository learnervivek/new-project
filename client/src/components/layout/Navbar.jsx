import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Menu, X, ArrowRight, User, Sparkles, LogOut, MapPin, Bell } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import AuthModal from '../auth/AuthModal';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Close menus on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (location.pathname !== '/') {
      navigate('/' + targetId);
    } else {
      const element = document.querySelector(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-ivory-300/80 bg-ivory-100/95 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Brand Logo */}
            <Link
              to="/"
              className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 rounded-xl p-1"
            >
              <div className="w-10 h-10 rounded-xl bg-forest-600 flex items-center justify-center text-ivory-50 shadow-soft group-hover:bg-forest-700 transition-colors">
                <Compass className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl tracking-tight text-forest-900 font-display">
                    Trip<span className="text-terracotta-500">Tally</span>
                  </span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-terracotta-500" />
                </div>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-charcoal-400">
                  Plan & Settle Together
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              <a
                href="#destinations"
                onClick={(e) => handleNavClick(e, '#destinations')}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-charcoal-600 hover:text-forest-800 hover:bg-ivory-200/60 transition-colors"
              >
                Destinations
              </a>
              <a
                href="#features"
                onClick={(e) => handleNavClick(e, '#features')}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-charcoal-600 hover:text-forest-800 hover:bg-ivory-200/60 transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => handleNavClick(e, '#how-it-works')}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-charcoal-600 hover:text-forest-800 hover:bg-ivory-200/60 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#preview"
                onClick={(e) => handleNavClick(e, '#preview')}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-charcoal-600 hover:text-forest-800 hover:bg-ivory-200/60 transition-colors"
              >
                Product Preview
              </a>
              <a
                href="#faq"
                onClick={(e) => handleNavClick(e, '#faq')}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-charcoal-600 hover:text-forest-800 hover:bg-ivory-200/60 transition-colors"
              >
                FAQ
              </a>
            </nav>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated && user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                    aria-label="User navigation menu"
                    className="flex items-center gap-2.5 p-1.5 pl-3 rounded-2xl bg-white border border-ivory-300 hover:border-forest-600 shadow-soft-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
                  >
                    <span className="text-xs font-bold text-charcoal-900 max-w-[120px] truncate">
                      {user.name}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-forest-600 text-white flex items-center justify-center font-bold text-xs overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div
                      role="menu"
                      aria-orientation="vertical"
                      className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-soft-xl border border-ivory-300 py-2 z-50 animate-fadeIn"
                      onMouseLeave={() => setUserMenuOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-ivory-200">
                        <p className="text-xs font-bold text-charcoal-900 truncate">{user.name}</p>
                        <p className="text-[11px] text-charcoal-400 font-mono truncate">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-charcoal-800 hover:bg-forest-50 hover:text-forest-800 transition-colors"
                        >
                          <Compass className="w-4 h-4 text-forest-600" />
                          <span>Dashboard Overview</span>
                        </Link>

                        <Link
                          to="/trips"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-charcoal-700 hover:bg-ivory-100 hover:text-forest-800 transition-colors"
                        >
                          <MapPin className="w-4 h-4 text-charcoal-400" />
                          <span>My Collaborative Trips</span>
                        </Link>

                        <Link
                          to="/notifications"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-charcoal-700 hover:bg-ivory-100 hover:text-forest-800 transition-colors"
                        >
                          <Bell className="w-4 h-4 text-charcoal-400" />
                          <span>Activity & Notifications</span>
                        </Link>

                        <Link
                          to="/profile"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-charcoal-700 hover:bg-ivory-100 hover:text-forest-800 transition-colors"
                        >
                          <User className="w-4 h-4 text-forest-600" />
                          <span>Profile & Settings</span>
                        </Link>
                      </div>

                      <div className="border-t border-ivory-200 mt-1 pt-1">
                        <button
                          role="menuitem"
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openAuth('signin')}
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openAuth('signup')}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="p-2 rounded-xl text-charcoal-700 hover:bg-ivory-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-ivory-300 bg-white/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
            {isAuthenticated && user && (
              <div className="p-3 rounded-2xl bg-forest-50 border border-forest-200 flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-forest-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-charcoal-900">{user.name}</p>
                    <p className="text-[10px] text-charcoal-500 font-mono truncate">{user.email}</p>
                  </div>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-bold text-forest-700 bg-white px-2.5 py-1.5 rounded-lg border border-forest-200 shadow-soft-sm"
                >
                  Profile
                </Link>
              </div>
            )}

            <div className="flex flex-col space-y-1">
              <a
                href="#destinations"
                onClick={(e) => handleNavClick(e, '#destinations')}
                className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-charcoal-700 hover:bg-ivory-100"
              >
                Destinations
              </a>
              <a
                href="#features"
                onClick={(e) => handleNavClick(e, '#features')}
                className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-charcoal-700 hover:bg-ivory-100"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => handleNavClick(e, '#how-it-works')}
                className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-charcoal-700 hover:bg-ivory-100"
              >
                How It Works
              </a>
              <a
                href="#preview"
                onClick={(e) => handleNavClick(e, '#preview')}
                className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-charcoal-700 hover:bg-ivory-100"
              >
                Product Preview
              </a>
              <a
                href="#faq"
                onClick={(e) => handleNavClick(e, '#faq')}
                className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-charcoal-700 hover:bg-ivory-100"
              >
                FAQ
              </a>
            </div>

            <div className="pt-3 border-t border-ivory-200 flex flex-col gap-2">
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  size="md"
                  className="w-full justify-center text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  Sign Out
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full justify-center"
                    onClick={() => openAuth('signin')}
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                    onClick={() => openAuth('signup')}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Get Started Free
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}

export default Navbar;
