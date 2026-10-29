import { Link } from 'react-router-dom';
import { ChatExperience } from '../components/ChatExperience';

export function ChatPage() {
  return (
    <div className="chat-page">
      <Link to="/admin" className="admin-link">Admin →</Link>
      <ChatExperience />
    </div>
  );
}
