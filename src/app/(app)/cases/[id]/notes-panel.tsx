import { Badge } from "@/components/ui/badge";
import { CASE_NOTE_KIND_LABELS, type CaseNoteKind } from "@/shared/constants";
import { dateToIsraelLocal, formatDateTimeHe } from "@/shared/dates";
import { DeleteNoteButton, NoteFormDialog } from "./note-dialogs";

export type NoteRow = {
  id: string;
  version: number;
  kind: CaseNoteKind;
  occurredAt: Date;
  participants: string | null;
  body: string;
  createdBy: { name: string };
  canEdit: boolean;
  canDelete: boolean;
};

/** רשימת תיעודים. בסקירה (compact) מוצג תקציר בלי כפתורים. */
export function NotesList({ caseId, notes, compact = false, emptyText }: {
  caseId: string; notes: NoteRow[]; compact?: boolean; emptyText: string;
}) {
  if (notes.length === 0) {
    return <p className={compact ? "text-sm text-gray-600" : "rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600"}>{emptyText}</p>;
  }
  return (
    <ul className={compact ? "divide-y divide-gray-100" : "space-y-3"}>
      {notes.map((n) => (
        <li key={n.id} className={compact ? "py-2" : "rounded-lg border border-gray-200 bg-white p-4"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <Badge variant="outline">{CASE_NOTE_KIND_LABELS[n.kind]}</Badge>
              <span>{formatDateTimeHe(n.occurredAt)}</span>
              {n.participants && <span>· {n.participants}</span>}
              <span>· {n.createdBy.name}</span>
            </div>
            {!compact && (n.canEdit || n.canDelete) && (
              <div className="flex gap-2">
                {n.canEdit && (
                  <NoteFormDialog
                    caseId={caseId}
                    note={{
                      id: n.id, version: n.version, kind: n.kind, occurredAt: dateToIsraelLocal(n.occurredAt),
                      participants: n.participants, body: n.body,
                    }}
                  />
                )}
                {n.canDelete && <DeleteNoteButton noteId={n.id} caseId={caseId} />}
              </div>
            )}
          </div>
          <p className={`mt-1 whitespace-pre-line ${compact ? "line-clamp-2 text-sm" : ""}`}>{n.body}</p>
        </li>
      ))}
    </ul>
  );
}
