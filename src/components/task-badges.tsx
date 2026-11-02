import { Badge } from "@/components/ui/badge";
import {
  TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, type TaskPriority, type TaskStatus,
} from "@/shared/constants";

// צבע תמיד מלווה בטקסט. כתום = הוחזרה לתיקון, ירוק = הושלמה (לפי המפרט).
const STATUS_STYLE: Record<TaskStatus, string> = {
  OPEN: "bg-gray-200 text-gray-800",
  ASSIGNED: "bg-navy-100 text-navy-800",
  IN_REVIEW: "bg-amber-100 text-amber-900",
  CHANGES_REQUESTED: "bg-orange-200 text-orange-900",
  COMPLETED: "bg-green-100 text-green-900",
};

export function TaskStatusBadge({ status }: { status: string }) {
  const known = status in TASK_STATUS_LABELS;
  return (
    <Badge variant="secondary" className={known ? STATUS_STYLE[status as TaskStatus] : ""}>
      {known ? TASK_STATUS_LABELS[status as TaskStatus] : status}
    </Badge>
  );
}

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: "text-gray-600",
  NORMAL: "text-gray-700",
  HIGH: "border-amber-500 text-amber-900",
  URGENT: "border-red-600 font-semibold text-red-800",
};

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const known = priority in TASK_PRIORITY_LABELS;
  return (
    <Badge variant="outline" className={known ? PRIORITY_STYLE[priority as TaskPriority] : ""}>
      {known ? `עדיפות ${TASK_PRIORITY_LABELS[priority as TaskPriority]}` : priority}
    </Badge>
  );
}
