import { motion } from 'framer-motion';
import type { ElementType, ReactNode } from 'react';

type TextEffectProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  preset?: 'fade' | 'slide' | 'blur';
  per?: 'word' | 'char';
  delay?: number;
  once?: boolean;
};

const presets = {
  fade: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
  },
  slide: {
    initial: { opacity: 0, x: -12, y: 6 },
    animate: { opacity: 1, x: 0, y: 0 },
  },
  blur: {
    initial: { opacity: 0, filter: 'blur(6px)', y: 8 },
    animate: { opacity: 1, filter: 'blur(0px)', y: 0 },
  },
} as const;

export default function TextEffect({
  children,
  className = '',
  as: Component = 'span',
  preset = 'fade',
  per = 'word',
  delay = 0,
  once = true,
}: TextEffectProps) {
  if (typeof children !== 'string' && typeof children !== 'number') {
    return <Component className={className}>{children}</Component>;
  }

  const text = String(children);
  const segments = per === 'char' ? Array.from(text) : text.split(/(\s+)/);

  return (
    <Component className={className}>
      {segments.map((segment, index) => {
        const isWhitespace = /^\s+$/.test(segment);
        const spanClass = isWhitespace ? 'inline' : 'inline-block';

        return (
          <motion.span
            key={`${segment}-${index}`}
            className={spanClass}
            initial={presets[preset].initial}
            whileInView={presets[preset].animate}
            viewport={{ once, amount: 0.35 }}
            transition={{ duration: 0.42, delay: delay + index * 0.04, ease: 'easeOut' }}
          >
            {segment}
          </motion.span>
        );
      })}
    </Component>
  );
}
