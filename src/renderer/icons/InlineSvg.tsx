/**
 * Internal renderer for trusted, build-time-bundled SVG strings (agent logos
 * from src/renderer/assets/agents/*.svg via ?raw, material file icons from
 * file-icons.generated.ts). Never feed it runtime/user-supplied markup.
 *
 * The wrapper span is exactly `size`×`size`; icons.css makes the svg fill it.
 * font-size is set too because the agent logos declare width/height="1em".
 * Icons are decorative (aria-hidden) — rows always carry their own text.
 */
import type { CSSProperties, FC } from 'react';

export interface InlineSvgProps {
  svg: string;
  size?: number;
  className?: string;
}

export const InlineSvg: FC<InlineSvgProps> = ({ svg, size = 16, className }) => {
  const style: CSSProperties = { width: size, height: size, fontSize: size };
  return (
    <span
      className={className ? `gmux-icon ${className}` : 'gmux-icon'}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
