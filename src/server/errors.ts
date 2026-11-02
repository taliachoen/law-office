// שגיאות עסקיות עם הודעה בעברית שמותר להציג למשתמש.

export class ForbiddenError extends Error {
  constructor(message = "אין הרשאה לבצע את הפעולה") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "הפריט לא נמצא") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ConflictError extends Error {
  constructor(message = "הפריט עודכן בחלון אחר. רעננו את הדף.") {
    super(message);
    this.name = "ConflictError";
  }
}
