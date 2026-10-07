import icon from '../../resources/icon.png?asset'
import iconIco from '../../resources/icon.ico?asset'
import { isWindows } from './platform'

/** The window icon for this OS: .ico on Windows (the format the taskbar
 *  actually uses), the PNG elsewhere. */
export function platformIcon(): string {
  return isWindows ? iconIco : icon
}
