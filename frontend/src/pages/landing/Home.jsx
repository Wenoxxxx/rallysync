import heroImg from '../../assets/hero.png';
import Services from './Services';
import About from './About';

export default function Home() {
  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Hero Section */}
      <section id="home" className="relative w-full pt-20 pb-32 overflow-hidden flex justify-center">
        {/* Abstract background decorative blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[1400px] pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-accent/5 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-green-200/20 rounded-full blur-3xl opacity-60"></div>
        </div>

        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
            
            {/* Left Copy */}
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-7 lg:text-left animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-forwards">
              <div className="inline-flex items-center space-x-2 bg-brand-nav-hover border border-brand-accent/20 rounded-full px-4 py-1.5 mb-8">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent"></span>
                </span>
                <span className="text-sm font-medium text-brand-accent">Version 2.0 is live!</span>
              </div>
              
              <h1 className="text-5xl tracking-tight font-display font-extrabold text-brand-text sm:text-6xl md:text-7xl mb-6 leading-[1.1]">
                Book Courts. <br />
                <span className="text-brand-accent">Compete.</span> <br />
                Dominate.
              </h1>
              
              <p className="mt-6 text-base text-brand-text-mute sm:text-lg md:text-xl max-w-xl mx-auto lg:mx-0 leading-relaxed">
                The ultimate ecosystem for badminton enthusiasts. Find available courts instantly, organize brackets seamlessly, and track your global rankings.
              </p>
              
              <div className="mt-10 flex flex-col sm:flex-row gap-4 sm:justify-center lg:justify-start">
                <button className="px-8 py-4 border border-transparent text-lg font-medium rounded-full text-white bg-brand-accent hover:bg-[#094d12] transition-all duration-300 shadow-[0_8px_30px_rgb(12,96,23,0.3)] hover:shadow-[0_8px_30px_rgb(12,96,23,0.5)] hover:-translate-y-1">
                  Book a Court
                </button>
                <button className="px-8 py-4 border-2 border-brand-accent text-lg font-medium rounded-full text-brand-accent bg-transparent hover:bg-brand-nav-hover transition-all duration-300 hover:-translate-y-1">
                  Browse Tournaments
                </button>
              </div>
            </div>
            
            {/* Right Image/Asset */}
            <div className="mt-16 lg:mt-0 lg:col-span-5 relative flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 fill-mode-forwards">
              <div className="relative w-full max-w-md">
                {/* Decorative floating card behind */}
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-accent/20 to-brand-accent/5 rounded-[3rem] transform rotate-3 scale-105 blur-sm"></div>
                <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 p-8 rounded-[3rem] shadow-2xl flex items-center justify-center transform hover:rotate-0 hover:scale-[1.02] transition-all duration-500">
                  <img 
                    className="w-full h-auto object-contain drop-shadow-xl" 
                    src={heroImg} 
                    alt="Shuddle Arena Abstract Iso" 
                    style={{ animation: 'float 6s ease-in-out infinite' }}
                  />
                </div>
              </div>
            </div>
            
          </div>
        </div>
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
            100% { transform: translateY(0px); }
          }
        `}} />
      </section>

      {/* Services and About Sections rendered below */}
      <Services />
      <About />
      
    </div>
  );
}
