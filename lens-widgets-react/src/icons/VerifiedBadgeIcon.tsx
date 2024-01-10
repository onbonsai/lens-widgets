export function VerifiedBadgeIcon({ height }: { height?: number }) {
  return (
    <svg
      style={{ height: height || iconStyle.height }} viewBox="0 0 22 22"
      fill="url(#madfiGradient)" xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="madfiGradient" gradientTransform="rotate(90)">
          <stop offset="0%" stopColor="red" />
          <stop offset="100%" stopColor="orange" />
        </linearGradient>
      </defs>
      <path
        d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  )
}

const iconStyle = {
  height: 28
}
