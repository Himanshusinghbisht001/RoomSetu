import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ChatWindow } from '../features/chat/components/ChatWindow.js';
import Navbar from '../components/Navbar.js';

export default function ChatPage() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract optional context if navigated directly from inquiries list
  const inquiry = location.state?.inquiry;
  const chatTitle = inquiry?.roomId?.title || 'Private Chat';
  const chatSubtitle = inquiry?.seekerId?.name || '';

  return (
    <div className="chat-page-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg)' }}>
      <Navbar />
      <main className="chat-page-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="container mx-auto max-w-4xl pt-4 pb-6 px-4" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-outline" 
            style={{ alignSelf: 'flex-start', marginBottom: '1rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            aria-label="Go back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          
          <div className="chat-window-wrapper card" style={{ flex: 1, overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' }}>
            {inquiryId ? (
              <ChatWindow inquiryId={inquiryId} chatTitle={chatTitle} chatSubtitle={chatSubtitle} />
            ) : (
              <div className="error-card text-center py-12" role="alert" style={{ margin: 'auto' }}>
                <h2 className="text-xl font-bold mb-2">Invalid Request</h2>
                <p>No inquiry ID was provided.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
