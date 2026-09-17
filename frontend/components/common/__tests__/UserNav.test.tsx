import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { UserNav } from "@/components/common/UserNav";
import { useAuth } from "@/lib/auth-context";
import type { User } from "firebase/auth";
import type { UserProfile } from "@/lib/types";

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

function authValue(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    user: { email: "analyst@example.com" } as unknown as User,
    profile: { plan: "pro" } as unknown as UserProfile,
    loading: false,
    getIdToken: vi.fn(async () => "id-token"),
    signInWithGoogle: vi.fn(async () => undefined),
    signInWithEmail: vi.fn(async () => undefined),
    signUpWithEmail: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UserNav", () => {
  it("shows a loading placeholder while the auth session resolves", () => {
    mockUseAuth.mockReturnValue(authValue({ loading: true }));
    render(<UserNav />);
    expect(screen.getByText("Loading session...")).toBeInTheDocument();
  });

  it("renders nothing for signed-out visitors", () => {
    mockUseAuth.mockReturnValue(authValue({ user: null, profile: null }));
    render(<UserNav />);
    expect(screen.queryByText("Loading session...")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the display name and plan label when signed in", () => {
    mockUseAuth.mockReturnValue(
      authValue({
        user: { email: "analyst@example.com" } as unknown as User,
        profile: { display_name: "Analyst One", plan: "enterprise" } as unknown as UserProfile,
      })
    );
    render(<UserNav />);
    expect(screen.getByText("Analyst One")).toBeInTheDocument();
    expect(screen.getByText(/enterprise/i)).toBeInTheDocument();
  });

  it("falls back to the email prefix when no display name exists", () => {
    mockUseAuth.mockReturnValue(
      authValue({
        user: { email: "analyst@example.com" } as unknown as User,
        profile: { display_name: null, plan: "basic" } as unknown as UserProfile,
      })
    );
    render(<UserNav />);
    expect(screen.getByText("analyst")).toBeInTheDocument();
    expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
  });

  it("signs out when the sign-out button is clicked", () => {
    const signOut = vi.fn(async () => undefined);
    mockUseAuth.mockReturnValue(authValue({ signOut }));
    render(<UserNav />);

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});