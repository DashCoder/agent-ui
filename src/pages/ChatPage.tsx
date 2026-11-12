import { ChatExperience } from '../components/ChatExperience';

/** The visitor page: the whole screen is the Slack-style chat (Admin → is in its header). */
export function ChatPage() {
  return (
    <div className="chat-page">
      <ChatExperience />
    </div>
  );
}
