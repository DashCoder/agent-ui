import { useRef, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { CloseIcon, PaperclipIcon } from './Icons';

interface Props {
  assistantName: string;
  disabled?: boolean;
  streaming?: boolean;
  onSend: (text: string, attachmentIds: string[]) => void;
  onStop?: () => void;
}

interface Attachment { id: string; filename: string }

export function Composer({ assistantName, disabled, streaming, onSend, onStop }: Props) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text, attachments.map((a) => a.id));
    setText('');
    setAttachments([]);
  };

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of Array.from(files)) {
        const res = await api.upload(f);
        setAttachments((a) => [...a, { id: res.id, filename: res.filename }]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      {(attachments.length > 0 || error) && (
        <div className="composer__attachments">
          {attachments.map((a) => (
            <span key={a.id} className="pill">
              {a.filename}
              <button type="button" aria-label={`Remove ${a.filename}`}
                      onClick={() => setAttachments((x) => x.filter((y) => y.id !== a.id))}>
                <CloseIcon width={10} height={10} />
              </button>
            </span>
          ))}
          {error && <span className="composer__error" role="alert">{error}</span>}
        </div>
      )}
      <div className="composer__row">
        <input className="composer__input" value={text} onChange={(e) => setText(e.target.value)}
               placeholder={`Ask ${assistantName} anything…`} aria-label={`Message ${assistantName}`} />
        <input ref={fileRef} type="file" hidden multiple onChange={(e) => void pick(e.target.files)} />
        <button type="button" className="composer__attach" onClick={() => fileRef.current?.click()}
                aria-label="Attach a file" disabled={uploading}>
          <PaperclipIcon width={18} height={18} />
        </button>
        {streaming && onStop ? (
          <button type="button" className="composer__send composer__send--stop" onClick={onStop}>Stop</button>
        ) : (
          <button type="submit" className="composer__send" disabled={!text.trim() || disabled}>Send</button>
        )}
      </div>
    </form>
  );
}
