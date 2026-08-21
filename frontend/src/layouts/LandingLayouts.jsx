import { Outlet } from 'react-router-dom';

export default function LandingLayouts() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-bg text-brand-text">
      {/* Sticky Navigation */}
      <header className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-lg border-b border-gray-200/50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center cursor-pointer transform hover:scale-105 transition-transform">
              <span className="font-display text-2xl text-brand-accent font-bold tracking-tight">Shuddle Arena</span>
            </div>
            
            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-2">
              <a href="#home" className="text-brand-text hover:bg-brand-nav-hover hover:text-brand-text px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300">Home</a>
              <a href="#services" className="text-brand-text hover:bg-brand-nav-hover hover:text-brand-text px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300">Services</a>
              <a href="#about" className="text-brand-text hover:bg-brand-nav-hover hover:text-brand-text px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300">About</a>
            </nav>
            
            {/* CTA */}
            <div className="hidden md:flex items-center">
              <button className="bg-brand-accent text-white px-7 py-2.5 rounded-full font-medium hover:bg-[#094d12] transition-all duration-300 shadow-[0_4px_14px_0_rgba(12,96,23,0.39)] hover:shadow-[0_6px_20px_rgba(12,96,23,0.23)] hover:-translate-y-0.5">
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button className="p-2 rounded-md text-brand-text hover:bg-brand-nav-hover">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#050505] text-white py-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <span className="font-display text-3xl text-brand-accent font-bold tracking-wide">Shuddle Arena</span>
            <p className="text-gray-400 mt-4 text-sm max-w-sm leading-relaxed">
              The ultimate platform for badminton enthusiasts. Book courts, organize tournaments, and track your rankings seamlessly.
            </p>
          </div>
          <div>
            <h4 className="font-display text-lg mb-4 text-white">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-brand-accent transition-colors">Find a Court</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Tournaments</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Leaderboards</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-lg mb-4 text-white">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-brand-accent transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Contact Support</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Shuddle Arena. All rights reserved.
        </div>
      </footer>
    </div>
  );
}