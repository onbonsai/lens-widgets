import { ThemeColor } from '../types'

export function NewShareIcon({
  color
}: {
  color: ThemeColor
}) {
  return (
    <svg style={iconStyle} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M8.00017 1.5891L8.40377 1.95601L12.8038 5.95601L11.9966 6.84394L8.60017 3.7563V11.2H7.40017V3.7563L4.00377 6.84394L3.19657 5.95601L7.59657 1.95601L8.00017 1.5891ZM2.40669 11.5904C2.33246 11.2322 2.28226 10.8359 2.25 10.4H3.45358C3.48255 10.7568 3.52442 11.0704 3.58173 11.347C3.71124 11.972 3.91035 12.3613 4.17471 12.6257C4.43906 12.89 4.82836 13.0891 5.45343 13.2186C6.08508 13.3495 6.91003 13.3999 8.00047 13.3999C9.0909 13.3999 9.91586 13.3495 10.5475 13.2187C11.1726 13.0892 11.5619 12.8901 11.8262 12.6257C12.0906 12.3613 12.2897 11.972 12.4192 11.347C12.4765 11.0704 12.5184 10.7568 12.5473 10.4H13.7509C13.7187 10.8359 13.6685 11.2322 13.5942 11.5904C13.4363 12.3529 13.1604 12.9886 12.6747 13.4742C12.1891 13.9599 11.5534 14.2357 10.791 14.3937C10.0351 14.5503 9.11005 14.5999 8.00046 14.5999C6.89087 14.5999 5.96581 14.5503 5.20996 14.3937C4.44752 14.2357 3.81183 13.9598 3.32619 13.4742C2.84054 12.9886 2.56466 12.3529 2.40669 11.5904Z" fill={color} />
    </svg>
  )
}

const iconStyle = {
  height: 16
}