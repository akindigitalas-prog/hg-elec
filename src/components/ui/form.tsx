import * as React from 'react';
import { Controller, type FieldPath, type FieldValues, FormProvider } from 'react-hook-form';

import { cn } from '@/lib/utils';

const Form = FormProvider;

const FormField = ({
  name,
  control,
  render,
}: {
  name: string;
  control: any;
  render: any;
}) => {
  return <Controller name={name} control={control} render={render} />;
};

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-2', className)} {...props} />
));
FormItem.displayName = 'FormItem';

const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-medium leading-none', className)}
    {...props}
  />
));
FormLabel.displayName = 'FormLabel';

const FormControl = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('relative', className)} {...props} />
));
FormControl.displayName = 'FormControl';

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
FormDescription.displayName = 'FormDescription';

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm font-medium text-destructive', className)}
    {...props}
  />
));
FormMessage.displayName = 'FormMessage';

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
};

