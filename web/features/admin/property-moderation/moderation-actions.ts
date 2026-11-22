import type { Property } from '@/lib/types';

// Callbacks shared by the table row and the inspect modal
export interface ModerationActions {
  isSubmitting: boolean;
  onInspect: (property: Property) => void;
  onApprove: (property: Property) => void;
  onStartReject: (property: Property) => void;
  onHide: (property: Property) => void;
  onPublish: (property: Property) => void;
  onDelete: (property: Property) => void;
}
