'use client';

import {
  Building2,
  Image,
  LogIn,
  Mail,
  MessageSquare,
  Palette,
  Settings,
  ShieldCheck,
  Webhook,
} from 'lucide-react';
import { useQueryState } from 'nuqs';

import { PageLayout } from '@/components/page-layout';
import { AirlineInlineForm } from '@/components/settings/airline-inline-form';
import { AssetsForm } from '@/components/settings/assets-form';
import { AuthBrandingForm } from '@/components/settings/auth-image-form';
import { AutoApprovalForm } from '@/components/settings/auto-approval-form';
import { DiscordForm } from '@/components/settings/discord-form';
import { InfiniteFlightForm } from '@/components/settings/infinite-flight-form';
import { SmtpForm } from '@/components/settings/smtp-form';
import { ThemeForm } from '@/components/settings/theme-form';
import { WebhookForm } from '@/components/settings/webhook-form';
import { Button } from '@/components/ui/button';
import { VersionBadge } from '@/components/version-badge';
import type { Airline, DiscordConfig } from '@/db/schema';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface SettingsPageClientProps {
  airline: Airline;
  discordConfigData: DiscordConfig | null;
  // Future-proofing for when we have multiple tenants
  tenantUsesAltitudeSubdomain: boolean;
  authBrandingUrl: string | null;
}

type TabConfig = {
  value: string;
  label: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  component: React.ReactNode;
};

export function SettingsPageClient({
  airline,
  discordConfigData,
  tenantUsesAltitudeSubdomain,
  authBrandingUrl,
}: SettingsPageClientProps) {
  const [currentPage, setCurrentPage] = useQueryState('page', {
    defaultValue: 'general',
  });
  const isMobile = useIsMobile();

  const tabs: TabConfig[] = [
    {
      value: 'general',
      label: 'General',
      icon: <Building2 className="h-4 w-4" />,
      title: 'General Settings',
      description: "Manage your airline's basic information and configuration.",
      component: (
        <div className="space-y-6">
          <AirlineInlineForm airline={airline} />
          <div className="flex justify-end">
            <VersionBadge />
          </div>
        </div>
      ),
    },
    {
      value: 'auth',
      label: 'Login/Signup Image',
      icon: <LogIn className="h-4 w-4" />,
      title: 'Auth Branding',
      description: 'Customize the image on login and signup pages.',
      component: <AuthBrandingForm existingUrl={authBrandingUrl} />,
    },
    {
      value: 'assets',
      label: 'Assets',
      icon: <Image className="h-4 w-4" />,
      title: 'Assets',
      description: "Manage your airline's logos and branding assets.",
      component: <AssetsForm airline={airline} />,
    },
    {
      value: 'theme',
      label: 'Theme',
      icon: <Palette className="h-4 w-4" />,
      title: 'Theme Settings',
      description: 'Customize the appearance and branding of your airline.',
      component: <ThemeForm airline={airline} />,
    },
    {
      value: 'email',
      label: 'Email',
      icon: <Mail className="h-4 w-4" />,
      title: 'Email Settings',
      description:
        'Configure email server settings for notifications and communications.',
      component: (
        <SmtpForm
          airline={airline}
          tenantUsesAltitudeSubdomain={tenantUsesAltitudeSubdomain}
        />
      ),
    },
    {
      value: 'auto-approval',
      label: 'Auto-Approval',
      icon: <ShieldCheck className="h-4 w-4" />,
      title: 'PIREP Auto-Approval',
      description:
        'Automatically approve PIREPs that pass every check. Failing checks never deny a PIREP, they leave it for a reviewer.',
      component: <AutoApprovalForm airline={airline} />,
    },
    {
      value: 'webhooks',
      label: 'Webhooks',
      icon: <Webhook className="h-4 w-4" />,
      title: 'Webhook Settings',
      description:
        'Configure webhooks for external integrations and notifications.',
      component: <WebhookForm airline={airline} />,
    },
    {
      value: 'discord',
      label: 'Discord',
      icon: <MessageSquare className="h-4 w-4" />,
      title: 'Discord Bot Settings',
      description:
        'Configure your Discord bot token for automated notifications and integrations.',
      component: (
        <DiscordForm
          hasExistingToken={!!discordConfigData?.botToken}
          hasExistingClientId={!!discordConfigData?.clientId}
          existingBotToken={discordConfigData?.botToken || ''}
          existingClientId={discordConfigData?.clientId || ''}
        />
      ),
    },
    {
      value: 'api',
      label: 'API',
      icon: <Settings className="h-4 w-4" />,
      title: 'API Settings',
      description:
        'Configure external API integrations for enhanced functionality.',
      component: <InfiniteFlightForm airline={airline} />,
    },
  ];

  const activeTab = tabs.find((tab) => tab.value === currentPage) || tabs[0];

  const getTabButtonClass = (isActive: boolean) =>
    isActive
      ? 'bg-nav-hover text-foreground hover:bg-nav-hover'
      : 'text-muted-foreground hover:text-foreground hover:bg-nav-hover';

  const TabButton = ({ tab }: { tab: TabConfig }) => (
    <Button
      key={tab.value}
      variant="ghost"
      onClick={() => setCurrentPage(tab.value)}
      className={cn(
        'w-full justify-start h-auto py-3 px-4 text-left',
        getTabButtonClass(currentPage === tab.value)
      )}
    >
      {tab.icon}
      {!isMobile && tab.label}
      {isMobile && <span className="ml-2">{tab.label}</span>}
    </Button>
  );

  const Content = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{activeTab.title}</h3>
        <p className="text-sm text-muted-foreground">{activeTab.description}</p>
      </div>
      {activeTab.component}
    </div>
  );

  return (
    <PageLayout
      title="Settings"
      description="Configure your airline's settings and integrations"
    >
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        <div className="flex flex-col lg:w-64 lg:min-w-64 w-full space-y-1">
          {tabs.map((tab) => (
            <TabButton key={tab.value} tab={tab} />
          ))}
        </div>
        <div className="flex-1 outline-none lg:ml-4">
          {isMobile && <div className="pt-4 border-t border-border" />}
          <Content />
        </div>
      </div>
    </PageLayout>
  );
}
