import { useSearchParams } from 'react-router-dom';
import { ChatExperience } from '../components/ChatExperience';

/** The visitor page: the whole screen is the Slack-style chat. /?agent=kpi opens that agent's chat (Kai). */
export function ChatPage() {
  const [params] = useSearchParams();
  const agent = params.get('agent') ?? undefined;
  return (
    <div className="chat-page">
      <ChatExperience key={agent ?? 'main'} agent={agent} />
    </div>
  );
}
