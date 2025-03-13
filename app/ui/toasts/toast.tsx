"use client";

import React from "react";
import { toast as sonnerToast } from "sonner";

export function toast(toast: Omit<ToastProps, "id"> | string) {
  // if (typeof toast === "string") {
  //   return sonnerToast(toast);
  // }
  return sonnerToast.custom((id) => (
    <Toast
      id={id}
      title={typeof toast === "string" ? toast : toast.title}
      description={typeof toast === "string" ? undefined : toast.description}
    />
  ));
}

function Toast(props: ToastProps) {
  const { title, description } = props;

  return (
    <div
      className="bg-primary-900/90 backdrop-blur-sm px-5 py-3 rounded-md shadow-md font-inter"
      style={{ minWidth: "var(--width)" }}
    >
      <div className="flex flex-1 items-center">
        <div className="w-full">
          <p className="font-medium text-white">{title}</p>
          {description && (
            <p className="mt-1 text-sm text-white/60">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface ToastProps {
  id: string | number;
  title: string;
  description?: string;
}
