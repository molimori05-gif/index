
import React, { useState } from 'react';
import PlusIcon from './icons/PlusIcon';

interface AddPageFormProps {
  onAddPage: (url: string) => void;
}

const AddPageForm: React.FC<AddPageFormProps> = ({ onAddPage }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      try {
        // Basic URL validation
        new URL(url);
        onAddPage(url.trim());
        setUrl('');
      } catch (error) {
        alert('Please enter a valid URL (e.g., https://example.com)');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-center">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://your-website.com/your-page"
        className="flex-grow w-full bg-gray-700 text-gray-100 border-2 border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
        required
      />
      <button
        type="submit"
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75"
      >
        <PlusIcon />
        Add Page
      </button>
    </form>
  );
};

export default AddPageForm;
