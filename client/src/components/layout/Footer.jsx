import React from 'react';
import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-forest-950 text-forest-200 py-12 border-t border-forest-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-forest-700 flex items-center justify-center text-ivory-50 shadow-soft-sm">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-serif text-lg font-bold text-ivory-100 font-display">
                Trip<span className="text-terracotta-500">Tally</span>
              </span>
            </div>
            <p className="text-xs text-forest-300 leading-relaxed mb-4">
              The premier collaborative workspace for planning group expeditions and tallying shared expenses without stress.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-forest-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>All systems operational</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ivory-100 mb-3">
              Exploration
            </h4>
            <ul className="space-y-2 text-xs text-forest-300">
              <li><a href="/#destinations" className="hover:text-ivory-100 transition-colors">Popular Destinations</a></li>
              <li><a href="/#how-it-works" className="hover:text-ivory-100 transition-colors">How It Works</a></li>
              <li><a href="/#features" className="hover:text-ivory-100 transition-colors">Itinerary Planner</a></li>
              <li><a href="/#preview" className="hover:text-ivory-100 transition-colors">Interactive Workspace</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ivory-100 mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-forest-300">
              <li><Link to="/login" className="hover:text-ivory-100 transition-colors">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-ivory-100 transition-colors">Create Account</Link></li>
              <li><a href="/#faq" className="hover:text-ivory-100 transition-colors">FAQ & Support</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ivory-100 mb-3">
              Aesthetics & Tokens
            </h4>
            <p className="text-xs text-forest-300 leading-relaxed mb-3">
              Crafted with Forest Green, Warm Ivory, and Terracotta. Powered by React Three Fiber & OpenStreetMap.
            </p>
            <span className="inline-block px-2.5 py-1 rounded-md bg-forest-900 border border-forest-800 text-[10px] font-mono text-forest-300">
              v1.0.0 • Free Travel SaaS
            </span>
          </div>

        </div>

        <div className="pt-8 border-t border-forest-900 flex flex-col sm:flex-row items-center justify-between text-xs text-forest-400 gap-4">
          <p>© {new Date().getFullYear()} TripTally. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-forest-200 transition-colors">Privacy Policy</span>
            <span className="hover:text-forest-200 transition-colors">Terms of Service</span>
          </div>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
