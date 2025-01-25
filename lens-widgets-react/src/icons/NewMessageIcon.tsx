import { ThemeColor } from '../types'

export function NewMessageIcon({
  color
}: {
  color: ThemeColor
}) {
  return (
    <svg style={iconStyle} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M1.40039 6.80004C1.40039 3.8177 3.81805 1.40004 6.80039 1.40004H8.91116C12.0532 1.40004 14.6004 3.9472 14.6004 7.08927C14.6004 9.10533 13.5334 10.9708 11.7957 11.993L7.5046 14.5172L6.60039 15.0491V14V12.1964C3.71071 12.0912 1.40039 9.71542 1.40039 6.80004ZM6.80039 2.60004C4.4808 2.60004 2.60039 4.48044 2.60039 6.80004C2.60039 9.11964 4.4808 11 6.80039 11H7.20039H7.80039V11.6V12.951L11.1873 10.9587C12.5585 10.1521 13.4004 8.6801 13.4004 7.08927C13.4004 4.60994 11.3905 2.60004 8.91116 2.60004H6.80039Z" fill={color} />
    </svg>

  )
}

const iconStyle = {
  height: 16
}