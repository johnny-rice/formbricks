"use client";

import { Logo } from "@/components/logo";
import { Navigation } from "@/components/navigation";
import { Search } from "@/components/search";
import { useIsInsideMobileNavigation, useMobileNavigationStore } from "@/hooks/use-mobile-navigation";
import clsx from "clsx";
import { type MotionStyle, motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { forwardRef } from "react";
import { Button } from "./button";
import { MobileNavigation } from "./mobile-navigation";
import { ThemeToggle } from "./theme-toggle";

function TopLevelNavItem({ href, children }: { href: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <li>
      <Link
        href={href}
        target="_blank"
        className="text-sm leading-5 text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        {children}
      </Link>
    </li>
  );
}

export const Header = forwardRef<React.ElementRef<"div">, { className?: string }>(({ className }, ref) => {
  const { isOpen: mobileNavIsOpen } = useMobileNavigationStore();
  const isInsideMobileNavigation = useIsInsideMobileNavigation();

  const { scrollY } = useScroll();
  const bgOpacityLight = useTransform(scrollY, [0, 72], [0.5, 0.9]);
  const bgOpacityDark = useTransform(scrollY, [0, 72], [0.2, 0.8]);

  return (
    <motion.div
      ref={ref}
      className={clsx(
        className,
        "fixed inset-x-0 top-0 z-50 flex h-20 items-center justify-between gap-12 px-4 transition sm:px-6 lg:left-72 lg:z-30 lg:px-8 xl:left-80",
        !isInsideMobileNavigation && "backdrop-blur-sm lg:left-72 xl:left-80 dark:backdrop-blur",
        isInsideMobileNavigation
          ? "bg-white dark:bg-slate-900"
          : "bg-white/[var(--bg-opacity-light)] dark:bg-slate-900/[var(--bg-opacity-dark)]"
      )}
      style={
        {
          "--bg-opacity-light": bgOpacityLight,
          "--bg-opacity-dark": bgOpacityDark,
        } as MotionStyle
      }>
      <div
        className={clsx(
          "absolute inset-x-0 top-full h-px transition",
          (isInsideMobileNavigation || !mobileNavIsOpen) && "bg-slate-900/7.5 dark:bg-white/7.5"
        )}
      />
      <div className="hidden md:block">
        <Search />
      </div>
      <div className="flex items-center gap-5 lg:hidden">
        <MobileNavigation NavigationComponent={Navigation} HeaderComponent={Header} />
        <Link href="/" aria-label="Home">
          <Logo className="h-8" />
        </Link>
      </div>
      <div className="flex items-center gap-6">
        <nav className="hidden lg:block">
          <ul className="flex items-center gap-8">
            <TopLevelNavItem href="https://github.com/formbricks/formbricks">
              Star us on GitHub
            </TopLevelNavItem>
          </ul>
        </nav>
        <div className="hidden md:block md:h-5 md:w-px md:bg-slate-900/10 md:dark:bg-white/15" />
        <div className="flex gap-4">
          <div className="block md:hidden">
            <Search />
          </div>
          <ThemeToggle />
        </div>
        <div className="hidden min-[416px]:contents">
          <Button href="https://app.formbricks.com/auth/signup" target="_blank" className="w-max">
            Get Started
          </Button>
        </div>
      </div>
    </motion.div>
  );
});

Header.displayName = "Header";
