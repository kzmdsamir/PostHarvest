import { render, screen, fireEvent } from "@testing-library/react";
import type { MouseEvent, ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppSidebar } from "@/components/common/AppSidebar";

const { mockPathname, mockRouterReplace } = vi.hoisted(() => ({
  mockPathname: vi.fn(() => "/"),
  mockRouterReplace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname() as string,
  useRouter: () => ({ replace: mockRouterReplace, push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string;
    children: ReactNode;
    onClick?: (event: MouseEvent) => void;
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

// framer-motion's AnimatePresence keeps exiting nodes mounted until the exit
// animation completes; for unit tests render children synchronously.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  motion: {
    div: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    profile: null,
    loading: false,
    getIdToken: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signOut: vi.fn(),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockPathname.mockReturnValue("/");
});

describe("AppSidebar", () => {
  it("renders the primary navigation links", () => {
    render(<AppSidebar />);
    for (const label of ["Home", "Investigation", "Pricing", "History", "Saved accounts", "Settings"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /docs/i })).toBeInTheDocument();
  });

  it("marks the active route with aria-current", () => {
    mockPathname.mockReturnValue("/history");
    render(<AppSidebar />);
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("toggles the docs dropdown open and closed", () => {
    render(<AppSidebar />);
    const docsButton = screen.getByRole("button", { name: /docs/i });
    expect(screen.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();

    fireEvent.click(docsButton);
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quickstart" })).toBeInTheDocument();

    fireEvent.click(docsButton);
    expect(screen.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();
  });

  it("auto-expands the docs dropdown while on a docs route", () => {
    mockPathname.mockReturnValue("/docs");
    render(<AppSidebar />);
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
  });

  it("calls onNavigate when a section link is clicked", () => {
    const onNavigate = vi.fn();
    render(<AppSidebar onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("link", { name: "History" }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("invokes router.replace when home is clicked with piped params on the same route", () => {
    mockPathname.mockReturnValue("/");
    // Simulate a query string on the current location.
    window.history.replaceState({}, "", "/?page=2");
    render(<AppSidebar />);
    fireEvent.click(screen.getByRole("link", { name: "Home" }));
    expect(mockRouterReplace).toHaveBeenCalledWith("/");
    window.history.replaceState({}, "", "/");
  });
});