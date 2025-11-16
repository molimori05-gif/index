import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Page, IndexingStatus } from './types';
import Header from './components/Header';
import AddPageForm from './components/AddPageForm';
import PageList from './components/PageList';
import SeoHelperModal from './components/SeoHelperModal';
import StatusSummary from './components/StatusSummary';

// ==================================================================================
// ОБЯЗАТЕЛЬНО: Вставьте сюда свои учетные данные из Google Cloud Console
// ==================================================================================
const CLIENT_ID = '965591947644-v14v5gae0jdh3m38e8fh7pqdh5ikjv39.apps.googleusercontent.com'; // <-- ЗАМЕНЕНО НА ВАШ CLIENT ID
const API_KEY = 'AIzaSyDWtpv39WEVxCjv7oPU9HxjBavnaQWlX9I'; // <-- ЗАМЕНЕНО НА ВАШ API KEY
// ==================================================================================

const SCOPES = 'https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/indexing';

declare global {
  interface Window {
    gapi: any;
    google: any;
    tokenClient: any;
  }
}

const App: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [gapiReady, setGapiReady] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  const [tempSiteUrl, setTempSiteUrl] = useState('');

  // Load and save state from local storage
  useEffect(() => {
    try {
      const storedPages = localStorage.getItem('indexer-pages');
      if (storedPages) {
        const parsedPages = JSON.parse(storedPages).map((p: any) => ({
          ...p,
          lastSubmitted: p.lastSubmitted ? new Date(p.lastSubmitted) : null,
        }));
        setPages(parsedPages);
      }
      const storedSiteUrl = localStorage.getItem('indexer-siteUrl');
      if (storedSiteUrl) {
          setSiteUrl(storedSiteUrl);
          setTempSiteUrl(storedSiteUrl);
      }
    } catch (error) {
      console.error("Failed to load data from local storage:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('indexer-pages', JSON.stringify(pages));
      localStorage.setItem('indexer-siteUrl', siteUrl);
    } catch (error) {
      console.error("Failed to save data to local storage:", error);
    }
  }, [pages, siteUrl]);

  // Google API Initialization
  const initGapiClient = useCallback(async () => {
    await window.gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/searchconsole/v1/rest'],
    });
    setGapiReady(true);
  }, []);

  useEffect(() => {
    const initializeGoogleApis = () => {
      // Initialize GAPI client for Search Console API
      window.gapi.load('client', initGapiClient);

      // Initialize Google Identity Services client for OAuth
      window.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            setIsSignedIn(true);
            window.gapi.client.setToken(tokenResponse);
          }
        },
      });
    };

    // The Google API scripts are loaded asynchronously from index.html.
    // We need to wait for them to be available on the window object.
    // A simple polling mechanism is robust for this purpose.
    const intervalId = setInterval(() => {
      if (window.gapi && window.google?.accounts?.oauth2) {
        clearInterval(intervalId);
        initializeGoogleApis();
      }
    }, 100); // Check every 100ms

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [initGapiClient]);


  const handleAuthClick = () => {
    if (window.tokenClient) {
      if (window.gapi?.client?.getToken() === null) {
        // Prompt the user to select an account and grant access.
        window.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        // Skip display of account chooser and grant button.
        window.tokenClient.requestAccessToken({ prompt: '' });
      }
    }
  };

  const handleSignoutClick = () => {
    const token = window.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        window.gapi.client.setToken(null);
        setIsSignedIn(false);
      });
    }
  };
  
  const handleSiteUrlSave = () => {
    try {
        new URL(tempSiteUrl);
        setSiteUrl(tempSiteUrl);
    } catch {
        // check for sc-domain: format
        if (tempSiteUrl.startsWith('sc-domain:')) {
            setSiteUrl(tempSiteUrl);
        } else {
            alert("Please enter a valid site URL (e.g. https://example.com) or a domain property (e.g. sc-domain:example.com)");
        }
    }
  };


  const addPage = useCallback((url: string) => {
    if (url && !pages.some(p => p.url === url)) {
      const newPage: Page = {
        id: crypto.randomUUID(),
        url,
        status: IndexingStatus.PENDING,
        lastSubmitted: null,
      };
      setPages(prevPages => [...prevPages, newPage]);
    }
  }, [pages]);

  const removePage = useCallback((id: string) => {
    setPages(prevPages => prevPages.filter(p => p.id !== id));
  }, []);

  const submitPageForIndexing = useCallback(async (id: string) => {
     const page = pages.find(p => p.id === id);
     if (!page) return;

     setPages(prevPages => prevPages.map(p => p.id === id ? { ...p, status: IndexingStatus.SUBMITTED, lastSubmitted: new Date() } : p));

     try {
       const response = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           Authorization: `Bearer ${window.gapi.client.getToken().access_token}`,
         },
         body: JSON.stringify({
           url: page.url,
           type: 'URL_UPDATED',
         }),
       });
       const data = await response.json();
       if (response.ok) {
         console.log('Successfully submitted for indexing:', data);
         // Optionally, trigger a status check after a delay
         setTimeout(() => checkPageIndex(id), 30000);
       } else {
         console.error('Failed to submit for indexing:', data);
         alert(`Error: ${data.error.message}`);
         setPages(prevPages => prevPages.map(p => p.id === id ? { ...p, status: IndexingStatus.FAILED } : p));
       }
     } catch (error) {
       console.error('API call failed:', error);
       setPages(prevPages => prevPages.map(p => p.id === id ? { ...p, status: IndexingStatus.FAILED } : p));
     }
  }, [pages]);
  
  const checkPageIndex = useCallback(async (id: string) => {
    const page = pages.find(p => p.id === id);
    if (!page || !siteUrl) return;

    try {
      const response = await window.gapi.client.searchconsole.urlInspection.index.inspect({
          inspectionUrl: page.url,
          siteUrl: siteUrl,
      });

      const result = response.result.inspectionResult;
      const verdict = result?.indexStatusResult?.verdict;

      let newStatus = IndexingStatus.FAILED;
      if (verdict === 'PASS') {
          newStatus = IndexingStatus.INDEXED;
      } else if (verdict === 'NEUTRAL' || verdict === 'UNKNOWN') {
          newStatus = IndexingStatus.PENDING; // Still processing or unknown
      } else {
          // Other statuses like 'FAIL' are considered FAILED
          newStatus = IndexingStatus.FAILED;
      }
      
      console.log(`Status for ${page.url}:`, result);
      setPages(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));

    } catch (error: any) {
        console.error('Error checking page index:', error);
        alert(`Error checking status: ${error?.result?.error?.message || error.toString()}`);
        setPages(prev => prev.map(p => p.id === id ? { ...p, status: IndexingStatus.FAILED } : p));
    }
  }, [pages, siteUrl]);

  const submitAllPendingPages = useCallback(() => {
    pages.forEach(p => {
      if (p.status === IndexingStatus.PENDING || p.status === IndexingStatus.FAILED) {
        submitPageForIndexing(p.id);
      }
    });
  }, [pages, submitPageForIndexing]);

  const checkAllStatuses = useCallback(() => {
    pages.forEach(p => {
      checkPageIndex(p.id);
    });
  }, [pages, checkPageIndex]);

  const openSeoModal = useCallback((page: Page) => {
    setSelectedPage(page);
    setIsModalOpen(true);
  }, []);

  const closeSeoModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPage(null);
  }, []);

  const stats = useMemo(() => {
    return pages.reduce((acc, page) => {
      acc.total++;
      if (page.status === IndexingStatus.INDEXED) acc.indexed++;
      else if (page.status === IndexingStatus.PENDING) acc.pending++;
      else if (page.status === IndexingStatus.SUBMITTED) acc.submitted++;
      else if (page.status === IndexingStatus.FAILED) acc.failed++;
      return acc;
    }, { total: 0, indexed: 0, pending: 0, submitted: 0, failed: 0 });
  }, [pages]);

  const renderContent = () => {
    if (!gapiReady) {
        return <div className="text-center p-10">Loading Google API...</div>;
    }
    if (!isSignedIn) {
        return (
            <div className="max-w-md mx-auto mt-20 text-center bg-gray-800 p-8 rounded-lg shadow-2xl border border-gray-700">
                <h2 className="text-2xl font-bold text-cyan-400 mb-4">Authentication Required</h2>
                <p className="text-gray-400 mb-6">Please sign in with your Google Account to manage your site indexing. Make sure you have access to the site in Google Search Console.</p>
                <button onClick={handleAuthClick} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300">
                    Sign in with Google
                </button>
            </div>
        );
    }
    if (!siteUrl) {
         return (
            <div className="max-w-md mx-auto mt-20 text-center bg-gray-800 p-8 rounded-lg shadow-2xl border border-gray-700">
                <h2 className="text-2xl font-bold text-cyan-400 mb-4">Configure Your Site</h2>
                <p className="text-gray-400 mb-6">Enter the full URL of your site property as it appears in Google Search Console (e.g., https://example.com/ or sc-domain:example.com).</p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={tempSiteUrl}
                        onChange={(e) => setTempSiteUrl(e.target.value)}
                        placeholder="https://your-website.com/"
                        className="flex-grow w-full bg-gray-700 text-gray-100 border-2 border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button onClick={handleSiteUrlSave} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                        Save
                    </button>
                </div>
                 <button onClick={handleSignoutClick} className="text-sm text-gray-500 hover:text-gray-300 mt-6">Sign out</button>
            </div>
        );
    }
    return (
        <main className="container mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-400">Signed in for: <strong className="font-bold text-cyan-400">{siteUrl}</strong></p>
              <button onClick={handleSignoutClick} className="text-sm bg-gray-700 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-md">Sign Out</button>
            </div>
            <div className="max-w-4xl mx-auto">
                <div className="bg-gray-800 rounded-lg shadow-2xl p-6 mb-8 border border-gray-700">
                    <h2 className="text-2xl font-bold text-cyan-400 mb-4">Add New Page</h2>
                    <p className="text-gray-400 mb-6">Enter the full URL of the page you want to add to the indexing queue.</p>
                    <AddPageForm onAddPage={addPage} />
                </div>
                <div className="bg-gray-800 rounded-lg shadow-2xl p-6 border border-gray-700">
                    <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                        <h2 className="text-2xl font-bold text-cyan-400">Indexing Queue</h2>
                        <div className="flex gap-2 flex-wrap">
                             <button 
                               onClick={checkAllStatuses}
                               className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-600 disabled:cursor-not-allowed"
                               disabled={pages.length === 0}
                             >
                               Check All Statuses
                             </button>
                            <button 
                              onClick={submitAllPendingPages}
                              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:bg-gray-600 disabled:cursor-not-allowed"
                              disabled={!pages.some(p => p.status === IndexingStatus.PENDING || p.status === IndexingStatus.FAILED)}
                            >
                              Submit All Pending
                            </button>
                        </div>
                    </div>
                    <StatusSummary stats={stats} />
                    <PageList 
                        pages={pages} 
                        onRemovePage={removePage} 
                        onSubmitPage={submitPageForIndexing} 
                        onCheckStatusPage={checkPageIndex}
                        onAnalyzePage={openSeoModal} 
                    />
                </div>
            </div>
        </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      <Header />
      {renderContent()}
      {isModalOpen && selectedPage && (
        <SeoHelperModal page={selectedPage} onClose={closeSeoModal} />
      )}
    </div>
  );
};

export default App;
