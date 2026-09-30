'use client';
import { cn } from '@/lib/utils';
import { motion, useSpring, useTransform } from 'motion/react';
import type { SpringOptions } from 'motion/react';
import React, { useEffect } from 'react';

export type AnimatedNumberProps = {
  value: number;
  /** З якого числа розганятись; без нього спружина стартує з value. */
  from?: number;
  /** Як показувати число; без нього toLocaleString('uk-UA'). */
  format?: (n: number) => string;
  className?: string;
  springOptions?: SpringOptions;
  as?: React.ElementType;
};

export function AnimatedNumber({
  value,
  from,
  format,
  className,
  springOptions,
  as = 'span',
}: AnimatedNumberProps) {
  const MotionComponent = motion.create(as as keyof React.JSX.IntrinsicElements);

  const spring = useSpring(from ?? value, springOptions);
  const display = useTransform(spring, (current) =>
    format ? format(current) : Math.round(current).toLocaleString('uk-UA')
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <MotionComponent className={cn('tabular-nums', className)} style={{ display: 'inline' }}>
      {display}
    </MotionComponent>
  );
}
