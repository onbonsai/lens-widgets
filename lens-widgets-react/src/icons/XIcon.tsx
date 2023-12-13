import { ThemeColor } from '../types'

export function XIcon({
  color
}: {
  color: ThemeColor
}) {
  return (
    <svg style={iconStyle} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
      <path stroke={color} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

const iconStyle = {
  height: 18
}