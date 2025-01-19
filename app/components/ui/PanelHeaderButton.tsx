import { type HTMLMotionProps, motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';

interface PanelHeaderButtonProps extends HTMLMotionProps<'button'> {
  active?: boolean;
  disabled?: boolean;
}

export function PanelHeaderButton({ active, disabled, className, children, ...props }: PanelHeaderButtonProps) {
  return (
    <motion.button
      {...props}
      disabled={disabled}
      className={classNames(
        'px-2 py-1 rounded-md transition-all duration-200 flex items-center gap-1.5 text-sm font-normal',
        {
          'bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3':
            !Boolean(active),
          'bg-bolt-elements-accent text-white': Boolean(active),
          'opacity-50 cursor-not-allowed': Boolean(disabled),
          'hover:shadow-sm': !Boolean(disabled),
        },
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
