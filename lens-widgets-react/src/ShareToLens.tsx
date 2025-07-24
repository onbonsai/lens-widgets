import LensIcon from './LensIcon'
import { Theme, Size } from './types' 
import { getContainerStyle, getTextStyle } from './utils'

export function ShareToLens({
  content,
  url,
  via,
  hashtags,
  theme = Theme.dark,
  size = Size.medium,
  title = 'Share to Lens',
  containerStyle,
  textStyle,
  icon,
  iconBackgroundColor,
  iconForegroundColor
} : {
  content: string,
  url?: string,
  via?: string,
  hashtags?: string,
  theme?: Theme,
  size?: Size,
  title?: string,
  containerStyle?: any,
  textStyle?: any,
  icon?: any,
  iconBackgroundColor?: string,
  iconForegroundColor?: string
}) {
  function navigate() {
    let shareUrl = `https://hey.xyz/?text=${encodeURIComponent(content)}`
    if (url) {
      shareUrl = shareUrl + `&url=${url}`
    }
    if (via) {
      shareUrl = shareUrl + `&via=${encodeURIComponent(via)}`
    }
    if (hashtags) {
      shareUrl = shareUrl + `&hashtags=${hashtags}`
    }
    window.open(shareUrl, '_newtab')
  }

  return (
    <button onClick={navigate} style={containerStyle || getContainerStyle(theme, size)}>
      { icon || (
        <LensIcon
          theme={theme}
          size={size}
          iconBackgroundColor={iconBackgroundColor}
          iconForegroundColor={iconForegroundColor}
        />
      ) }
      <p style={textStyle || getTextStyle(theme, size)}>{title}</p>
    </button>
  )
}