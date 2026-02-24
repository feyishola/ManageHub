'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
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
  theme: 'light',
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

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
    // In a real app, you might fetch actual user preferences here to populate the form
    reset(mockUserSettings);
  }, [reset]);

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
      </form>
    </div>
  );
}