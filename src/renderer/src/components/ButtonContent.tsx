import type { ComponentType, ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string
  strokeWidth?: number | string
}

interface Props {
  icon: ComponentType<IconProps>
  children: ReactNode
}

/** Icon + label as direct children of the button for one flex alignment context. */
export function ButtonContent({ icon: Icon, children }: Props) {
  return (
    <>
      <Icon className="btn-icon" size={14} aria-hidden="true" />
      <span className="btn-label">{children}</span>
    </>
  )
}
