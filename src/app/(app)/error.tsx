"use client";

// שגיאה לעולם לא מוצגת כרשימה ריקה (סעיף 6 במפרט).
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6">
      <p className="font-semibold text-red-800">לא הצלחנו לטעון. נסו שוב</p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 rounded-md bg-navy-800 px-4 py-2 text-sm text-white hover:bg-navy-700"
      >
        ניסיון חוזר
      </button>
    </div>
  );
}
