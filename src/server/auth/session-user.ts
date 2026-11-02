import type { Role } from "@/shared/constants";

/** המשתמש הנוכחי כפי שהשירותים וההרשאות רואים אותו. */
export type SessionUser = {
  id: string;
  orgId: string;
  name: string;
  role: Role;
};
