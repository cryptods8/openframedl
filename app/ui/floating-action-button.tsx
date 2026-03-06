"use client";

import { PlusIcon } from "@heroicons/react/16/solid";
import Link from "next/link";
import { useBottomOffset } from "@/app/ui/bottom-nav";

interface FloatingActionButtonProps {
  href: string;
  className?: string;
}

export function FloatingActionButton({ href, className = "" }: FloatingActionButtonProps) {
  const bottomOffset = useBottomOffset();

  return (
    <Link
      href={href}
      className={`
        fixed right-6 z-50
        w-14 h-14
        bg-primary-500 hover:bg-primary-600
        text-white
        rounded-full
        shadow-lg hover:shadow-xl
        flex items-center justify-center
        transition-all duration-200
        hover:scale-105
        active:scale-95
        ${className}
      `}
      style={{ bottom: bottomOffset + 16 }}
      aria-label="Create new arena"
    >
      <PlusIcon className="size-6" />
    </Link>
  );
}
