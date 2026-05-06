import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, KeyRound, LogOut, Camera, Eye, EyeOff, CheckCircle, XCircle, ExternalLink, Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { authApi } from '@/api/auth';
import { uploadsApi } from '@/api/uploads';
import { usersApi } from '@/api/users';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { classNames } from '@/utils/helpers';

const profileSchema = z.object({
  full_name: z.string().max(100, 'Max 100 characters').optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  team: z.string().max(50, 'Max 50 characters').optional().or(z.literal('')),
});

const passwordSchema = z.object({
  old_password: z.string().min(1, 'Required'),
  new_password: z.string().min(8, 'Min 8 characters').max(128, 'Max 128 characters'),
  confirm_password: z.string().min(1, 'Required'),
}).refine((data) => data.new_password !== data.old_password, {
  message: 'New password must be different from current password',
  path: ['new_password'],
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export const UserSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, updateProfile, logout } = useAuthStore();
  const { showToast } = useUIStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'apikey'>('profile');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<{ type: 'valid' | 'warning'; message: string } | null>(null);
  const [helpUrl, setHelpUrl] = useState('');
  const [saveElapsed, setSaveElapsed] = useState(0);

  useEffect(() => {
    usersApi.checkLlmApiKey().then(r => setHasKey(r.has_key)).catch(() => {});
    usersApi.getKeyHelpUrl().then(r => setHelpUrl(r.url)).catch(() => {});
  }, []);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
      team: user?.team || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast({ type: 'error', message: t('settings.avatar_type_error') });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast({ type: 'error', message: t('settings.avatar_size_error') });
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const { url } = await uploadsApi.uploadAvatar(file);
      await updateProfile({ avatar_url: url });
      showToast({ type: 'success', message: t('settings.avatar_updated') });
    } catch {
      showToast({ type: 'error', message: t('settings.avatar_error') });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      await updateProfile({
        full_name: data.full_name || undefined,
        email: data.email || undefined,
        team: data.team || undefined,
      });
      showToast({ type: 'success', message: t('settings.profile_updated') });
    } catch {
      showToast({ type: 'error', message: t('settings.profile_error') });
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      await authApi.changePassword(data.old_password, data.new_password);
      showToast({ type: 'success', message: t('settings.password_changed') });
      resetPassword();
    } catch {
      showToast({ type: 'error', message: t('settings.password_error') });
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'settings.profile', icon: User },
    { id: 'password' as const, label: 'settings.password', icon: KeyRound },
    { id: 'apikey' as const, label: 'settings.api_key_tab', icon: Bot },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-section-heading font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-500 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* User card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-semibold text-primary-700">
                    {user?.full_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all cursor-pointer"
              >
                <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              {isUploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black bg-opacity-40 flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-feature-title font-semibold text-gray-900">
                {user?.full_name || user?.username}
              </h2>
              <p className="text-sm text-gray-500">@{user?.username}</p>
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                {user?.role === 'admin' ? t('common.administrator') : t('common.member')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={classNames(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {t(tab.label)}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <h3 className="text-feature-title font-semibold text-gray-900">{t('settings.profile_info')}</h3>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
              <Input
                label={t('auth.username')}
                value={user?.username || ''}
                disabled
                helperText={t('settings.username_hint')}
              />
              <Input
                label={t('settings.fullname_label')}
                placeholder={t('settings.fullname_placeholder')}
                error={profileErrors.full_name?.message}
                {...registerProfile('full_name')}
              />
              <Input
                label={t('settings.email_label')}
                type="email"
                placeholder={t('settings.email_placeholder')}
                error={profileErrors.email?.message}
                {...registerProfile('email')}
              />
              <Input
                label={t('settings.team_label')}
                placeholder={t('settings.team_placeholder')}
                error={profileErrors.team?.message}
                {...registerProfile('team')}
              />
              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={isProfileSubmitting}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <Card>
          <CardHeader>
            <h3 className="text-feature-title font-semibold text-gray-900">{t('settings.change_password')}</h3>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
              <Input
                label={t('settings.current_password')}
                type="password"
                placeholder={t('settings.current_password_placeholder')}
                error={passwordErrors.old_password?.message}
                {...registerPassword('old_password')}
              />
              <Input
                label={t('settings.new_password')}
                type="password"
                placeholder={t('settings.new_password_placeholder')}
                error={passwordErrors.new_password?.message}
                {...registerPassword('new_password')}
              />
              <Input
                label={t('settings.confirm_password')}
                type="password"
                placeholder={t('settings.confirm_password_placeholder')}
                error={passwordErrors.confirm_password?.message}
                {...registerPassword('confirm_password')}
              />
              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={isPasswordSubmitting}>
                  {t('settings.change_password')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* API Key Tab */}
      {activeTab === 'apikey' && (
        <Card>
          <CardHeader>
            <h3 className="text-feature-title font-semibold text-gray-900">{t('settings.api_key_title')}</h3>
          </CardHeader>
          <CardContent className="p-6 pt-4 space-y-4">
            <p className="text-sm text-gray-500">
              {t('settings.api_key_desc')}
              {helpUrl && (
                <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary-600 hover:underline inline-flex items-center gap-1">
                  {t('settings.api_key_guide')} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </p>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setValidationResult(null); }}
                placeholder={hasKey ? t('settings.api_key_placeholder_saved') : 'sk-...'}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-base text-gray-900 focus:border-primary-500 focus:ring-primary-500 focus:outline-none shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {validationResult && (
              <div className={classNames(
                'flex items-center gap-2 text-sm',
                validationResult.type === 'valid' ? 'text-green-600' : 'text-amber-600'
              )}>
                {validationResult.type === 'valid'
                  ? <CheckCircle className="h-4 w-4" />
                  : <XCircle className="h-4 w-4" />
                }
                <span>{validationResult.message}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={async () => {
                  if (!apiKey.trim()) return;
                  setIsSaving(true);
                  setValidationResult(null);
                  setIsSaving(true);
                  setSaveElapsed(0);
                  const timer = setInterval(() => setSaveElapsed(s => s + 1), 1000);
                  try {
                    const result = await usersApi.saveLlmApiKey(apiKey.trim());
                    setHasKey(true);
                    if (result.valid) {
                      setApiKey('');
                      setValidationResult({ type: 'valid', message: t('settings.api_key_valid') });
                      showToast({ type: 'success', message: t('settings.api_key_saved') });
                    } else {
                      const reasonMsgMap: Record<string, string> = {
                        invalid_key: t('settings.api_key_invalid'),
                        agent_unreachable: t('settings.api_key_agent_unreachable'),
                        llm_unreachable: t('settings.api_key_llm_unreachable'),
                        timeout: t('settings.api_key_timeout'),
                        error: t('settings.api_key_validate_error'),
                      };
                      const msg = reasonMsgMap[result.reason || 'error'] || t('settings.api_key_invalid');
                      setApiKey('');
                      setValidationResult({ type: 'warning', message: msg });
                      showToast({ type: 'warning', message: msg });
                    }
                  } catch {
                    showToast({ type: 'error', message: t('settings.api_key_save_fail') });
                  } finally {
                    clearInterval(timer);
                    setIsSaving(false);
                    setSaveElapsed(0);
                  }
                }}
                disabled={!apiKey.trim() || isSaving}
                isLoading={isSaving}
              >
                {isSaving ? `${t('settings.api_key_validating')} ${saveElapsed}s` : t('settings.api_key_save')}
              </Button>
              {hasKey && (
                <Button
                  variant="danger"
                  onClick={async () => {
                    try {
                      await usersApi.deleteLlmApiKey();
                      setHasKey(false);
                      setValidationResult(null);
                      showToast({ type: 'success', message: t('settings.api_key_deleted') });
                    } catch {
                      showToast({ type: 'error', message: t('settings.api_key_delete_fail') });
                    }
                  }}
                >
                  {t('settings.api_key_delete')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Language */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">{t('settings.language')}</h3>
              <p className="text-sm text-gray-500">{t('settings.language_desc')}</p>
            </div>
            <select
              value={i18n.language?.startsWith('vi') ? 'vi' : 'en'}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-base text-gray-900 focus:border-primary-500 focus:ring-primary-500 focus:outline-none shadow-sm transition-colors"
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">{t('auth.sign_out')}</h3>
              <p className="text-sm text-gray-500">{t('auth.sign_out_desc')}</p>
            </div>
            <Button variant="danger" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('auth.sign_out')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
