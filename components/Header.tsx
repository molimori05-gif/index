
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm shadow-lg border-b border-gray-700 sticky top-0 z-10">
      <div className="container mx-auto px-4 md:px-8 py-4">
        <h1 className="text-3xl font-extrabold text-white">
          <span className="text-cyan-400">Gemini</span> Auto Indexer
        </h1>
        <p className="text-gray-400 mt-1">Your automated page indexing assistant, supercharged by AI.</p>
      </div>
    </header>
  );
};

export default Header;
