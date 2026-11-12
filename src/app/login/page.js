import Image from "next/image";
import GuestGuard from "@/components/auth/GuestGuard";
import LoginForm from "@/components/auth/LoginForm";
import ThemeToggle from "@/components/theme/ThemeToggle";
import styles from "./page.module.css";

export const metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <GuestGuard>
      <main className={styles.page}>
        <div className={styles.themeControl}><ThemeToggle /></div>

        <section className={styles.brandPanel} aria-label="Lambert administration portal">
          <div className={styles.gridPattern} aria-hidden="true" />
          <div className={styles.brandContent}>
            <div className={styles.brandTop}>
              <span className={styles.logoSurface}>
                <Image src="/images/brand/lambert-logo.png" alt="Lambert Electromec" width={190} height={57} priority />
              </span>
            </div>

            <div className={styles.copy}>
              <span>Administration Portal</span>
              <h2>Manage Lambert’s website from one secure workspace.</h2>
              <p>Projects, Media Center resources, enquiries and website configuration will be managed here.</p>
            </div>

            <div className={styles.brandFoot}>
              <span className={styles.statusDot} aria-hidden="true" />
              Lambert Electromec Limited
            </div>
          </div>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.formBackdrop} aria-hidden="true" />
          <div className={styles.formWrap}><LoginForm /></div>
        </section>
      </main>
    </GuestGuard>
  );
}
