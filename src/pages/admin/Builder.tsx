import { ChatExperience } from '../../components/ChatExperience';
import { PageHeader } from './AdminLayout';

export function Builder() {
  return (
    <>
      <PageHeader title="Builder" subtitle="Talk to your assistant exactly as visitors will see it." />
      <div className="builder-frame">
        <ChatExperience savedPlacement="inline" />
      </div>
    </>
  );
}
