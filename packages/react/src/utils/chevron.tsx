/** A left or right chevron icon, sized by the surrounding text and drawn in `currentColor`. */
export const Chevron = ({ direction }: { direction: "left" | "right" }) => (
  <svg
    aria-hidden
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
  </svg>
);
