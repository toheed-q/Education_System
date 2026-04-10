import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import logo from "@assets/Lernentech_logo_1768655383502.png";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { useEffect } from "react";

const loginSchema = z.object({
  username: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name is required"),
  role: z.enum(["student", "tutor"]),
});

function RegisterVerification({ email, onBack }: { email: string, onBack: () => void }) {
  const { verifyOtp, isVerifying, verifyOtpError, resendOtp, isResendingOtp } = useAuth();
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    try {
      await verifyOtp({ email, otp });
    } catch (err) {
      console.error(err);
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp(email);
      setCooldown(60);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card className="w-full max-w-md border-slate-100 shadow-xl">
      <CardHeader className="text-center space-y-4 pb-8">
        <Link href="/">
          <img src={logo} alt="LernenTech" className="h-12 mx-auto cursor-pointer" />
        </Link>
        <div className="space-y-2">
          <CardTitle className="text-2xl font-bold font-display text-slate-900">Verify your email</CardTitle>
          <CardDescription>
            Account requires verification. We've sent a code to <span className="font-semibold">{email}</span>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <InputOTP 
            maxLength={6} 
            value={otp} 
            onChange={setOtp}
            onComplete={handleVerify}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          
          {verifyOtpError && (
            <p className="text-sm text-red-500 font-medium">{verifyOtpError.message}</p>
          )}
        </div>

        <Button 
          onClick={handleVerify}
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isVerifying || otp.length !== 6}
        >
          {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Verify & Sign In
        </Button>

        <div className="text-center">
          <button 
            onClick={handleResend}
            disabled={cooldown > 0 || isResendingOtp}
            className="text-sm text-slate-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't receive a code? Resend"}
            {isResendingOtp && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
          </button>
        </div>
      </CardContent>
      <CardFooter className="justify-center border-t border-slate-50 pt-6">
        <button 
          onClick={onBack}
          className="text-sm text-slate-500 hover:underline"
        >
          Back to login
        </button>
      </CardFooter>
    </Card>
  );
}

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export function Login() {
  const { login, isLoggingIn, loginError, loginWithGoogle, isLoggingInWithGoogle } = useAuth();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginData) => {
    try {
      const result = await login(data);
      if (result?.requiresVerification) {
        setEmail(result.email);
        setStep("otp");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (step === "otp") {
    return <RegisterVerification email={email} onBack={() => setStep("form")} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-100 shadow-xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <Link href="/">
            <img src={logo} alt="LernenTech" className="h-12 mx-auto cursor-pointer" />
          </Link>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold font-display text-slate-900">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("username")} />
              {errors.username && <p className="text-sm text-red-500">{errors.username.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            
            {loginError && (
              <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
                {loginError.message}
              </div>
            )}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoggingIn}>
              {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full border-slate-200"
            onClick={() => loginWithGoogle(undefined)}
            disabled={isLoggingIn || isLoggingInWithGoogle}
          >
            {isLoggingInWithGoogle ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.53 12-4.53z"
              />
            </svg>
            Google
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-slate-500">
            Don't have an account? <Link href="/register" className="text-blue-600 font-semibold hover:underline">Sign up</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export function Register() {
  const { 
    register: registerAuth, 
    isRegistering, 
    registerError, 
    loginWithGoogle, 
    isLoggingInWithGoogle,
    verifyOtp,
    isVerifying,
    verifyOtpError,
    resendOtp,
    isResendingOtp
  } = useAuth();
  
  const [role, setRole] = useState<"student" | "tutor">("student");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);
  
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "student" }
  });

  const onSubmit = async (data: RegisterData) => {
    try {
      console.log("[AUTH] Submitting registration for:", data.email);
      const result: any = await registerAuth({ ...data, role });
      console.log("[AUTH] Received registration result:", result);
      
      if (result && result.requiresVerification) {
        console.log("[AUTH] OTP required, switching to verification view");
        setEmail(result.email);
        setStep("otp");
      } else {
        console.warn("[AUTH] Registration succeeded but no verification required flag found. Result:", result);
      }
    } catch (err) {
      console.error("[AUTH] Registration form submission error:", err);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    try {
      await verifyOtp({ email, otp });
    } catch (err) {
      console.error(err);
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp(email);
      setCooldown(60);
    } catch (err) {
      console.error(err);
    }
  };

  if (step === "otp") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-md border-slate-100 shadow-xl">
          <CardHeader className="text-center space-y-4 pb-8">
            <Link href="/">
              <img src={logo} alt="LernenTech" className="h-12 mx-auto cursor-pointer" />
            </Link>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold font-display text-slate-900">Verify your email</CardTitle>
              <CardDescription>
                We've sent a 6-digit verification code to <span className="font-semibold">{email}</span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <InputOTP 
                maxLength={6} 
                value={otp} 
                onChange={setOtp}
                onComplete={handleVerify}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              
              {verifyOtpError && (
                <p className="text-sm text-red-500 font-medium">{verifyOtpError.message}</p>
              )}
            </div>

            <Button 
              onClick={handleVerify}
              className={`w-full ${role === 'tutor' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              disabled={isVerifying || otp.length !== 6}
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify & Create Account
            </Button>

            <div className="text-center">
              <button 
                onClick={handleResend}
                disabled={cooldown > 0 || isResendingOtp}
                className="text-sm text-slate-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't receive a code? Resend"}
                {isResendingOtp && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
              </button>
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t border-slate-50 pt-6">
            <button 
              onClick={() => setStep("form")}
              className="text-sm text-slate-500 hover:underline"
            >
              Back to signup
            </button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-md border-slate-100 shadow-xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <Link href="/">
            <img src={logo} alt="LernenTech" className="h-12 mx-auto cursor-pointer" />
          </Link>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold font-display text-slate-900">Create an account</CardTitle>
            <CardDescription>Join our learning community today</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
                role === "student" 
                  ? "bg-blue-50 border-blue-200 text-blue-700" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              I'm a Student
            </button>
            <button
              type="button"
              onClick={() => setRole("tutor")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
                role === "tutor" 
                  ? "bg-orange-50 border-orange-200 text-orange-700" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              I'm a Tutor
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" {...register("name")} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            {registerError && (
              <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
                {registerError.message}
              </div>
            )}

            <Button 
              type="submit" 
              className={`w-full ${role === 'tutor' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`} 
              disabled={isRegistering}
            >
              {isRegistering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Account
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or join with</span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full border-slate-200"
            onClick={() => loginWithGoogle(role)}
            disabled={isRegistering || isLoggingInWithGoogle}
          >
            {isLoggingInWithGoogle ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.53 12-4.53z"
              />
            </svg>
            Google
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-slate-500">
            Already have an account? <Link href="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
