"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiErrorMessage, loginRequest } from "@/lib/api/client";
import styles from "./LoginForm.module.css";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(4096, "Password is too long."),
});

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values) => {
    setServerError("");
    try {
      await loginRequest(values);
    } catch (error) {
      setServerError(apiErrorMessage(error, "Unable to sign in. Please check your details and try again."));
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className={styles.heading}>
        <span className={styles.kicker}><ShieldCheck size={15} /> Secure administration</span>
        <h1>Welcome back</h1>
        <p>Sign in to manage Lambert website content and enquiries.</p>
      </div>

      {serverError ? <div className={styles.errorBanner} role="alert">{serverError}</div> : null}

      <div className={styles.fieldGroup}>
        <label htmlFor="email">Email address</label>
        <div className={`${styles.field} ${errors.email ? styles.fieldError : ""}`}>
          <Mail size={17} aria-hidden="true" />
          <input id="email" type="email" autoComplete="username" placeholder="admin@lambertelectromec.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
        </div>
        {errors.email ? <span id="email-error" className={styles.validation}>{errors.email.message}</span> : null}
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="password">Password</label>
        <div className={`${styles.field} ${errors.password ? styles.fieldError : ""}`}>
          <LockKeyhole size={17} aria-hidden="true" />
          <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} {...register("password")} />
          <button className={styles.passwordToggle} type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {errors.password ? <span id="password-error" className={styles.validation}>{errors.password.message}</span> : null}
      </div>

      <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? <span className={styles.spinner} aria-hidden="true" /> : null}
        {isSubmitting ? "Signing in…" : "Sign in securely"}
      </button>

      <p className={styles.securityNote}>Access is restricted to authorised Lambert administrators. Refresh sessions are stored in secure HttpOnly cookies.</p>
    </form>
  );
}
