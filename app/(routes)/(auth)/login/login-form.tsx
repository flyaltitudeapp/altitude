'use client';

import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type LoginFormInputs = {
  email: string;
  password: string;
  rememberMe: boolean;
};

interface LoginFormProps {
  lightLogo: string;
  darkLogo: string;
  authImageUrl: string | null;
}

export function LoginForm({
  lightLogo,
  darkLogo,
  authImageUrl,
}: LoginFormProps) {
  const router = useRouter();
  const [reason] = useQueryState('reason', parseAsString);
  const [emailParam] = useQueryState('email', parseAsString);
  const [passwordParam] = useQueryState('password', parseAsString);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Use airline-provided auth image when available; otherwise no desktop background
  const [bgSrc, setBgSrc] = useState<string | null>(authImageUrl);

  const form = useForm<LoginFormInputs>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });
  const { handleSubmit, control } = form;

  useEffect(() => {
    if (reason === 'unverified') {
      setErrorMessage(
        'Your account has not been verified yet. Please wait for an admin to verify your account.'
      );
      setIsError(false);
    } else if (reason === 'banned') {
      setErrorMessage(
        'Your account has been removed from the VA. Please contact an administrator for more information.'
      );
      setIsError(false);
    }
  }, [reason]);

  // Prefill form from URL parameters
  useEffect(() => {
    if (emailParam) {
      form.setValue('email', emailParam);
    }
    if (passwordParam) {
      form.setValue('password', passwordParam);
    }
  }, [emailParam, passwordParam, form]);

  const onSubmit = async (data: LoginFormInputs) => {
    const { email, password, rememberMe } = data;

    if (!(email && password)) {
      setErrorMessage('Please enter your email and password.');
      setIsError(true);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        rememberMe,
        callbackURL: '/',
      });

      if (error) {
        if (error.status === 403) {
          // Check if this is a removal error by looking at the error message
          if (
            error.message?.includes('banned') ||
            error.message?.includes('ban')
          ) {
            // Redirect to login with removed reason
            router.push('/login?reason=banned');
            return;
          } else {
            // Otherwise treat as unverified
            setErrorMessage(
              'Your account has not been verified yet. Please wait for an admin to verify your account.'
            );
            setIsError(false);
          }
        } else {
          setErrorMessage(error.message || 'Failed to sign in.');
          setIsError(true);
        }
        setIsLoading(false);
        return;
      }

      router.push('/');
    } catch {
      setErrorMessage('An error occurred during login.');
      setIsError(true);
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Mobile layout, also used on desktop when no auth image */}
      <div
        className={cn(
          'flex min-h-screen items-center justify-center bg-background',
          bgSrc ? 'md:hidden' : 'md:flex'
        )}
      >
        <div className="w-full max-w-md p-8">
          <div className="mb-8">
            <div className="flex items-center justify-center mb-1">
              <img
                src={lightLogo}
                alt="Logo (light)"
                width="auto"
                height={32}
                className="h-8 w-auto object-contain block dark:hidden"
              />
              <img
                src={darkLogo}
                alt="Logo (dark)"
                width="auto"
                height={32}
                className="h-8 w-auto object-contain hidden dark:block"
              />
            </div>
            <h1 className="mb-4 text-center font-bold text-3xl text-foreground">
              Sign In
            </h1>
          </div>

          {errorMessage &&
            (isError ? (
              <div className="mb-4 text-destructive text-center text-base font-normal">
                {errorMessage}
              </div>
            ) : reason === 'banned' ? (
              <Alert className="mb-4 border-destructive bg-destructive/10 text-destructive">
                <AlertDescription className="text-center">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="mb-4 border-success bg-success/10 text-success-foreground">
                <AlertDescription className="text-center">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            ))}

          <Form {...form}>
            <form
              className="space-y-4 mt-4 text-foreground"
              onSubmit={handleSubmit(onSubmit)}
            >
              <FormField
                control={control}
                name="email"
                rules={{ required: 'Email is required.' }}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        autoComplete="email"
                        disabled={isLoading}
                        id="email"
                        placeholder="Email"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="password"
                rules={{ required: 'Password is required.' }}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input
                          autoComplete="current-password"
                          disabled={isLoading}
                          id="password"
                          placeholder="Password"
                          type={showPassword ? 'text' : 'password'}
                          {...field}
                        />
                        <button
                          aria-label={
                            showPassword ? 'Hide password' : 'Show password'
                          }
                          className="-translate-y-1/2 absolute top-1/2 right-3 text-muted-foreground"
                          disabled={isLoading}
                          onClick={() => setShowPassword(!showPassword)}
                          type="button"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          disabled={isLoading}
                          id="remember-me"
                          onCheckedChange={(checked) =>
                            field.onChange(!!checked)
                          }
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor="remember-me"
                        className="font-medium text-foreground text-sm leading-none"
                      >
                        Remember me
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <Button className="w-full" disabled={isLoading} type="submit">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Logging in...' : 'Log In'}
              </Button>
            </form>
          </Form>

          <span className="block mt-4 text-center text-muted-foreground text-sm">
            <Link
              className="text-primary hover:underline"
              href="/reset-password/request"
            >
              Forgot your password?
            </Link>
          </span>

          <span className="block mt-4 text-center text-muted-foreground text-sm">
            Don&apos;t have an account?{' '}
            <Link className="text-primary hover:underline" href="/signup">
              Sign Up
            </Link>
          </span>
        </div>
      </div>

      {/* Desktop layout with image when airline provided one */}
      {bgSrc && (
        <div className="hidden min-h-screen bg-background md:flex">
          <div className="flex-1 md:basis-[35%] lg:basis-[30%] text-foreground flex items-center justify-center py-8 pl-16 pr-8">
            <div className="w-full max-w-md">
              <div className="mb-8">
                <div className="flex items-center mb-2">
                  <img
                    src={lightLogo}
                    alt="Logo (light)"
                    width="auto"
                    height={32}
                    className="h-8 w-auto object-contain block dark:hidden"
                  />
                  <img
                    src={darkLogo}
                    alt="Logo (dark)"
                    width="auto"
                    height={32}
                    className="h-8 w-auto object-contain hidden dark:block"
                  />
                </div>
                <h1 className="text-3xl font-bold mb-2">
                  Look who&apos;s back!
                </h1>
                <p className="text-muted-foreground text-sm">
                  Sign in to the Crew Center to track and log your flights.
                </p>
              </div>

              {errorMessage &&
                (isError ? (
                  <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
                    {errorMessage}
                  </div>
                ) : reason === 'banned' ? (
                  <Alert className="mb-6 border-red-500/30 bg-red-500/20 text-red-300">
                    <AlertDescription className="text-center">
                      {errorMessage}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="mb-6 border-green-500/30 bg-green-500/20 text-green-300">
                    <AlertDescription className="text-center">
                      {errorMessage}
                    </AlertDescription>
                  </Alert>
                ))}

              <Form {...form}>
                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <FormField
                    control={control}
                    name="email"
                    rules={{ required: 'Email is required.' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          htmlFor="email"
                          className="block text-sm font-medium text-foreground"
                        >
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="email"
                            disabled={isLoading}
                            id="email"
                            placeholder="example@email.com"
                            type="email"
                            className="w-full"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="password"
                    rules={{ required: 'Password is required.' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          htmlFor="password"
                          className="block text-sm font-medium text-foreground"
                        >
                          Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              autoComplete="current-password"
                              disabled={isLoading}
                              id="password"
                              placeholder="At least 8 characters"
                              type={showPassword ? 'text' : 'password'}
                              className="w-full pr-10"
                              {...field}
                            />
                            <button
                              aria-label={
                                showPassword ? 'Hide password' : 'Show password'
                              }
                              className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground hover:text-foreground"
                              disabled={isLoading}
                              onClick={() => setShowPassword(!showPassword)}
                              type="button"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <FormField
                      control={control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={!!field.value}
                                disabled={isLoading}
                                id="remember-me"
                                onCheckedChange={(checked) =>
                                  field.onChange(!!checked)
                                }
                              />
                            </FormControl>
                            <FormLabel
                              htmlFor="remember-me"
                              className="text-sm text-muted-foreground cursor-pointer"
                            >
                              Remember me
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <Link
                      className="text-primary hover:opacity-90 text-sm underline"
                      href="/reset-password/request"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  <Button className="w-full" disabled={isLoading} type="submit">
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogIn className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <span className="text-muted-foreground text-sm">
                  Don&apos;t have an account?{' '}
                  <Link
                    className="text-primary hover:opacity-90 underline"
                    href="/signup"
                  >
                    Apply Now
                  </Link>
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 md:basis-[61%] lg:basis-[66%] pl-6 sm:pl-10 pr-4 sm:pr-5 pt-4 pb-4 sm:py-5">
            <div className="relative w-full h-full rounded-3xl overflow-hidden">
              {bgSrc && (
                <img
                  src={bgSrc}
                  onError={() => setBgSrc(null)}
                  alt="Login background"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
