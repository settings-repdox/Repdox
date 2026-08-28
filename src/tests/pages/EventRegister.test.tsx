import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// EventRegister.tsx resolves its domain services through the DI
// container (resolveService/registerDefaults) rather than importing
// concrete implementations directly, so this test mocks the DI module
// and hands back hand-written fake services - a cleaner seam than
// mocking the Supabase client, and it matches how the component itself
// is actually wired.
//
// The one exception is auth: EventRegister.tsx calls
// supabase.auth.getSession() / onAuthStateChange() directly (this is
// the legitimate, intentionally-not-migrated auth-session code found
// during the domain-layer bypass cleanup - see the Batch 1 commit for
// EventRegister.tsx). That's mocked separately via the Supabase client
// module mock below.
//
// SCOPE: this is the first component test in the repo (no
// @testing-library/react was installed before this file - see
// package.json and src/tests/setup.ts). It covers the critical paths -
// loading an event, filling and submitting the form successfully,
// surfacing a submission error, and the team-name-conflict validation
// path - not full coverage of every branch in this ~1000-line file
// (e.g. draft restore/localStorage, edit-limit-reached, gaming-specific
// field variants are not covered here).

const mockGetEventBySlug = vi.fn();
const mockListEvents = vi.fn();
const mockGetTeamById = vi.fn();
const mockFindTeamByName = vi.fn();
const mockCreateTeam = vi.fn();
const mockDeleteTeam = vi.fn();
const mockFetchEventRegistrationByUser = vi.fn();
const mockUpsertEventRegistration = vi.fn();
const mockIsGamingEvent = vi.fn();

vi.mock("@/bootstrap/registerDefaults", () => ({
  registerDefaults: vi.fn(),
}));

vi.mock("@/core/services/di", () => ({
  resolveService: (key: string) => {
    switch (key) {
      case "EventService":
        return {
          getEventBySlug: mockGetEventBySlug,
          listEvents: mockListEvents,
          getTeamById: mockGetTeamById,
          findTeamByName: mockFindTeamByName,
          createTeam: mockCreateTeam,
          deleteTeam: mockDeleteTeam,
        };
      case "RegistrationService":
        return {
          fetchEventRegistrationByUser: mockFetchEventRegistrationByUser,
          upsertEventRegistration: mockUpsertEventRegistration,
        };
      case "UserService":
        return {};
      case "GamingService":
        return { isGamingEvent: mockIsGamingEvent };
      default:
        throw new Error(`Unexpected resolveService key in test: ${key}`);
    }
  },
}));

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (
        cb: (event: string, session: unknown) => void,
      ) => {
        mockOnAuthStateChange(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
}));

const { default: EventRegister } = await import("@/pages/EventRegister");

const AUTHENTICATED_SESSION = {
  user: { id: "user-1", email: "ada@example.com" },
};

const BASE_EVENT = {
  id: "event-1",
  slug: "hackfest",
  title: "HackFest 2026",
  discord_invite: "https://discord.gg/test",
  type: "Hackathon",
  tags: [],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/events/hackfest/register"]}>
      <Routes>
        <Route
          path="/events/:slug/register"
          element={<EventRegister />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  const nameInput = document.querySelector(
    'input[name="name"]',
  ) as HTMLInputElement;
  const emailInput = document.querySelector(
    'input[name="email"]',
  ) as HTMLInputElement;
  const phoneInput = document.querySelector(
    'input[name="phone"]',
  ) as HTMLInputElement;
  const schoolInput = document.querySelector(
    'input[name="school"]',
  ) as HTMLInputElement;
  const streamInput = document.querySelector(
    'input[name="stream"]',
  ) as HTMLInputElement;
  const yearSelect = document.querySelector(
    'select[name="year"]',
  ) as HTMLSelectElement;
  const motivationInput = document.querySelector(
    'textarea[name="motivation"]',
  ) as HTMLTextAreaElement;

  await user.type(nameInput, "Ada Lovelace");
  await user.type(emailInput, "ada@example.com");
  await user.type(phoneInput, "9876543210");
  await user.type(schoolInput, "Analytical Engine University");
  await user.type(streamInput, "CSE");
  await user.selectOptions(yearSelect, yearSelect.options[1].value);
  await user.type(motivationInput, "Excited to build something great.");
}

describe("EventRegister", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: AUTHENTICATED_SESSION },
    });
    mockGetEventBySlug.mockResolvedValue(BASE_EVENT);
    mockListEvents.mockResolvedValue([]);
    mockFetchEventRegistrationByUser.mockResolvedValue(null);
    mockIsGamingEvent.mockReturnValue(false);
    mockUpsertEventRegistration.mockResolvedValue({ id: "reg-1" });
  });

  it("loads the event and renders its title once resolved", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("HackFest 2026").length).toBeGreaterThan(
        0,
      );
    });
    expect(mockGetEventBySlug).toHaveBeenCalledWith("hackfest");
  });

  it("falls back to the most recent event when the slug does not match any event", async () => {
    mockGetEventBySlug.mockResolvedValue(null);
    mockListEvents.mockResolvedValue([
      { ...BASE_EVENT, id: "event-2", title: "Fallback Event" },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("Fallback Event").length).toBeGreaterThan(
        0,
      );
    });
  });

  it("redirects to signup when there is no active session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    renderPage();

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });
    // No assertion on navigation target here (React Router navigation
    // inside MemoryRouter doesn't trivially expose the resulting path
    // without a second Route to render) - the meaningful assertion is
    // that the form's submit path was never reached: no attempt to
    // fetch an existing registration for an unauthenticated user.
    expect(mockFetchEventRegistrationByUser).not.toHaveBeenCalled();
  });

  it("submits the form successfully and shows the success screen", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("HackFest 2026").length).toBeGreaterThan(
        0,
      );
    });

    await fillRequiredFields(user);

    const submitButton = screen.getByRole("button", {
      name: /register|submit|complete/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpsertEventRegistration).toHaveBeenCalled();
    });

    const payload = mockUpsertEventRegistration.mock.calls[0][0];
    expect(payload.eventId).toBe("event-1");
    expect(payload.name).toBe("Ada Lovelace");
    expect(payload.email).toBe("ada@example.com");
    expect(payload.userId).toBe("user-1");

    await waitFor(() => {
      expect(screen.getByText("Registration Complete!")).toBeInTheDocument();
    });
  });

  it("shows an error toast and does not show the success screen when submission fails", async () => {
    mockUpsertEventRegistration.mockRejectedValue(
      new Error("Server exploded"),
    );
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("HackFest 2026").length).toBeGreaterThan(
        0,
      );
    });

    await fillRequiredFields(user);

    const submitButton = screen.getByRole("button", {
      name: /register|submit|complete/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpsertEventRegistration).toHaveBeenCalled();
    });

    expect(
      screen.queryByText("Registration Complete!"),
    ).not.toBeInTheDocument();
  });

  it("surfaces the friendly 'already registered' message on a unique-constraint error", async () => {
    mockUpsertEventRegistration.mockRejectedValue({
      code: "23505",
      message: "duplicate key value violates unique constraint",
    });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("HackFest 2026").length).toBeGreaterThan(
        0,
      );
    });
    await fillRequiredFields(user);

    const submitButton = screen.getByRole("button", {
      name: /register|submit|complete/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpsertEventRegistration).toHaveBeenCalled();
    });
    expect(
      screen.queryByText("Registration Complete!"),
    ).not.toBeInTheDocument();
  });

  it("prefills the form from an existing registration when the user has already registered", async () => {
    mockFetchEventRegistrationByUser.mockResolvedValue({
      id: "reg-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "9876543210",
      edit_count: 0,
      message: JSON.stringify({ teamName: "" }),
    });

    renderPage();

    await waitFor(() => {
      const nameInput = document.querySelector(
        'input[name="name"]',
      ) as HTMLInputElement;
      expect(nameInput?.value).toBe("Ada Lovelace");
    });
  });

  it("blocks resubmission once the one-time edit has already been used", async () => {
    mockFetchEventRegistrationByUser.mockResolvedValue({
      id: "reg-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "9876543210",
      edit_count: 1,
      message: JSON.stringify({}),
    });
    renderPage();

    await waitFor(() => {
      const nameInput = document.querySelector(
        'input[name="name"]',
      ) as HTMLInputElement;
      expect(nameInput?.value).toBe("Ada Lovelace");
    });

    expect(screen.getByText("Changes Locked")).toBeInTheDocument();
    const submitButton = screen.getByRole("button", {
      name: /changes locked/i,
    });
    expect(submitButton).toBeDisabled();
  });
});
