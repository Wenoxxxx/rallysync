export default function Services() {
  const features = [
    { 
      title: 'Court Booking', 
      desc: 'Real-time availability and instant booking for courts across the network.', 
      icon: (
        <svg className="w-8 h-8 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      title: 'Tournament Manager', 
      desc: 'Create events, manage brackets, and oversee tournaments seamlessly.', 
      icon: (
        <svg className="w-8 h-8 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    { 
      title: 'Live Scoring', 
      desc: 'Track matches in real-time, broadcast scores, and keep the audience engaged.', 
      icon: (
        <svg className="w-8 h-8 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    { 
      title: 'Player Rankings', 
      desc: 'Climb the competitive leaderboards, track ELO, and showcase your skills.', 
      icon: (
        <svg className="w-8 h-8 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    { 
      title: 'Smart Scheduling', 
      desc: 'AI-powered court scheduling to maximize playtime and reduce conflicts.', 
      icon: (
        <svg className="w-8 h-8 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      title: 'Owner Analytics', 
      desc: 'Deep insights, revenue reports, and staff management for court owners.', 
      icon: (
        <svg className="w-8 h-8 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
  ];

  return (
    <section id="services" className="w-full py-24 bg-white relative">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-sm text-brand-accent font-bold tracking-widest uppercase mb-3">
            Features
          </h2>
          <p className="text-4xl md:text-5xl font-extrabold tracking-tight font-display text-brand-text mb-6">
            Everything You Need
          </p>
          <p className="text-xl text-brand-text-mute">
            A complete ecosystem designed to empower players, tournament organizers, and court owners alike.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="group bg-brand-bg rounded-3xl p-8 border border-gray-100/80 transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-2 hover:border-brand-accent/20 hover:bg-white"
            >
              <div className="w-16 h-16 bg-brand-nav-hover rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-brand-accent/10 transition-all duration-300">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold font-display text-brand-text mb-4 transition-colors group-hover:text-brand-accent">
                {feature.title}
              </h3>
              <p className="text-brand-text-mute leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
