import React from 'react';
import { Page } from '../types';
import PageItem from './PageItem';

interface PageListProps {
  pages: Page[];
  onRemovePage: (id: string) => void;
  onSubmitPage: (id: string) => void;
  onCheckStatusPage: (id: string) => void;
  onAnalyzePage: (page: Page) => void;
}

const PageList: React.FC<PageListProps> = ({ pages, onRemovePage, onSubmitPage, onCheckStatusPage, onAnalyzePage }) => {
  if (pages.length === 0) {
    return (
      <div className="text-center py-10 px-6 bg-gray-700/50 rounded-lg">
        <p className="text-gray-400">Your indexing queue is empty.</p>
        <p className="text-gray-500 mt-2">Add a page URL above to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pages.map(page => (
        <PageItem
          key={page.id}
          page={page}
          onRemove={onRemovePage}
          onSubmit={onSubmitPage}
          onCheckStatus={onCheckStatusPage}
          onAnalyze={onAnalyzePage}
        />
      ))}
    </div>
  );
};

export default PageList;