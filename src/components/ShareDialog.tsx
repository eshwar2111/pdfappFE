import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '@/api/client';
import { sharesApi } from '@/api/endpoints';
import { Alert, Badge, Button, Input, Modal, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/format';
import type { Permission, Share, ShareCreated } from '@/types/api';

const SHAREABLE: Permission[] = ['VIEW', 'COMMENT', 'CHAT'];

export function ShareDialog({
  documentId,
  isOpen,
  onClose,
}: {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [shares, setShares] = useState<Share[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>(SHAREABLE);
  const [invitedEmail, setInvitedEmail] = useState('');
  const [created, setCreated] = useState<ShareCreated | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setShares(await sharesApi.list(documentId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load share links.');
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  const create = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await sharesApi.create(documentId, {
        permissions,
        invited_email: invitedEmail.trim() || null,
      });
      setCreated(result);
      setInvitedEmail('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the link.');
    } finally {
      setIsCreating(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const revoke = async (shareId: string) => {
    await sharesApi.revoke(documentId, shareId);
    await load();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share this document">
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}

        {created ? (
          <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-medium text-emerald-800">Link created</p>
            <p className="text-xs text-emerald-700">
              Anyone with this link can open the document — no account needed. Copy it now: for security,
              only a hash of the token is stored, so it cannot be shown again.
            </p>
            <div className="flex gap-2">
              <input readOnly value={created.url} className="input font-mono text-xs" />
              <Button size="sm" onClick={() => void copy()}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setCreated(null)}>
              Create another
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="label">This link allows</span>
              <div className="flex flex-wrap gap-2">
                {SHAREABLE.map((permission) => {
                  const isSelected = permissions.includes(permission);
                  return (
                    <button
                      key={permission}
                      type="button"
                      onClick={() =>
                        setPermissions((prev) =>
                          // VIEW is the floor — a link that grants nothing is meaningless.
                          permission === 'VIEW'
                            ? prev
                            : isSelected
                              ? prev.filter((p) => p !== permission)
                              : [...prev, permission],
                        )
                      }
                      disabled={permission === 'VIEW'}
                      className={
                        isSelected
                          ? 'rounded-lg border border-brand-500 bg-brand-50 px-3 py-1.5 text-sm text-brand-700'
                          : 'rounded-lg border border-surface-border px-3 py-1.5 text-sm text-ink-muted'
                      }
                    >
                      {permission === 'VIEW' ? 'View' : permission === 'COMMENT' ? 'Comment' : 'AI chat'}
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              label="Invitee email (optional)"
              type="email"
              placeholder="colleague@example.com"
              value={invitedEmail}
              onChange={(event) => setInvitedEmail(event.target.value)}
              hint="Recorded for your reference. Email delivery is not enabled — send the link yourself."
            />

            <Button isLoading={isCreating} onClick={() => void create()} className="w-full">
              Generate share link
            </Button>
          </div>
        )}

        <div>
          <p className="label">Existing links</p>
          {isLoading ? (
            <Spinner label="Loading" />
          ) : shares.length === 0 ? (
            <p className="text-sm text-ink-subtle">No links yet.</p>
          ) : (
            <ul className="space-y-2">
              {shares.map((share) => (
                <li
                  key={share.id}
                  className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      {share.permissions
                        .filter((p) => p !== 'MANAGE')
                        .map((p) => (
                          <Badge key={p}>{p.toLowerCase()}</Badge>
                        ))}
                      {share.revoked_at && <Badge tone="danger">revoked</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-subtle">
                      {share.invited_email ? `${share.invited_email} · ` : ''}
                      created {formatDate(share.created_at)}
                    </p>
                  </div>
                  {!share.revoked_at && (
                    <Button size="sm" variant="ghost" onClick={() => void revoke(share.id)}>
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
