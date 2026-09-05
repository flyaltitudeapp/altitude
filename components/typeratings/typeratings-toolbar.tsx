'use client';

import { Download, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import { exportTyperatingsAction } from '@/actions/typeratings/export-typeratings';
import { importTyperatingsAction } from '@/actions/typeratings/import-typeratings';
import { CreateButton } from '@/components/admin/admin-page';
import CreateTyperatingDialog from '@/components/typeratings/create-typerating-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ResponsiveDialogFooter } from '@/components/ui/responsive-dialog-footer';
import type { TyperatingImportResult } from '@/domains/typeratings/import-typeratings';
import { useResponsiveDialog } from '@/hooks/use-responsive-dialog';

export function TyperatingsToolbar() {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TyperatingImportResult | null>(null);
  const { dialogStyles } = useResponsiveDialog({
    maxWidth: 'sm:max-w-[480px]',
    baseClasses: 'max-h-[90vh] overflow-y-auto',
  });

  const { execute: runExport, isExecuting: isExporting } = useAction(
    exportTyperatingsAction,
    {
      onSuccess: ({ data }) => {
        if (!data?.success) {
          return;
        }
        const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = data.filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        toast.success('Type ratings exported');
      },
      onError: ({ error }) =>
        toast.error(error.serverError || 'Failed to export type ratings'),
    }
  );

  const { execute: runImport, isExecuting: isImporting } = useAction(
    importTyperatingsAction,
    {
      onSuccess: ({ data }) => {
        if (!data?.success) {
          return;
        }
        setImportOpen(false);
        setFile(null);
        setResult(data.result);
        router.refresh();
      },
      onError: ({ error }) =>
        toast.error(error.serverError || 'Failed to import type ratings'),
    }
  );

  const handleImport = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }
    runImport({ file });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="default"
        className="gap-1 md:gap-2"
        onClick={() => runExport()}
        disabled={isExporting}
        title="Export CSV"
      >
        <Download className="h-4 w-4" />
        <span className="hidden md:inline">
          {isExporting ? 'Exporting...' : 'Export'}
        </span>
      </Button>

      <Button
        variant="outline"
        size="default"
        className="gap-1 md:gap-2"
        onClick={() => setImportOpen(true)}
        title="Import CSV"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden md:inline">Import</span>
      </Button>

      <CreateTyperatingDialog>
        <CreateButton text="Add Type Rating" />
      </CreateTyperatingDialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent
          className={`${dialogStyles.className} max-w-[480px]`}
          style={dialogStyles.style}
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Import Type Ratings
            </DialogTitle>
            <DialogDescription className="text-foreground">
              Upload a CSV with a <code>Callsign</code> column and one column
              per type rating (matched by name) holding <code>TRUE</code> or{' '}
              <code>FALSE</code>. Only pilots and type ratings that match
              existing records are updated; everything else is ignored. Export
              first to get a template with the correct headers.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleImport} className="space-y-4">
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <ResponsiveDialogFooter
              primaryButton={{
                label: isImporting ? 'Importing...' : 'Import',
                onClick: () => handleImport(),
                disabled: isImporting,
                loading: isImporting,
                loadingLabel: 'Importing...',
              }}
              secondaryButton={{
                label: 'Cancel',
                onClick: () => setImportOpen(false),
                disabled: isImporting,
              }}
            />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={result !== null}
        onOpenChange={(open) => !open && setResult(null)}
      >
        <DialogContent
          className={`${dialogStyles.className} max-w-[440px]`}
          style={dialogStyles.style}
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Import Complete
            </DialogTitle>
            <DialogDescription className="text-foreground">
              {result?.totalRows ?? 0} row
              {result?.totalRows === 1 ? '' : 's'} processed.
            </DialogDescription>
          </DialogHeader>
          {result && (
            <dl className="space-y-2 text-sm">
              <ResultRow label="Pilots updated" value={result.usersUpdated} />
              <ResultRow
                label="Unchanged (no difference)"
                value={result.usersUnchanged}
              />
              <ResultRow
                label="Skipped (callsign not found)"
                value={result.usersSkipped}
              />
              <ResultRow
                label="Type ratings added"
                value={result.typeratingsAdded}
              />
              <ResultRow
                label="Type ratings removed"
                value={result.typeratingsRemoved}
              />
              {result.ignoredColumns.length > 0 && (
                <div className="pt-1 text-muted-foreground">
                  Ignored columns (no matching type rating):{' '}
                  {result.ignoredColumns.join(', ')}
                </div>
              )}
            </dl>
          )}
          <ResponsiveDialogFooter
            primaryButton={{
              label: 'Done',
              onClick: () => setResult(null),
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
