import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-ivory-100 text-charcoal-900 bg-dot-pattern">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
