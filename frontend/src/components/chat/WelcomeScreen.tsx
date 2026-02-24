"use client";

import { Crown, Diamond, Hexagon, HelpCircle, MessageSquare } from "lucide-react";

interface WelcomeScreenProps {
  onQuickAction: (message: string) => void;
}

const quickActions = [
  {
    label: "Prove I'm a Whale",
    message: "I want to prove I hold more than 100 BTC",
    icon: Crown,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    hoverBg: "hover:bg-violet-100",
  },
  {
    label: "Prove I'm a Fish",
    message: "I want to create a Fish tier credential (10-100 BTC)",
    icon: Diamond,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    hoverBg: "hover:bg-blue-100",
  },
  {
    label: "Prove I'm a Crab",
    message: "I want to prove I hold between 1-10 BTC",
    icon: Hexagon,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    hoverBg: "hover:bg-amber-100",
  },
  {
    label: "How does it work?",
    message: "How does ZKCred create privacy-preserving credentials?",
    icon: HelpCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    hoverBg: "hover:bg-emerald-100",
  },
];

export function WelcomeScreen({ onQuickAction }: WelcomeScreenProps) {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] shadow-lg mb-5">
          <MessageSquare className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-3">
          Create Your Credential
        </h1>

        <p className="text-[var(--text-secondary)] max-w-md mx-auto">
          Select a quick action below or type your request to get started.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => onQuickAction(action.message)}
              className={`group p-4 bg-white ${action.hoverBg} border border-[var(--border)] hover:border-[var(--border-hover)] rounded-2xl transition-all duration-200 text-left shadow-sm hover:shadow-md`}
            >
              <div className={`w-10 h-10 rounded-xl ${action.bgColor} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
