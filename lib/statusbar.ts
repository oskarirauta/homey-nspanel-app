import { Color } from './color';

export interface StatusBarIcon {
  icon: string | undefined;
  color: string | Color.RGB | undefined;
  large: boolean | undefined;
}
