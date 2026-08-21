export default function About() {
  return (
    <section id="about" className="w-full py-24 relative overflow-hidden bg-brand-text text-white flex justify-center">
      {/* Background Texture/Gradient */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-accent/40 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-brand-accent/20 via-transparent to-transparent"></div>
      </div>
      
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Mission Statement */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold font-display mb-6 tracking-tight">
            Built for the love of the game.
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 leading-relaxed font-light">
            Shuddle Arena was created to bridge the gap between players looking for a game, organizers hosting events, and owners managing facilities. We make badminton more accessible, competitive, and enjoyable.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center mb-24 border-y border-white/10 py-12">
          <div className="p-4 transform hover:scale-105 transition-transform duration-300">
            <p className="text-5xl md:text-6xl font-display font-bold text-brand-accent mb-3">50+</p>
            <p className="text-lg text-gray-400 font-medium uppercase tracking-widest">Partner Courts</p>
          </div>
          <div className="p-4 transform hover:scale-105 transition-transform duration-300 border-t border-b md:border-t-0 md:border-b-0 md:border-x border-white/10 my-8 md:my-0">
            <p className="text-5xl md:text-6xl font-display font-bold text-brand-accent mb-3">10k+</p>
            <p className="text-lg text-gray-400 font-medium uppercase tracking-widest">Active Players</p>
          </div>
          <div className="p-4 transform hover:scale-105 transition-transform duration-300">
            <p className="text-5xl md:text-6xl font-display font-bold text-brand-accent mb-3">200+</p>
            <p className="text-lg text-gray-400 font-medium uppercase tracking-widest">Tournaments</p>
          </div>
        </div>

        {/* Final CTA Card */}
        <div className="bg-brand-accent rounded-[3rem] p-12 md:p-20 text-center transform hover:scale-[1.01] transition-transform duration-500 shadow-2xl relative overflow-hidden group">
          {/* Decorative burst inside CTA */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#094d12] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          <div className="relative z-10">
            <h3 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight text-white">
              Ready to Step onto the Court?
            </h3>
            <p className="text-xl mb-10 max-w-2xl mx-auto text-green-50">
              Join thousands of players and organizers on the fastest-growing badminton platform. Sign up today and elevate your game.
            </p>
            <button className="bg-brand-bg text-brand-text font-bold px-10 py-5 rounded-full text-lg hover:bg-white hover:text-brand-accent transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 inline-flex items-center space-x-3">
              <span>Create Your Account</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
