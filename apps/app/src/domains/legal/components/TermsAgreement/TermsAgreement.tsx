import { useState } from 'react';
import { IonCheckbox } from '@ionic/react';
import type { LegalDocumentName } from '../../types';
import { LegalDocumentModal } from '../LegalDocumentModal/LegalDocumentModal';
import './TermsAgreement.css';

/**
 * "I agree to the Terms of Service and Privacy Policy": the checkbox, and
 * the two documents as buttons that open them over the form to read. (They
 * aren't links inside the checkbox's label, where a tap would also tick it,
 * or leave the form.)
 */
export function TermsAgreement({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const [reading, setReading] = useState<LegalDocumentName | null>(null);

  return (
    <div className="terms-agreement">
      <IonCheckbox
        className="terms-agreement__checkbox"
        aria-label="I agree to the Terms of Service and Privacy Policy"
        checked={checked}
        onIonChange={(event) => onChange(event.detail.checked)}
      />
      <span className="terms-agreement__label">
        <span onClick={() => onChange(!checked)}>I agree to the </span>
        <button type="button" className="terms-agreement__link" onClick={() => setReading('terms')}>
          Terms of Service
        </button>
        <span onClick={() => onChange(!checked)}> and </span>
        <button type="button" className="terms-agreement__link" onClick={() => setReading('privacy')}>
          Privacy Policy
        </button>
      </span>
      <LegalDocumentModal name={reading} onClose={() => setReading(null)} />
    </div>
  );
}
