import { profileImageAspectRatios, type GetUserProfileQueryOutput, type ProfileImageKind } from '@myapp/shared/domains';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { showMenu } from '../../../../lib/prompts';
import { showErrorToast } from '../../../../lib/toasts';
import type { CropArea } from '../../../../lib/images/renderCroppedImages';
import { changeProfileImage } from '../../actions/changeProfileImage';
import { removeProfileImage } from '../../actions/removeProfileImage';

const labels: Record<ProfileImageKind, string> = { avatar: 'photo', cover: 'cover photo' };

/**
 * Changing your own avatar or cover: a menu (choose or remove), the photo
 * picker, then the crop screen; saving updates the profile on screen.
 */
export function useProfileImageEditor({ profile, onProfileChange }: {
  profile: GetUserProfileQueryOutput;
  onProfileChange: (profile: GetUserProfileQueryOutput) => void;
}) {
  // The hidden <input type="file">; the menu opens it from inside the tap, as browsers require.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<ProfileImageKind>('avatar');
  const [editing, setEditing] = useState<{ kind: ProfileImageKind; photo: File; imageUrl: string } | null>(null);

  // The object URL lives as long as the crop screen shows it.
  useEffect(() => {
    if (!editing) {
      return;
    }
    return () => URL.revokeObjectURL(editing.imageUrl);
  }, [editing]);

  function openMenu(kind: ProfileImageKind) {
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
    setEditing({ kind: kindRef.current, photo, imageUrl: URL.createObjectURL(photo) });
  }

  async function save(crop: CropArea): Promise<boolean> {
    if (!editing) {
      return false;
    }
    const result = await changeProfileImage({ kind: editing.kind, photo: editing.photo, crop });
    if (!result.ok) {
      return false;
    }
    onProfileChange({ ...profile, ...result.value });
    setEditing(null);
    return true;
  }

  async function remove(kind: ProfileImageKind) {
    const result = await removeProfileImage({ kind });
    if (result.ok) {
      onProfileChange({ ...profile, ...result.value });
    }
  }

  return {
    fileInputRef,
    openMenu,
    onPhotoChosen,
    crop: editing && {
      imageUrl: editing.imageUrl,
      title: editing.kind === 'avatar' ? 'Profile photo' : 'Cover photo',
      aspectRatio: profileImageAspectRatios[editing.kind],
      shape: editing.kind === 'avatar' ? ('round' as const) : ('rect' as const),
    },
    save,
    cancel: () => setEditing(null),
  };
}
