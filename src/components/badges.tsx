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

export function ClientTypeBadge({ type }: { type: string }) {
  return <Badge variant="outline">{type in CLIENT_TYPE_LABELS ? CLIENT_TYPE_LABELS[type as ClientType] : type}</Badge>;
}
