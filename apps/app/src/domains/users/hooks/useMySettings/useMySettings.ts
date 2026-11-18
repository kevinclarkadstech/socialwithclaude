import type { ProfileVisibility, UpdateMySettingsMutationInput, UserSettings } from '@myapp/shared/domains';
import { useEffect, useState } from 'react';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { runGetMySettingsQuery } from '../../operations/runGetMySettingsQuery/runGetMySettingsQuery';
import { runUpdateMySettingsMutation } from '../../operations/runUpdateMySettingsMutation/runUpdateMySettingsMutation';

/** The signed-in user's settings, and changing them. A change shows at once; a failed one is undone and shown in a toast. */
export function useMySettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isFailed, setIsFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void runGetMySettingsQuery()
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.ok) {
          setSettings(result.value);
        } else {
          setIsFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateSettings(changes: UpdateMySettingsMutationInput) {
    if (!settings) {
      return;
    }
    const before = settings;
    // Shown straight away; put back if the API refuses.
    setSettings({ ...settings, ...changes });
    setIsSaving(true);
    const result = await runOrToast(() => runUpdateMySettingsMutation(changes));
    setIsSaving(false);
    setSettings(result.ok ? result.value : before);
  }

  const setProfileVisibility = (profileVisibility: ProfileVisibility) => updateSettings({ profileVisibility });

  return { settings, isFailed, isSaving, setProfileVisibility, updateSettings };
}
