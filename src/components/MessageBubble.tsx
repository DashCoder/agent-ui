import type { ReactNode } from 'react';
import type { Role } from '../api/types';
import { BookmarkIcon, CopyIcon, TrashIcon } from './Icons';
import { RichText } from './RichText';

interface Props {
  role: Role;
  text: string;
  /** Who it is, as Slack shows it: the agent's name (with an APP badge) or "You". */
  name: string;
  /** Square picture: the agent's avatar image; visitors get their initial. */
  picture?: string;
  time?: number;
  /** Same author as the message above, within a few minutes: no name or picture, like Slack. */
  grouped?: boolean;
  pending?: boolean;
  saved?: boolean;
  onSave?: () => void;
  onCopy?: () => void;
  /** Remove this message (a question also takes its answer with it). */
  onRemove?: () => void;
  /** Buttons under the message (quick replies), Slack-style. */
  children?: ReactNode;
}

const clock = (t: number) => new Date(t * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export function MessageBubble({ role, text, name, picture, time, grouped, pending, saved, onSave, onCopy, onRemove, children }: Props) {
  const isAgent = role === 'assistant';
  const tools = !pending && (onSave || onCopy || onRemove);
  return (
    <div className={`smsg ${grouped ? 'smsg--grouped' : ''} ${pending ? 'smsg--pending' : ''}`} data-testid={`msg-${role}`}
         tabIndex={tools ? -1 : undefined}>
      <div className="smsg__gutter">
        {grouped
          ? time !== undefined && <time className="smsg__hover-time">{clock(time)}</time>
          : isAgent && picture
            ? <img className="smsg__pic" src={picture} alt="" />
            : <span className={`smsg__pic smsg__pic--initial ${isAgent ? 'smsg__pic--agent' : ''}`} aria-hidden="true">
                {name.charAt(0).toUpperCase()}</span>}
      </div>
      <div className="smsg__body">
        {!grouped && (
          <div className="smsg__head">
            <span className="smsg__name">{name}</span>
            {isAgent && <span className="smsg__app">APP</span>}
            {time !== undefined && <time className="smsg__time">{clock(time)}</time>}
          </div>
        )}
        <div className="smsg__text"><RichText text={text} streaming={pending} /></div>
        {children}
      </div>
      {tools && (
        <div className="smsg__tools" role="toolbar" aria-label="Message actions">
          {isAgent && onSave && (
            <button type="button" className={`smsg__tool ${saved ? 'is-saved' : ''}`} onClick={onSave}
                    aria-label={saved ? 'Saved' : 'Save reply'} title={saved ? 'Saved' : 'Save reply'}>
              <BookmarkIcon width={16} height={16} />
            </button>
          )}
          {onCopy && (
            <button type="button" className="smsg__tool" onClick={onCopy} aria-label="Copy text" title="Copy text">
              <CopyIcon width={16} height={16} />
            </button>
          )}
          {onRemove && (
            <button type="button" className="smsg__tool" onClick={onRemove}
                    aria-label={role === 'user' ? 'Remove this question and its answer' : 'Remove this answer'}
                    title={role === 'user' ? 'Remove this question and its answer' : 'Remove this answer'}>
              <TrashIcon width={16} height={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
