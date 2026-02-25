'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Card } from '@/components/ui/Card';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient'; // Ensure this path is correct
import { useAuth } from '@/store/authStore'; // Ensure this path is correct

// Advanced schema to handle conditional password validation
const SettingsSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
  twoFactorEnabled: z.boolean(),
  emailNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
  language: z.string(),
  theme: z.enum(['light', 'dark']),
}).superRefine((data, ctx) => {
  if (data.newPassword) {
    if (data.newPassword.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 8,
        type: "string",
        inclusive: true,
        message: "Password must be at least 8 characters",
        path: ["newPassword"]
      });
    }
    if (!data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Current password is required to set a new password",
        path: ["currentPassword"]
      });
    }
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"]
      });
    }
  }
});

type SettingsFormValues = z.infer<typeof SettingsSchema>;

const mockUserSettings: SettingsFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  twoFactorEnabled: false,
  emailNotifications: true,
  inAppNotifications: true,
  language: 'en',
  theme: 'system',
};

const THEME_OPTIONS: Array<{ label: string; value: SettingsFormValues['theme'] }> = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: mockUserSettings,
  });

  useEffect(() => {
    // In a real app, you might fetch actual user preferences here to populate the form
    reset(mockUserSettings);
    setSelectedTheme(mockUserSettings.theme);
  }, [reset]);

  const handleThemeSelect = (theme: SettingsFormValues['theme']) => {
    setSelectedTheme(theme);
    setValue('theme', theme, { shouldDirty: true });
  };

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      setLoading(true);

      // If the user is trying to change their password, handle the API call
      if (data.newPassword && data.currentPassword) {
        if (!user?.id) {
          toast.error("User session not found.");
          return;
        }
        await apiClient.patch(`/users/${user.id}`, {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        });
      }

      // Handle saving general preferences (Mocked for now as per original code)
      await new Promise((res) => setTimeout(res, 1000));
      
      toast.success('Settings saved successfully');
      
      // Clear password fields after successful submission
      reset({
        ...data,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save settings";
      toast.error(msg);
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

        {/* Security Settings (Replaced Account Settings) */}
        <Card title="Security Settings">
          <p className="text-sm text-gray-500 mb-4">
            Manage your password and secure your account.
          </p>
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
            <Input
              label="Confirm New Password"
              type="password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />
            
            <div className="pt-4 border-t border-gray-100">
              <Controller
                control={control}
                name="twoFactorEnabled"
                render={({ field: { value, onChange } }) => (
                  <Switch
                    label="Two-Factor Authentication (2FA)"
                    description="Add an extra layer of security to your account."
                    checked={value}
                    onCheckedChange={(checked) => {
                      onChange(checked);
                      toast.success(
                        checked 
                          ? "Two-factor authentication enabled." 
                          : "Two-factor authentication disabled."
                      );
                    }}
                  />
                )}
              />
            </div>
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
          </div>
        </Card>

        {/* Appearance */}
        <Card title="Appearance">
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Appearance</h2>
            <p className="text-sm text-gray-500">
              Choose how ManageHub should look for your account.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {THEME_OPTIONS.map((themeOption) => {
                const isActive = selectedTheme === themeOption.value;

                return (
                  <button
                    key={themeOption.value}
                    type="button"
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'h-11 w-full border text-sm font-medium transition-colors',
                      isActive
                        ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                    onClick={() => handleThemeSelect(themeOption.value)}
                  >
                    {themeOption.label}
                  </button>
                );
              })}
            </div>
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
