import type { Role } from '../api/types';
import { SaveIcon } from './Icons';
import { RichText } from './RichText';

interface Props {
  role: Role;
  text: string;
  pending?: boolean;
  saved?: boolean;
  onSave?: () => void;
}

export function MessageBubble({ role, text, pending, saved, onSave }: Props) {
  return (
    <div className={`msg msg--${role}`} data-testid={`msg-${role}`}>
      <div className={`bubble ${pending ? 'bubble--pending' : ''}`}>
        <RichText text={text} />
        {role === 'assistant' && onSave && !pending && (
          <button type="button" className={`bubble__save ${saved ? 'is-saved' : ''}`} onClick={onSave}
                  aria-label={saved ? 'Saved' : 'Save reply'} title={saved ? 'Saved' : 'Save reply'}>
            <SaveIcon width={15} height={15} />
          </button>
        )}
      </div>
    </div>
  );
}
