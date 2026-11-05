import { Badge } from "@/components/ui/badge";
import { CASE_STATUS_LABELS, CLIENT_TYPE_LABELS, type CaseStatus, type ClientType } from "@/shared/constants";

// הצבע תמיד מלווה בטקסט (נגישות). ירוק שמור ל"הושלם/אומת", ולכן תיק פעיל הוא כחול.
const CASE_STATUS_STYLE: Record<CaseStatus, string> = {
  ACTIVE: "bg-navy-100 text-navy-800",
  PENDING: "bg-amber-100 text-amber-900",
  CLOSED: "bg-gray-200 text-gray-700",
};

export function CaseStatusBadge({ status }: { status: string }) {
  const known = status in CASE_STATUS_LABELS;
  return (
    <Badge variant="secondary" className={known ? CASE_STATUS_STYLE[status as CaseStatus] : ""}>
      {known ? CASE_STATUS_LABELS[status as CaseStatus] : status}
    </Badge>
  );
}

// צבע תמיד מלווה בטקסט. הרשימה ניתנת להגדרה, ולכן קוד לא מוכר מקבל מסגרת בלבד.
const CONTACT_STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-navy-100 text-navy-800",
  AWAITING_CLIENT: "bg-amber-100 text-amber-900",
  UNAVAILABLE: "bg-orange-100 text-orange-900",
  TREATMENT_ENDED: "bg-gray-200 text-gray-700",
};

export function ContactStatusBadge({ code, label }: { code: string; label: string }) {
  const style = CONTACT_STATUS_STYLE[code];
  return style ? <Badge variant="secondary" className={style}>{label}</Badge> : <Badge variant="outline">{label}</Badge>;
}

export function ClientTypeBadge({ type }: { type: string }) {
  return <Badge variant="outline">{type in CLIENT_TYPE_LABELS ? CLIENT_TYPE_LABELS[type as ClientType] : type}</Badge>;
}
