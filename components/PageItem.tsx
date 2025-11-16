import React, { useState } from 'react';
import { Page, IndexingStatus } from '../types';
import TrashIcon from './icons/TrashIcon';
import SparklesIcon from './icons/SparklesIcon';
import ClockIcon from './icons/ClockIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';


interface PageItemProps {
  page: Page;
  onRemove: (id: string) => void;
  onSubmit: (id: string) => void;
  onCheckStatus: (id: string) => void;
  onAnalyze: (page: Page) => void;
}

const statusStyles: { [key in IndexingStatus]: { text: string; bg: string; dot: string } } = {
  [IndexingStatus.PENDING]: { text: 'text-gray-300', bg: 'bg-gray-600', dot: 'bg-gray-400' },
  [IndexingStatus.SUBMITTED]: { text: 'text-blue-300', bg: 'bg-blue-900', dot: 'bg-blue-400' },
  [IndexingStatus.INDEXED]: { text: 'text-green-300', bg: 'bg-green-900', dot: 'bg-green-400' },
  [IndexingStatus.FAILED]: { text: 'text-red-300', bg: 'bg-red-900', dot: 'bg-red-400' },
};


const PageItem: React.FC<PageItemProps> = ({ page, onRemove, onSubmit, onCheckStatus, onAnalyze }) => {
  const [isChecking, setIsChecking] = useState(false);
  const style = statusStyles[page.status];
  
  const containerClass = `p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
    page.status === IndexingStatus.INDEXED
      ? 'bg-green-900/30 border-green-700/60'
      : page.status === IndexingStatus.FAILED
      ? 'bg-red-900/30 border-red-700/60'
      : 'bg-gray-700/50 border-gray-600/50 hover:bg-gray-700 hover:border-gray-600'
  }`;

  const handleCheckStatus = async () => {
    setIsChecking(true);
    await onCheckStatus(page.id);
    setIsChecking(false);
  };

  return (
    <div className={containerClass}>
      <div className="flex-grow min-w-0">
        <p className="text-white font-medium truncate" title={page.url}>{page.url}</p>
        <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
           <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
             <span className={`h-2 w-2 rounded-full ${style.dot}`}></span>
             {page.status}
           </span>
           {page.lastSubmitted && (
             <p className="text-gray-400">
               Submitted: {page.lastSubmitted.toLocaleDateString()}
             </p>
           )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 flex-shrink-0 flex-wrap">
        <button 
          onClick={handleCheckStatus}
          disabled={isChecking}
          className="flex items-center gap-2 text-sm bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-3 rounded-md transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-wait"
        >
          {isChecking ? <><ClockIcon className="animate-spin h-4 w-4" /> Checking...</> : <><CheckCircleIcon /> Check Status</>}
        </button>
        {(page.status === IndexingStatus.PENDING || page.status === IndexingStatus.FAILED) && (
          <button 
            onClick={() => onSubmit(page.id)}
            className="text-sm bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-3 rounded-md transition-colors duration-200"
          >
            Index Now
          </button>
        )}
        <button
          onClick={() => onAnalyze(page)}
          className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors duration-200"
          title="Analyze with Gemini"
        >
          <SparklesIcon />
        </button>
        <button
          onClick={() => onRemove(page.id)}
          className="p-2 bg-red-800 hover:bg-red-700 text-white rounded-md transition-colors duration-200"
          title="Remove Page"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

export default PageItem;