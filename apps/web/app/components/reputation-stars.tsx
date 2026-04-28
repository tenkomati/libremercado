type ReputationStarsProps = {
  score: string | number;
  sizeClassName?: string;
  textClassName?: string;
};

export function ReputationStars({
  score,
  sizeClassName = "text-base",
  textClassName = "text-sm text-[var(--muted)]"
}: ReputationStarsProps) {
  const numericScore = Math.max(0, Math.min(5, Number(score)));

  return (
    <div className="flex items-center gap-2">
      <div
        aria-label={`Reputación ${numericScore.toFixed(1)} de 5`}
        className={`flex items-center gap-0.5 text-[#f5b301] ${sizeClassName}`}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index}>{numericScore >= index + 0.5 ? "★" : "☆"}</span>
        ))}
      </div>
      <span className={textClassName}>{numericScore.toFixed(2)} / 5</span>
    </div>
  );
}
