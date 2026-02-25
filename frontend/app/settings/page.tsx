'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/lib/store/authStore';

// Note: metadata must live in a separate layout.ts/page metadata export
// since this is a 'use client' component. Move to a parent layout if needed.

const SettingsSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').optional(),
  emailNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
  language: z.string(),
  theme: z.enum(['light', 'dark']),
});

type SettingsFormValues = z.infer<typeof SettingsSchema>;

const mockUserSettings: SettingsFormValues = {
  currentPassword: '',
  newPassword: '',
  emailNotifications: true,
  inAppNotifications: true,
  language: 'en',
  theme: 'light',
};

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: mockUserSettings,
  });

  useEffect(() => {
    reset(mockUserSettings);
  }, [reset]);

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      setLoading(true);
      await new Promise((res) => setTimeout(res, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirmationText('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = (force = false) => {
    if (isDeletingAccount && !force) return;
    setShowDeleteModal(false);
    setDeleteConfirmationText('');
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      toast.error('Unable to identify your account. Please sign in again.');
      return;
    }

    if (deleteConfirmationText !== 'DELETE') {
      toast.error('Please type DELETE to confirm.');
      return;
    }

    try {
      setIsDeletingAccount(true);
      await apiClient.delete(`/users/${user.id}`);
      clearAuth();
      closeDeleteModal(true);
      toast.success('Account deleted successfully.');
      router.push('/');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete account';
      toast.error(message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">User Settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Account Settings */}
        <Card title="Account Settings">
          <div className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              {...register('currentPassword')}
              error={errors.currentPassword?.message}
            />
            <Input
              label="New Password"
              type="password"
              {...register('newPassword')}
              error={errors.newPassword?.message}
            />
          </div>
        </Card>

        {/* Notifications */}
        <Card title="Notifications">
          <p className="text-sm text-gray-500 mb-4">
            Manage how and where you receive notifications.
          </p>
          <div className="space-y-4">
            <Controller
              control={control}
              name="emailNotifications"
              render={({ field: { value, onChange } }) => (
                <Switch
                  label="Email Notifications"
                  description="Receive updates and alerts via email."
                  checked={value}
                  onCheckedChange={onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="inAppNotifications"
              render={({ field: { value, onChange } }) => (
                <Switch
                  label="In-App Notifications"
                  description="See notifications inside the application."
                  checked={value}
                  onCheckedChange={onChange}
                />
              )}
            />
          </div>
        </Card>

        {/* Preferences */}
        <Card title="Preferences">
          <div className="space-y-4">
            <Select
              label="Language"
              {...register('language')}
              options={[
                { label: 'English', value: 'en' },
                { label: 'Spanish', value: 'es' },
              ]}
              defaultValue={mockUserSettings.language}
            />
            <Select
              label="Theme"
              {...register('theme')}
              options={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
              defaultValue={mockUserSettings.theme}
            />
          </div>
        </Card>

        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>

        <div className="rounded-xl border border-red-300 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
          <p className="mt-2 text-sm text-red-700/90">
            Deleting your account is permanent and cannot be undone.
          </p>
          <div className="mt-4">
            <Button type="button" variant="destructive" onClick={openDeleteModal}>
              Delete Account
            </Button>
          </div>
        </div>
      </form>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
            <p className="mt-2 text-sm text-gray-600">
              To confirm account deletion, type <span className="font-semibold">DELETE</span>{' '}
              below.
            </p>

            <div className="mt-4 space-y-2">
              <label htmlFor="delete-confirmation" className="text-sm font-medium text-gray-700">
                Confirmation
              </label>
              <input
                id="delete-confirmation"
                type="text"
                value={deleteConfirmationText}
                onChange={(event) => setDeleteConfirmationText(event.target.value)}
                placeholder="Type DELETE"
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeDeleteModal}
                disabled={isDeletingAccount}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || deleteConfirmationText !== 'DELETE'}
              >
                {isDeletingAccount ? 'Deleting...' : 'Confirm Deletion'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
