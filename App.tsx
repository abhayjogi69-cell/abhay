
import React, { useState } from 'react';
import ImageEditor from './components/ImageEditor';
import VideoGenerator from './components/VideoGenerator';
import { ImageIcon, VideoIcon } from './components/IconComponents';

type Mode = 'image' | 'video';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('image');

  const NavButton: React.FC<{
    label: string, 
    icon: React.FC<{className?: string}>, 
    isActive: boolean, 
    onClick: () => void
  }> = ({ label, icon: Icon, isActive, onClick }) => {
    const baseClasses = "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800";
    const activeClasses = "bg-purple-600 text-white focus:ring-purple-500";
    const inactiveClasses = "text-slate-300 bg-slate-700/50 hover:bg-slate-700 focus:ring-purple-500";
    
    return (
        <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            <Icon className="w-5 h-5" />
            <span>{label}</span>
        </button>
    )
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans">
      <header className="text-center p-4 md:p-6 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
          Gemini Creative Suite
        </h1>
        <p className="text-slate-400 mt-2">Transform your media with the power of AI</p>
      </header>
      
      <nav className="flex justify-center p-4">
        <div className="flex items-center gap-2 p-1.5 bg-slate-800 border border-slate-700 rounded-lg">
            <NavButton label="Image Editor" icon={ImageIcon} isActive={mode === 'image'} onClick={() => setMode('image')} />
            <NavButton label="Video Generator" icon={VideoIcon} isActive={mode === 'video'} onClick={() => setMode('video')} />
        </div>
      </nav>

      <main className="container mx-auto p-4 md:p-8">
        {mode === 'image' && <ImageEditor />}
        {mode === 'video' && <VideoGenerator />}
      </main>

      <footer className="text-center p-4 text-slate-500 text-sm mt-8">
        <p>Powered by Google Gemini. Built with React & Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default App;
