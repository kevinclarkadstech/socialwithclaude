import { canUpdateMyProfile, profilePhotoAspectRatios, type GetUserProfileQueryOutput, type ProfilePhotoKind } from '@myapp/shared/domains';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { showMenu } from '../../../../lib/prompts';
import { showErrorToast } from '../../../../lib/toasts';
import type { CropArea } from '../../../../lib/photos/renderCroppedPhotos';
import { changeProfilePhoto } from '../../actions/changeProfilePhoto/changeProfilePhoto';
import { removeProfilePhoto } from '../../actions/removeProfilePhoto/removeProfilePhoto';
import { useCallingUser } from '../../hooks/useCallingUser/useCallingUser';
import { disallowedActions } from '../../../../common/events/disallowedActions/disallowedActions';

const labels: Record<ProfilePhotoKind, string> = { avatar: 'photo', cover: 'cover photo' };

/**
 * Changing your own avatar or cover: a menu (choose or remove), the photo
 * picker, then the crop screen; saving updates the profile on screen.
 */
export function useProfilePhotoEditor({ profile, onProfileChange }: {
  profile: GetUserProfileQueryOutput;
  onProfileChange: (profile: GetUserProfileQueryOutput) => void;
}) {
  const { callingUser } = useCallingUser();
  const updateProfileCheck = canUpdateMyProfile({ caller: callingUser });
  // The hidden <input type="file">; the menu opens it from inside the tap, as browsers require.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<ProfilePhotoKind>('avatar');
  const [editing, setEditing] = useState<{ kind: ProfilePhotoKind; photo: File; photoUrl: string } | null>(null);

  // The object URL lives as long as the crop screen shows it.
  useEffect(() => {
    if (!editing) {
      return;
    }
    return () => URL.revokeObjectURL(editing.photoUrl);
  }, [editing]);

  function openMenu(kind: ProfilePhotoKind) {
    if (!updateProfileCheck.ok) {
      disallowedActions.emit({ error: updateProfileCheck.error });
      return;
    }
    kindRef.current = kind;
    void showMenu({
      options: [
        { text: `Choose ${labels[kind]}`, onSelect: () => fileInputRef.current?.click() },
        { text: `Remove ${labels[kind]}`, role: 'destructive', onSelect: () => void remove(kind) },
      ],
    });
  }

  function onPhotoChosen(event: ChangeEvent<HTMLInputElement>) {
    const photo = event.target.files?.[0];
    // So choosing the same photo again still fires a change.
    event.target.value = '';
    if (!photo) {
      return;
    }
    if (!photo.type.startsWith('image/')) {
      void showErrorToast('Choose a photo');
      return;
    }
    setEditing({ kind: kindRef.current, photo, photoUrl: URL.createObjectURL(photo) });
  }

  async function save(crop: CropArea): Promise<boolean> {
    if (!editing) {
      return false;
    }
    const result = await changeProfilePhoto({ kind: editing.kind, photo: editing.photo, crop });
    if (!result.ok) {
      return false;
    }
    onProfileChange({ ...profile, ...result.value });
    setEditing(null);
    return true;
  }

  async function remove(kind: ProfilePhotoKind) {
    const result = await removeProfilePhoto({ kind });
    if (result.ok) {
      onProfileChange({ ...profile, ...result.value });
    }
  }

  return {
    fileInputRef,
    openMenu,
    onPhotoChosen,
    crop: editing && {
      photoUrl: editing.photoUrl,
      title: editing.kind === 'avatar' ? 'Profile photo' : 'Cover photo',
      aspectRatio: profilePhotoAspectRatios[editing.kind],
      shape: editing.kind === 'avatar' ? ('round' as const) : ('rect' as const),
    },
    save,
    cancel: () => setEditing(null),
  };
}
